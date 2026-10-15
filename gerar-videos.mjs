// Gera vídeos desktop em Full HD (1920x1080, 10s) com scrollagem normal e fluida da página.
//
// Uso:
//   node gerar-videos.mjs --json clinicas-import.json --previews ./previews --out ./videos
//   node gerar-videos.mjs --json clinicas-import.json --camada A
//   node gerar-videos.mjs --json clinicas-import.json --only wg-dentista-parque-brasil
//   node gerar-videos.mjs --file ./previews/minha-clinica/index.html --out ./videos

import { chromium } from 'playwright';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
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

// ---------- Lista de trabalhos ----------
const jobs = [];
if (args.file) {
  const f = path.resolve(args.file);
  jobs.push({ name: path.basename(path.dirname(f)) || 'video', url: pathToFileURL(f).href });
} else if (args.json) {
  const data = JSON.parse(fs.readFileSync(args.json, 'utf8'));
  const only = args.only ? String(args.only).split(',') : null;
  for (const c of data) {
    if (c.PRONTA_PARA_GERAR && c.PRONTA_PARA_GERAR !== 'sim') continue;
    if (args.camada && c.CAMADA !== args.camada) continue;
    if (only && !only.includes(c.SLUG)) continue;
    let url;
    if (args.url) {
      url = `${String(args.url).replace(/\/$/, '')}/${c.SLUG}/`;
    } else {
      const f = path.resolve(args.previews || './previews', c.SLUG, 'index.html');
      if (!fs.existsSync(f)) continue; // prévia ainda não gerada
      url = pathToFileURL(f).href;
    }
    jobs.push({ name: c.SLUG, url });
  }
} else {
  console.log('Informe --json ou --file. Veja as instruções no topo do arquivo.');
  process.exit(1);
}

const todo = jobs.filter(j => args.force || !fs.existsSync(path.join(OUT, `${j.name}.mp4`)));
console.log(`${todo.length} vídeo(s) desktop para gerar (${jobs.length - todo.length} já existiam).`);

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
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const n = Math.max(1, Number(args.paralelo || 1));
let idx = 0, ok = 0, fail = 0;

async function worker() {
  while (idx < todo.length) {
    const job = todo[idx++];
    const t0 = Date.now();
    try {
      await render(browser, job);
      ok++;
      console.log(`✔ ${job.name} (${((Date.now() - t0) / 1000).toFixed(0)}s) [Desktop 1920x1080]`);
    } catch (e) {
      fail++;
      console.log(`✘ ${job.name}: ${e.message}`);
    }
  }
}

await Promise.all(Array.from({ length: n }, worker));
await browser.close();
console.log(`Pronto: ${ok} vídeo(s) desktop gerado(s), ${fail} com erro. Salvos em ${OUT}`);
