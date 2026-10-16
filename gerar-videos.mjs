// Gera vídeos desktop em Full HD (1920x1080, 10s) com scrollagem normal e fluida da página.
// Suporte a geração individual e EM LOTE (por quantidade, camada, ranking ou template).
//
// Exemplos de Uso em Lote:
//   npm run videos:lote10              -> Gera um lote de 10 vídeos pendentes
//   npm run videos:rapido              -> Gera lote de 10 com 2 vídeos em paralelo
//   npm run videos:top10               -> Gera todos os 10 da Camada A
//   node gerar-videos.mjs --limite 5   -> Gera lote de 5 vídeos pendentes
//   node gerar-videos.mjs --ranking 1-20 -> Gera lote dos rankings 1 ao 20
//   node gerar-videos.mjs --camada B --limite 15 -> Gera lote de 15 da Camada B
//   node gerar-videos.mjs --paralelo 2 -> Acelera processamento com 2 abas
//   node gerar-videos.mjs --dry-run    -> Lista quais vídeos serão gerados sem gravar
//   node gerar-videos.mjs --only slug  -> Gera apenas uma clínica específica

import { chromium } from 'playwright';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) {
      const val = arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true;
      acc.push([a.slice(2), val]);
    }
    return acc;
  }, [])
);

// Configuração Desktop Full HD 16:9
const FPS = 30;
const DUR = 10; // 10 segundos
const W = 1920;
const H = 1080;
const SCALE = 1;
const OUT = path.resolve(args.out || './videos');
fs.mkdirSync(OUT, { recursive: true });

// Sincroniza a lista de vídeos com o dashboard (index.html)
function syncVideosList() {
  try {
    const listFile = path.resolve('./js/videos-list.js');
    if (!fs.existsSync(path.dirname(listFile))) return;
    const existing = fs.readdirSync(OUT)
      .filter(f => f.endsWith('.mp4'))
      .map(f => f.replace(/\.mp4$/, ''))
      .sort();
    const jsContent = `// Gerado automaticamente pelo gerador de vídeos
// Total de vídeos prontos: ${existing.length}
// Atualizado em: ${new Date().toLocaleString('pt-BR')}
window.VIDEOS_GERADOS = ${JSON.stringify(existing, null, 2)};
`;
    fs.writeFileSync(listFile, jsContent, 'utf8');
  } catch (err) {
    // Ignora
  }
}

// Sincronização direta se solicitado
if (args['sync-only'] || args.sync) {
  syncVideosList();
  console.log('✔ Lista de vídeos em js/videos-list.js sincronizada com sucesso!');
  process.exit(0);
}

// Resolução dos arquivos base
const defaultJson = fs.existsSync('./clinicas-import.json') ? './clinicas-import.json' : null;
const jsonFile = args.json || defaultJson;

// ---------- Lista de trabalhos ----------
const jobs = [];
if (args.file) {
  const f = path.resolve(args.file);
  jobs.push({ name: path.basename(path.dirname(f)) || 'video', url: pathToFileURL(f).href });
} else if (jsonFile && fs.existsSync(jsonFile)) {
  const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  const only = args.only ? String(args.only).split(',').map(s => s.trim().toLowerCase()) : null;
  const targetCamada = args.camada || (args['camada-a'] && 'A') || (args['camada-b'] && 'B') || (args['camada-c'] && 'C');
  const targetTemplate = args.template ? String(args.template).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : null;

  for (const c of data) {
    if (!args.all && !args.todas && c.PRONTA_PARA_GERAR && c.PRONTA_PARA_GERAR !== 'sim') continue;

    if (targetCamada && String(c.CAMADA).toUpperCase() !== String(targetCamada).toUpperCase()) continue;

    if (targetTemplate) {
      const itemTemplate = String(c.TEMPLATE || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      if (!itemTemplate.includes(targetTemplate)) continue;
    }

    const rankingNum = Number(c.RANKING);
    if (args.de && rankingNum < Number(args.de)) continue;
    if (args.ate && rankingNum > Number(args.ate)) continue;
    if (args.ranking) {
      const rStr = String(args.ranking);
      if (rStr.includes('-')) {
        const [rMin, rMax] = rStr.split('-').map(Number);
        if (rankingNum < rMin || rankingNum > rMax) continue;
      } else {
        if (rankingNum !== Number(rStr)) continue;
      }
    }

    if (only) {
      const matchSlug = only.includes(c.SLUG.toLowerCase());
      const matchRanking = only.includes(String(c.RANKING));
      if (!matchSlug && !matchRanking) continue;
    }

    let url;
    if (args.url) {
      url = `${String(args.url).replace(/\/$/, '')}/${c.SLUG}/`;
    } else {
      const f = path.resolve(args.previews || './previews', c.SLUG, 'index.html');
      if (!fs.existsSync(f)) continue;
      url = pathToFileURL(f).href;
    }
    jobs.push({ name: c.SLUG, url, ranking: c.RANKING, camada: c.CAMADA, template: c.TEMPLATE, nome: c.NOME_CLINICA });
  }
} else {
  console.log('❌ Arquivo clinicas-import.json não encontrado. Informe --json <arquivo> ou --file <html-path>.');
  process.exit(1);
}

const allFilteredJobs = [...jobs];
let todo = jobs.filter(j => args.force || !fs.existsSync(path.join(OUT, `${j.name}.mp4`)));
const jaExistiam = allFilteredJobs.length - todo.length;

// Limite de lote (--limite N, --limit N, --qtd N)
const limit = Number(args.limite || args.limit || args.qtd || args.quantidade || 0);
if (limit > 0 && limit < todo.length) {
  todo = todo.slice(0, limit);
}

if (args['dry-run']) {
  console.log(`\n📋 SIMULAÇÃO DO LOTE (--dry-run):`);
  console.log(`Filtros aplicados encontraram ${allFilteredJobs.length} clínicas.`);
  console.log(`${jaExistiam} já possuem vídeo gerado.`);
  console.log(`${todo.length} vídeo(s) seriam gerados nesta execução:`);
  todo.forEach((j, i) => {
    console.log(`  ${String(i + 1).padStart(2, ' ')}. [#${j.ranking || '?'}] ${j.name} (${j.template || 'Template'}) - ${j.nome || ''}`);
  });
  console.log(`\nPara executar a gravação real, remova o argumento --dry-run.\n`);
  process.exit(0);
}

if (todo.length === 0) {
  console.log(`\n✨ Nada a fazer: todos os ${allFilteredJobs.length} vídeos já foram gerados na pasta ${OUT}!`);
  console.log(`Dica: use --force se desejar regravar algum vídeo existente.\n`);
  syncVideosList();
  process.exit(0);
}

const n = Math.max(1, Number(args.paralelo || args.concorrencia || 1));
const estSegundos = Math.ceil((todo.length * 35) / n);
const estMinutos = (estSegundos / 60).toFixed(1);

console.log(`============================================================`);
console.log(`🎬 GERADOR DE VÍDEOS DESKTOP EM LOTE (1920x1080 Full HD)`);
console.log(`============================================================`);
console.log(`Total a gravar neste lote: ${todo.length} vídeo(s)`);
console.log(`Vídeos já existentes:     ${jaExistiam} (pulados automaticamente)`);
console.log(`Processamento simultâneo: ${n} aba(s) em paralelo`);
console.log(`Tempo estimado:           ~${estMinutos} minuto(s) (${estSegundos}s)`);
console.log(`Destino:                  ${OUT}`);
console.log(`============================================================\n`);

// ---------- Cálculo da Scrollagem Normal e Suave ----------
function calculateScroll(t, maxScroll) {
  // 0s a 1.0s: Permanece no topo mostrando o Hero/Cabeçalho Desktop
  if (t <= 1.0) return 0;
  // 9.0s a 10.0s: Pausa suave no final / rodapé da página
  if (t >= 9.0) return maxScroll;

  // Entre 1.0s e 9.0s: Scrollagem fluida e contínua
  const progress = (t - 1.0) / 8.0;
  // Curva de aceleração e desaceleração suave (smoothstep)
  const eased = progress * progress * (3 - 2 * progress);
  return maxScroll * eased;
}

// ---------- Preparação e Pré-carregamento da Página ----------
async function preparePage(page) {
  return page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = 'auto';
    document.documentElement.style.overflowX = 'hidden';
    document.body.style.overflowX = 'hidden';

    // Rola a página para baixo e para cima para garantir que todas as imagens sejam carregadas
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    for (let y = 0; y <= maxScroll; y += 500) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 200));

    return { maxScroll };
  });
}

// ---------- Gravação do Vídeo ----------
async function render(browser, job) {
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: SCALE,
    isMobile: false,
    hasTouch: false
  });

  const page = await ctx.newPage();
  await page.goto(job.url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready);

  const { maxScroll } = await preparePage(page);
  const out = path.join(OUT, `${job.name}.mp4`);

  const ff = spawn(ffmpegPath, [
    '-y',
    '-loglevel', 'error',
    '-f', 'image2pipe',
    '-framerate', String(FPS),
    '-c:v', 'mjpeg',
    '-i', '-',
    '-vf', 'scale=1920:1080:flags=lanczos',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-crf', '18',
    '-preset', 'medium',
    '-movflags', '+faststart',
    out
  ]);

  const done = new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg falhou')))));

  const totalFrames = FPS * DUR; // 300 frames para 10 segundos
  for (let i = 0; i < totalFrames; i++) {
    const t = i / FPS;
    const y = calculateScroll(t, maxScroll);

    await page.evaluate((scrollPos) => {
      window.scrollTo(0, scrollPos);
    }, y);

    const buf = await page.screenshot({ type: 'jpeg', quality: 90 });
    if (!ff.stdin.write(buf)) {
      await new Promise(r => ff.stdin.once('drain', r));
    }
  }

  ff.stdin.end();
  await done;
  await ctx.close();
  return out;
}

// ---------- Execução ----------
// ---------- Execução ----------
const executablePath = process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);
const browser = await chromium.launch(executablePath ? { executablePath } : {});

let idx = 0, ok = 0, fail = 0;

async function worker(workerId) {
  while (idx < todo.length) {
    const currentNum = idx + 1;
    const job = todo[idx++];
    const prefix = `[${currentNum}/${todo.length}]`;
    const t0 = Date.now();
    console.log(`⏳ ${prefix} Iniciando: ${job.name} (Ranking #${job.ranking || '?'})...`);
    try {
      await render(browser, job);
      ok++;
      const dur = ((Date.now() - t0) / 1000).toFixed(0);
      console.log(`✔ ${prefix} Concluído: ${job.name} em ${dur}s [Desktop 1080p]`);
      syncVideosList();
    } catch (e) {
      fail++;
      console.error(`✘ ${prefix} Erro ao gravar ${job.name}: ${e.message}`);
    }
  }
}

await Promise.all(Array.from({ length: n }, (_, i) => worker(i + 1)));
await browser.close();

syncVideosList();
console.log(`\n============================================================`);
console.log(`🏁 LOTE FINALIZADO:`);
console.log(`   ✔ ${ok} vídeo(s) gravado(s) com sucesso`);
if (fail > 0) console.log(`   ✘ ${fail} com falha`);
console.log(`   📁 Pasta de destino: ${OUT}`);
console.log(`   🔄 Painel sincronizado em js/videos-list.js`);
console.log(`============================================================\n`);
