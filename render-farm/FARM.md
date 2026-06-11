# Render Farm — modo automático (PASSO 3)

Liga a **render farm distribuída** ao fluxo automático do Creative-Autopost, de forma
**transparente** pro backend. O backend continua falando só com o `short-server` (POST
`/api/v1/shorts`); quando o job é longo, o short-server fatia o timeline e distribui os
chunks nos nós `http-worker` do `nodes.json`, concatena e devolve o mesmo contrato de
status/`downloadUrl`. Jobs curtos seguem renderizando local como hoje.

## Arquitetura (quem chama quem)

```
backend (render_job.py)
   │  POST /api/v1/shorts {compositionId, props, scale?, concurrency?, compose?}
   ▼
short-server.mjs  (1 por máquina "frontal" — Eduardo/Contabo)
   │  selectComposition -> durationInFrames
   │  ┌── compose? → ffmpeg-overlay local (já rápido, NÃO usa farm)
   │  ├── frames ≤ FARM_MIN_FRAMES  ou  FARM_ENABLED=false → renderMedia LOCAL (igual hoje)
   │  └── frames > FARM_MIN_FRAMES  e  FARM_ENABLED=true  → farm.mjs
   ▼
farm.mjs (in-process no short-server)
   │  health-check nós → plano de chunks (≈450 frames) → tar.gz do bundle → upload/registro
   │  POST /api/v1/jobs {bundleId, compositionId, frameRange, inputProps, renderConcurrency}
   ▼
worker.mjs (1 por NÓ: contabo-main, easypanel-plataforma, easypanel-wordpress)
      renderMedia(frameRange, inputProps) → artifacts video+audio por chunk
   ▲
farm.mjs baixa os chunks → combineChunks → mp4 final → short-server serve em /video
```

O **short-server é também o coordenador**: não há processo separado. O `coordinator.mjs`
(CLI manual) continua existindo e intacto; `farm.mjs` é a refatoração reutilizável da mesma
lógica (chunk + dispatch + retry 3x + redistribuição de nó caído + combine).

## O que decide farm vs local

1. `props.render_opts.farm === true` → força farm.
2. `props.render_opts.farm === false` → força local.
3. senão: `FARM_ENABLED=true` **e** `durationInFrames > FARM_MIN_FRAMES` → farm.
4. **Falha do farm** (nenhum nó saudável, etc) → **fallback transparente** pro render local.

`FARM_ENABLED=false` (default) ⇒ comportamento **idêntico** ao atual.

## Os 3 nós (do nodes.json)

| id | workerUrl | cores | bundleTransfer | como sobe |
|----|-----------|-------|----------------|-----------|
| contabo-main | http://37.60.249.36:3201 | 8 (concurrency 6) | push | SSH-build (bootstrap automático) ou docker manual |
| easypanel-plataforma | https://plataforma-render-farm.klx2s6.easypanel.host | 4 | pull | serviço EasyPanel (já deployado) |
| easypanel-wordpress | https://wordpress-render-farm.jz9bd8.easypanel.host | 4 | pull | serviço EasyPanel (já deployado) |

`push` = o coordenador faz upload do tar.gz do bundle direto pro nó. `pull` = o coordenador
registra o bundle por URL e o nó **baixa** do nó push (EasyPanel atrás de domínio HTTPS, mais
robusto que receber upload grande).

## Envs novos

### No short-server (máquina frontal — Eduardo/Contabo onde o backend já aponta)
| env | default | o quê |
|-----|---------|-------|
| `FARM_ENABLED` | `false` | liga o modo farm |
| `FARM_MIN_FRAMES` | `3000` | só distribui acima disso (~100s @30fps) |
| `FARM_TOKEN` | (vazio) | segredo compartilhado com os workers (header `x-farm-token`) |
| `FARM_NODES_CONFIG` | `render-farm/nodes.json` | caminho do inventário de nós |
| `FARM_FRAMES_PER_CHUNK` | (vazio→450) | override do tamanho do chunk |

### Em cada worker (cada nó)
| env | default | o quê |
|-----|---------|-------|
| `FARM_TOKEN` | (vazio) | **mesmo** valor do short-server; se setado, exige o header em todas as rotas (menos `/health`) |
| `PORT` | `3001` | porta do worker |
| `WORKER_DATA_DIR` | `/data` | volume persistente (bundles/jobs temporários) |
| `WORKER_NAME` | hostname | rótulo nos logs |
| `WORKER_SLOTS` | `1` | jobs paralelos no nó |
| `WORKER_RENDER_CONCURRENCY` | `4` | cores por job |

> Os demais `WORKER_*` (retention/cleanup/capacity) já têm default no Dockerfile.

## Passo a passo de deploy

### Nó 1 — contabo-main (push, 8 cores)
Opção A (automática): o short-server bootstrapa via SSH na 1ª chamada **se** o short-server tiver
a chave `~/.ssh/contabo_eduardo` e `ssh`/`scp`/`tar` no PATH. (O bootstrap está no `coordinator.mjs`;
`farm.mjs` **não** bootstrapa — assume o worker já no ar.) Então suba o worker manualmente uma vez:

```bash
# no Contabo (root@37.60.249.36)
cd /root && git clone https://github.com/Folkz1/video-render.git render-farm-worker || (cd render-farm-worker && git pull)
cd render-farm-worker
docker build -t video-render-farm-worker:latest -f Dockerfile.render-farm-worker .
docker rm -f render-farm-worker 2>/dev/null || true
docker run -d --restart unless-stopped --name render-farm-worker \
  -p 3201:3001 -v /root/render-farm-data:/data \
  -e PORT=3001 -e WORKER_NAME=contabo-main \
  -e WORKER_SLOTS=1 -e WORKER_RENDER_CONCURRENCY=6 \
  -e FARM_TOKEN=COLE_O_TOKEN_AQUI \
  video-render-farm-worker:latest
curl -s http://37.60.249.36:3201/health   # deve responder JSON com limits/system
```

### Nós 2 e 3 — easypanel-plataforma / easypanel-wordpress (pull, 4 cores)
Já estão deployados como serviço `render-farm` em cada EasyPanel (Dockerfile inline apontando
pro repo público). Só falta **adicionar a env `FARM_TOKEN`** (mesmo valor) e redeploy:

- Plataforma: painel `http://72.60.243.4:3000`, projeto `plataforma`, serviço `render-farm`
- WordPress: painel `http://95.111.249.160:3000`, projeto `wordpress`, serviço `render-farm`

Adicione `FARM_TOKEN=...` em Environment, salve, **Deploy**. Valide:
```bash
curl -s https://plataforma-render-farm.klx2s6.easypanel.host/health
curl -s https://wordpress-render-farm.jz9bd8.easypanel.host/health
```

### Short-server (máquina frontal)
Adicione as envs (`FARM_ENABLED=true`, `FARM_TOKEN=...`, opcional `FARM_MIN_FRAMES`) e reinicie.
`FARM_NODES_CONFIG` só é preciso se o `nodes.json` não estiver em `render-farm/`.

## Testar 1 chunk manual (sem o short-server)

Com um bundle já num worker (`bundleId=demo`), submete 1 chunk direto:
```bash
TOKEN=COLE_O_TOKEN
BASE=http://37.60.249.36:3201
curl -s -X POST "$BASE/api/v1/jobs" -H "content-type: application/json" \
  -H "x-farm-token: $TOKEN" \
  -d '{"bundleId":"demo","compositionId":"ShortV2","chunkIndex":0,
       "frameRange":[0,89],"inputProps":{...},"renderConcurrency":4}'
# pega o id e faz polling:
curl -s "$BASE/api/v1/jobs/<id>" -H "x-farm-token: $TOKEN"
# baixa o artifact quando completed:
curl -s "$BASE/api/v1/jobs/<id>/video" -H "x-farm-token: $TOKEN" -o chunk0.mp4
```

## Validar com 1 render real (end-to-end)

1. Garanta os 3 nós com `/health` 200 e `FARM_TOKEN` igual em todos + short-server.
2. No short-server: `FARM_ENABLED=true`, `FARM_MIN_FRAMES=3000`.
3. Submeta um job longo pelo backend (formato Dossiê/LandscapeLong, ou um ShortV2 com
   `props.render_opts.farm=true` pra forçar). Acompanhe os logs do short-server:
   ```
   render <id> -> MODO FARM (frames=... > min=3000)
   [farm <id>] farm.plan chunks=N nodes=[contabo-main,easypanel-plataforma,easypanel-wordpress]
   [farm <id>] farm.bundle_upload ... / farm.bundle_register_by_url ...
   [farm <id>] farm.chunk_submit ... / farm.chunk_done chunk=K (K/N)
   [farm <id>] farm.combining chunks=N -> .../<id>.mp4
   done <id> (farm) -> ...
   ```
4. O backend recebe `status=completed` + `downloadUrl` **no mesmo contrato**. Prova =
   o `.mp4` final reproduzível (e o tempo de parede menor que o render local equivalente).

## Robustez

- **Nó offline antes do plano**: health-check exclui do plano (`farm.node_offline`).
- **Nó cai no meio do voo**: `farm.node_lost` → chunk redistribuído (conta como tentativa, max 3).
- **Chunk falha**: retry em outro nó (max 3) — depois disso o job inteiro falha e o short-server
  **não** faz fallback local (evita re-render de horas); o backend recebe `failed` com a causa.
- **Nenhum nó saudável**: `renderFarm` lança → short-server faz **fallback pro render local**.
