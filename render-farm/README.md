# Render Farm

This folder turns `video-5min` into a real distributed Remotion farm instead of a single remote render box.

## What changed

- `worker.mjs`: long-running HTTP worker that accepts a bundled project, renders frame ranges, and exposes chunk artifacts.
- `coordinator.mjs`: bundles the project once, uploads it to all healthy workers, shards the timeline, retries failed chunks, and joins the final video automatically.
- `validate-easypanel.mjs`: validates whether an EasyPanel `render` service is actually deployable.
- `deploy-easypanel.mjs`: configures an EasyPanel worker, can create the service if needed, supports GitHub/image/inline-Dockerfile sources, deploys it, and waits for `/health`.
- `nodes.json`: inventory of Contabo, EasyPanel nodes, and GitHub burst capacity.

## Capacity and retention policy

- Remote uploads are temporary. Workers keep bundle archives and extracted bundles only for a TTL and clean old jobs automatically.
- Default retention:
  - bundles: `2h`
  - job artifacts: `30min`
- Dispatch is capped to `60%` of the CPU and RAM that are free on each node at the moment of scheduling.
- Workers expose the safe runtime budget in `/health`, and the coordinator clamps `workerSlots` and `renderConcurrency` to that budget before submitting chunks.

## Why the previous setup failed

The old scripts only rendered a whole composition inside one remote container. That is outsourcing, not a farm.

The original EasyPanel `render` services were not usable as farm nodes because they had no valid source and no public ingress. The working path is to deploy a fresh `render-farm` app service per panel and expose `/health` through a domain.

## Usage

Start a worker locally:

```bash
npm run farm:worker
```

Render with the coordinator:

```bash
npm run farm:render -- --composition Video7-WhatsApp
```

Render only part of a composition:

```bash
npm run farm:render -- --composition Video1-NVIDIA --range 0-299 --frames-per-chunk 60
```

Validate an EasyPanel service:

```bash
set EASYPANEL_URL=http://95.111.249.160:3000
set EASYPANEL_PROJECT=wordpress
set EASYPANEL_SERVICE=render
set EASYPANEL_API_KEY=...
npm run farm:validate:easypanel
```

Deploy a worker into EasyPanel from the public GitHub repo:

```bash
set EASYPANEL_URL=http://95.111.249.160:3000
set EASYPANEL_PROJECT=wordpress
set EASYPANEL_SERVICE=render-farm
set EASYPANEL_API_KEY=...
set RENDER_FARM_CREATE_SERVICE=true
set RENDER_FARM_SOURCE=dockerfile-inline
set RENDER_FARM_DOMAIN_HOST=wordpress-render-farm.jz9bd8.easypanel.host
npm run farm:deploy:easypanel
```

Validated public worker URLs:

- `https://plataforma-render-farm.klx2s6.easypanel.host/health`
- `https://wordpress-render-farm.jz9bd8.easypanel.host/health`

Current caveat:

- `72.61.32.25` is still out of the farm because API auth for that EasyPanel was not available in Orquestra/workspace state.
