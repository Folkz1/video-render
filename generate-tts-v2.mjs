// Generate TTS for 3 videos using ElevenLabs - Carla Authority VSL (Brazilian Female)
import fs from 'fs';
import path from 'path';

const ROOT = import.meta.dirname;
const API_KEY = 'sk_30b96dee7776a3fc2ae33345b5063edec0a5cff737663e39';
const VOICE_ID = 'mPDAoQyGzxBSkE0OAOKw'; // Carla - Authority VSL (serious, brazilian)
const SPEED = 1.02; // 2% faster for engagement

// ============================================================
// VIDEO 1: NVIDIA $68B - IMPROVED (v2)
// ============================================================
const VIDEO1 = [
  {
    id: '01-hook',
    text: `Sessenta e oito bilhões de dólares. Em noventa dias. A NVIDIA acabou de quebrar todos os recordes vendendo chips pra inteligência artificial. E no mesmo mês, a Amazon mandou embora dezesseis mil pessoas. Isso não é coincidência. Isso é uma revolução. E se você não entender o que está acontecendo, vai ficar pra trás.`
  },
  {
    id: '02-problema',
    text: `O problema é simples: empresas estão gastando fortunas com processos manuais que a IA resolve em segundos. Seu concorrente já tem um agente respondendo clientes às três da manhã. E você? Ainda depende de um estagiário que esquece de responder no WhatsApp. Enquanto isso, leads esfriam e vendas se perdem.`
  },
  {
    id: '03-dados',
    text: `Os números são chocantes. O Gartner prevê que quarenta por cento dos aplicativos corporativos terão agentes de IA até o final de dois mil e vinte e seis. A McKinsey calcula três vírgula quatro trilhões de dólares em valor econômico gerado por agentes autônomos. Não é futuro. Já está acontecendo.`
  },
  {
    id: '04-solucao',
    text: `Um agente de IA não é chatbot. Chatbot espera pergunta. Agente age. Ele monitora seu WhatsApp, qualifica leads em cinco segundos, liga pro cliente com voz natural, agenda reuniões e ainda atualiza seu CRM. Funciona vinte e quatro horas. Sem férias. Sem reclamação. E custa menos que um salário mínimo por mês.`
  },
  {
    id: '05-como-funciona',
    text: `A stack que eu uso é absurdamente simples. N8N pra orquestrar os fluxos de trabalho. É open source, gratuito. ElevenLabs pra voz natural nas ligações telefônicas. WhatsApp Business API pra mensagens automáticas. E Claude, a IA da Anthropic, como cérebro do agente. Tudo isso por menos de duzentos reais por mês.`
  },
  {
    id: '06-prova',
    text: `Isso não é teoria. Eu implementei isso no Pacific Surf, na Dentaly e na Famiglia Gianni. São três empresas reais com agentes rodando em produção hoje. O agente da Pacific Surf qualifica leads de surf em cinco segundos e já aumentou a conversão em trinta e cinco por cento. Resultados reais. Clientes reais.`
  },
  {
    id: '07-resultados',
    text: `Olha os números: tempo de resposta caiu de duas horas pra cinco segundos. Conversão subiu trinta e cinco por cento. Custo operacional reduziu oitenta e oito por cento. E o dono da empresa? Parou de responder mensagem de madrugada. Isso é o poder de um agente bem implementado.`
  },
  {
    id: '08-oportunidade',
    text: `E aqui vai a parte que ninguém te conta. Empresas no Brasil estão desesperadas pra implementar agentes de IA. E não existe gente qualificada suficiente. Uma implementação custa entre cinco e quinze mil reais. E é recorrente. Todo mês tem evolução, manutenção, novos fluxos. É um mercado bilionário e vazio.`
  },
  {
    id: '09-cta-setup',
    text: `Eu sei que isso parece complexo. Mas eu já construí sete projetos de IA em produção. LicitaAI, Superbot, Orquestra, CRM Jurídico, Fiel IA. Tudo com N8N e Claude Code. E este vídeo que você está assistindo? Também foi criado inteiramente por IA. O roteiro, a voz, as animações. Tudo automatizado.`
  },
  {
    id: '10-cta-close',
    text: `Quer aprender a fazer isso? Eu abro cinco vagas por semana pra uma consultoria de uma hora por quinhentos reais. Nessa hora, eu monto seu plano personalizado, mostro a stack completa, e você sai com um roadmap pra implementar na sua empresa ou vender pra clientes. Uma consultoria dessas custa dois a cinco mil no mercado. Enquanto você hesita, seu concorrente já automatizou. Link na descrição. Manda CONSULTORIA no meu WhatsApp.`
  }
];

// ============================================================
// VIDEO 2: 7 PROJETOS COM IA EM 30 DIAS
// ============================================================
const VIDEO2 = [
  {
    id: '01-hook',
    text: `Em trinta dias eu criei sete projetos de software com inteligência artificial. Dois deles já faturam. Um atende clientes em Portugal. Outro monitora licitações do governo brasileiro. E o mais absurdo? Eu não escrevi noventa por cento do código. A IA escreveu pra mim. Deixa eu te mostrar.`
  },
  {
    id: '02-problema',
    text: `Todo mundo fala de IA, mas quase ninguém mostra projetos reais em produção. A maioria dos vídeos é teoria. Conceito. Prompt bonito. Eu cansei disso. Resolvi provar que dá pra criar software de verdade, que gera receita de verdade, usando IA como ferramenta principal de desenvolvimento.`
  },
  {
    id: '03-dados',
    text: `Projeto um: LicitaAI. Um SaaS que analisa licitações do governo com IA. Tem quase três mil licitações indexadas, mais de duas mil análises feitas, e um motor de vendas integrado. Clientes pagam entre dois mil e quinhentos e cinco mil reais por mês. Tá rodando em produção. Receita real.`
  },
  {
    id: '04-solucao',
    text: `Projeto dois e três: Superbot. Plataforma de agentes de voz com ElevenLabs. Três clientes ativos: Pacific Surf, Dentaly e Famiglia Gianni. Quinze agentes configurados, trinta e nove ferramentas integradas, quatro números Twilio. Tudo orquestrado pelo N8N com setenta e um workflows.`
  },
  {
    id: '05-como-funciona',
    text: `Projeto quatro: Orquestra. Meu hub pessoal de inteligência. Dashboard com Kanban, briefings diários automáticos, memória semântica com vetores, integração WhatsApp. Funciona como meu CTO virtual. Me avisa o que fazer, prioriza tarefas e sincroniza tudo entre os projetos.`
  },
  {
    id: '06-prova',
    text: `Projeto cinco: CRM Jurídico pro mercado português. Multi-tenant, Stripe integrado, painel de métricas. Projeto seis: Fiel IA, plataforma com assinaturas e RAG de vídeos do YouTube. Projeto sete: IssueMapper, que detecta erros em websites automaticamente via screenshots com Apify.`
  },
  {
    id: '07-resultados',
    text: `Sete projetos. Todos com frontend, backend, banco de dados e deploy em produção. A stack? Next.js, React, N8N, PostgreSQL, Claude Code e ElevenLabs. O Claude Code foi meu programador principal. Eu descrevi o que queria. Ele implementou. Eu revisei e ajustei. Velocidade absurda.`
  },
  {
    id: '08-oportunidade',
    text: `E sabe o que é mais louco? Este vídeo que você tá assistindo agora também foi criado por IA. O roteiro foi escrito pelo Claude. A voz é gerada pelo ElevenLabs. As animações são renderizadas pelo Remotion. As gravações de tela foram feitas pelo Playwright. Custo total? Menos de dois reais.`
  },
  {
    id: '09-cta-setup',
    text: `Eu não tô te vendendo curso. Eu tô te mostrando resultados. Sete projetos em produção, clientes pagando, receita entrando. E a mesma stack que eu uso, qualquer desenvolvedor pode aprender em uma semana. Você só precisa de alguém que já fez pra te mostrar o caminho.`
  },
  {
    id: '10-cta-close',
    text: `Por isso eu abro cinco vagas por semana pra consultoria individual. Uma hora, quinhentos reais. Nessa hora você vai ver ao vivo como eu crio projetos com IA, a stack completa, e sai com um plano pro seu primeiro projeto. Se em uma hora você não sair com um plano claro, eu devolvo seu dinheiro. Sem risco. Link do WhatsApp na descrição. Manda a palavra PROJETOS.`
  }
];

// ============================================================
// VIDEO 3: COMO A IA CRIOU ESTE VIDEO
// ============================================================
const VIDEO3 = [
  {
    id: '01-hook',
    text: `Este vídeo foi inteiramente criado por inteligência artificial. A voz que você está ouvindo agora não é humana. As animações foram geradas por código. As gravações de tela são automáticas. O roteiro foi escrito por IA. E custou menos de dois reais pra produzir. Quer saber como? Fica até o final.`
  },
  {
    id: '02-problema',
    text: `Criar vídeo pro YouTube é um inferno. Você gasta horas escrevendo roteiro, gravando, editando, renderizando. A maioria dos criadores leva uma semana pra lançar um vídeo de dez minutos. E se eu te disser que dá pra automatizar noventa por cento desse processo com ferramentas que já existem?`
  },
  {
    id: '03-dados',
    text: `O pipeline funciona assim: primeiro, o Claude escreve o roteiro completo em dez segmentos. Cada segmento tem vinte e cinco segundos de narração, otimizado pra manter atenção. Depois, o ElevenLabs gera a voz em português brasileiro, com sotaque natural e entonação real. Tudo via API.`
  },
  {
    id: '04-solucao',
    text: `Pras telas do vídeo, eu uso o Playwright. Ele abre um navegador automatizado, navega em sites reais como N8N e ElevenLabs, e grava tudo em vídeo. Mas o truque secreto são as telas customizadas. Eu crio dashboards animados em HTML e CSS e o Playwright grava como se fosse um site real.`
  },
  {
    id: '05-como-funciona',
    text: `A composição final usa Remotion. É um framework que renderiza vídeo usando React. Sim, React. Cada cena é um componente. Eu sincronizo áudio com vídeo, adiciono efeitos de fade, badges animados, gráficos com dados, e renderizo tudo em Full HD. Oito mil e quatrocentos frames em uma chamada.`
  },
  {
    id: '06-prova',
    text: `O custo de produção é ridículo. A voz no ElevenLabs custa centavos por segmento. O Remotion é open source. O Playwright é gratuito. O Claude Code faz toda a orquestração. Total por vídeo: menos de dois reais. Compare com pagar um editor que cobra mil reais por vídeo de cinco minutos.`
  },
  {
    id: '07-resultados',
    text: `Eu já produzi mais de dez vídeos com esse sistema. Shorts verticais de quarenta e cinco segundos e vídeos longos de cinco minutos como este. O mesmo pipeline gera os dois formatos. Mudo a resolução, ajusto o roteiro, e renderizo. Uma fábrica de conteúdo automatizada.`
  },
  {
    id: '08-oportunidade',
    text: `E não é só pra YouTube. Empresas precisam de vídeos institucionais, treinamentos internos, apresentações comerciais. Imagina oferecer produção de vídeo automatizada por IA pro mercado corporativo. Mil reais por vídeo quando seu custo é dois reais. Margem de noventa e nove por cento.`
  },
  {
    id: '09-cta-setup',
    text: `A stack completa é: Claude Code pra roteiro e orquestração, ElevenLabs pra voz, Playwright pra gravações de tela, Remotion pra composição e renderização. Tudo em JavaScript e Python. Qualquer dev consegue montar esse pipeline em uma semana com a orientação certa.`
  },
  {
    id: '10-cta-close',
    text: `E eu ensino tudo isso numa consultoria de uma hora. Quinhentos reais. Você vê ao vivo como eu crio vídeos com IA, monto seu pipeline personalizado, e sai produzindo conteúdo no mesmo dia. Cinco vagas por semana. Se não valer a pena, devolvo o dinheiro. Manda VIDEO no meu WhatsApp. Link na descrição.`
  }
];

const VIDEO11 = [
  {
    id: '01-hook',
    text: `Três semanas. Foi exatamente esse o tempo que levou para mudar absolutamente tudo na minha operação. Eu deixei de ser um desenvolvedor que fazia tudo manualmente para me tornar um operador de sistemas com inteligência artificial.`
  },
  {
    id: '02-problema',
    text: `Antes eu trabalhava quatorze horas por dia e mal conseguia manter dois projetos de pé. A conta não fechava. Se eu vendia mais, eu não conseguia entregar. Se eu focava na entrega, eu parava de vender. O gargalo da empresa era a minha própria energia.`
  },
  {
    id: '03-solucao',
    text: `A solução foi tirar a mão da massa e colocar a cabeça para orquestrar. Hoje, quem escreve código, revisa deploy e monitora servidores é o Claude Code. Ele atua como meu CTO virtual. Eu só direciono, aprovo e acompanho as métricas.`
  },
  {
    id: '04-prova',
    text: `Olha a diferença na prática. Hoje eu gerencio sete projetos simultâneos. Projetos reais como LicitaAí, Superbot e Orquestra. Meu custo com o Claude? Cento e dez reais por mês. A receita que esses projetos geram? Mais de dezoito mil mensais.`
  },
  {
    id: '05-cta',
    text: `Se você quer abandonar o trabalho braçal e aprender a operar o seu negócio com IA, eu te ensino como. Abri horários na minha consultoria de diagnóstico por quinhentos reais. O link está na descrição. Mas seja rápido, porque o mercado não espera.`
  }
];

const ALL_VIDEOS = [
  { name: 'video1', dir: 'audio-v2', segments: VIDEO1 },
  { name: 'video2', dir: 'audio-v2-projetos', segments: VIDEO2 },
  { name: 'video3', dir: 'audio-v2-meta', segments: VIDEO3 },
  { name: 'video11', dir: 'audio-v11-virada', segments: VIDEO11 },
];

async function generateTTS(segment, audioDir) {
  const outPath = path.join(audioDir, `${segment.id}.mp3`);

  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 5000) {
    console.log(`  [SKIP] ${segment.id} already exists`);
    return;
  }

  console.log(`  [TTS] ${segment.id}: "${segment.text.substring(0, 50)}..."`);

  const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: {
      'xi-api-key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: segment.text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.80,
        style: 0.50,
        use_speaker_boost: true,
        speed: SPEED
      }
    })
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`ElevenLabs error ${resp.status}: ${errText}`);
  }

  const buffer = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(outPath, buffer);

  const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
  const durationSec = ((buffer.length * 8) / 128000).toFixed(1);
  console.log(`  [DONE] ${segment.id}: ${sizeMB}MB (~${durationSec}s)`);
}

async function main() {
  const videoArg = process.argv[2]; // 'video1', 'video2', 'video3', or 'all'
  const targets = videoArg && videoArg !== 'all'
    ? ALL_VIDEOS.filter(v => v.name === videoArg)
    : ALL_VIDEOS;

  if (targets.length === 0) {
    console.error('Usage: node generate-tts-v2.mjs [video1|video2|video3|all]');
    process.exit(1);
  }

  for (const video of targets) {
    const audioDir = path.join(ROOT, 'public', video.dir);
    fs.mkdirSync(audioDir, { recursive: true });

    console.log(`\n=== ${video.name.toUpperCase()} (${video.segments.length} segments) ===`);
    console.log(`Voice: Carla - Authority VSL | Speed: ${SPEED}`);
    console.log(`Output: ${audioDir}\n`);

    for (const seg of video.segments) {
      await generateTTS(seg, audioDir);
      await new Promise(r => setTimeout(r, 800));
    }

    // Summary
    let totalDuration = 0;
    for (const f of fs.readdirSync(audioDir).filter(f => f.endsWith('.mp3')).sort()) {
      const size = fs.statSync(path.join(audioDir, f)).size;
      const dur = (size * 8) / 128000;
      totalDuration += dur;
    }
    console.log(`\n  ${video.name} total: ~${totalDuration.toFixed(0)}s (${(totalDuration/60).toFixed(1)}min)`);
  }

  console.log('\n=== ALL TTS COMPLETE ===');
}

main().catch(console.error);
