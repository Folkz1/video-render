// Generate TTS segments for 5-min video using ElevenLabs
import fs from 'fs';
import path from 'path';

const ROOT = import.meta.dirname;
const AUDIO_DIR = path.join(ROOT, 'public', 'audio');
fs.mkdirSync(AUDIO_DIR, { recursive: true });

const API_KEY = 'sk_30b96dee7776a3fc2ae33345b5063edec0a5cff737663e39';
const VOICE_ID = 'CstacWqMhJQlnfLPxRG4'; // Will - Deep

const segments = [
  {
    id: '01-hook',
    text: `Sessenta e oito bilhões de dólares. Em UM trimestre. É isso que a NVIDIA faturou vendendo chips pra treinar inteligências artificiais. E enquanto a NVIDIA batia recorde atrás de recorde, a Amazon demitiu dezesseis mil funcionários. Isso não é coincidência. E nesse vídeo eu vou te mostrar o que está acontecendo e como você pode lucrar com isso.`
  },
  {
    id: '02-contexto',
    text: `O que está acontecendo no mercado de IA em dois mil e vinte e seis é brutal. As empresas perceberam que não adianta ter chatbot que só responde pergunta. O que funciona de verdade são agentes autônomos. Agentes que tomam ação. Que ligam pro cliente, qualificam o lead, agendam reunião e te avisam no WhatsApp.`
  },
  {
    id: '03-dados',
    text: `O Gartner prevê que quarenta por cento dos aplicativos corporativos vão ter agentes de IA até o final de dois mil e vinte e seis. A McKinsey estima que agentes autônomos podem gerar até três vírgula quatro trilhões de dólares em valor econômico. E a NVIDIA confirmou isso investindo pesado em infraestrutura de agentes.`
  },
  {
    id: '04-diferenca',
    text: `Mas qual a diferença entre um chatbot e um agente de IA? Chatbot espera você perguntar algo. É reativo. Agente é proativo. Ele monitora, analisa, decide e executa. Imagina um vendedor que nunca dorme, nunca reclama, responde em cinco segundos, e sabe tudo sobre seu produto. Isso é um agente.`
  },
  {
    id: '05-como-funciona',
    text: `Eu construo esses agentes pros meus clientes. A stack é simples: N8N pra orquestrar os fluxos, ElevenLabs pra voz natural em ligações, WhatsApp Business API pra mensagens, e um banco de dados pra memória. Um dos meus clientes atendia cinquenta leads por dia na mão. O agente agora qualifica em cinco segundos e avisa o vendedor só quando o lead tá quente.`
  },
  {
    id: '06-resultados',
    text: `O resultado? Tempo de resposta caiu de duas horas pra cinco segundos. Taxa de conversão subiu trinta e cinco por cento. E o dono da empresa parou de trabalhar de madrugada respondendo mensagem. Isso não é teoria. É resultado real de implementação que eu faço toda semana.`
  },
  {
    id: '07-oportunidade',
    text: `E aqui tá a oportunidade. Empresas no Brasil estão desesperadas pra implementar isso. Uma implementação de agente custa entre cinco e quinze mil reais. E é recorrente, porque precisa de manutenção e evolução todo mês. Se você é dev, freelancer ou tem uma agência, esse é o mercado mais quente de dois mil e vinte e seis.`
  },
  {
    id: '08-cta',
    text: `Se você quer um agente desse na sua empresa, ou quer aprender a construir pra clientes, manda a palavra AGENTE no meu WhatsApp. Link tá na descrição. E se inscreve no canal, porque toda semana tem conteúdo novo sobre IA e automação que gera dinheiro de verdade.`
  }
];

async function generateTTS(segment) {
  const outPath = path.join(AUDIO_DIR, `${segment.id}.mp3`);

  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 5000) {
    console.log(`[SKIP] ${segment.id} already exists`);
    return;
  }

  console.log(`[TTS] ${segment.id}: "${segment.text.substring(0, 60)}..."`);

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
        stability: 0.48,
        similarity_boost: 0.82,
        style: 0.45,
        use_speaker_boost: true
      }
    })
  });

  if (!resp.ok) {
    throw new Error(`ElevenLabs error ${resp.status}: ${await resp.text()}`);
  }

  const buffer = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(outPath, buffer);

  const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
  const durationSec = ((buffer.length * 8) / 128000).toFixed(1);
  console.log(`[DONE] ${segment.id}: ${sizeMB}MB (~${durationSec}s)`);
}

async function main() {
  console.log('=== TTS GENERATOR ===');
  console.log(`Generating ${segments.length} segments\n`);

  for (const seg of segments) {
    await generateTTS(seg);
    // Small delay between requests
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n=== ALL TTS COMPLETE ===');
  let totalDuration = 0;
  for (const f of fs.readdirSync(AUDIO_DIR).filter(f => f.endsWith('.mp3')).sort()) {
    const size = fs.statSync(path.join(AUDIO_DIR, f)).size;
    const dur = (size * 8) / 128000;
    totalDuration += dur;
    console.log(`  ${f} (${(size/1024/1024).toFixed(2)}MB, ~${dur.toFixed(1)}s)`);
  }
  console.log(`\n  Total estimated: ~${totalDuration.toFixed(0)}s (${(totalDuration/60).toFixed(1)}min)`);
}

main().catch(console.error);
