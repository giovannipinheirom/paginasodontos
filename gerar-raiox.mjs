// Vídeo "Raio-x" de 20 s para o WhatsApp (720p, H.264, sem áudio, abaixo de 10 MB).
//
//   0–5 s   Hoje                    print do Google Maps (prints/<id>.png) com zoom lento
//   5–17 s  Como poderia aparecer   prévia Moderno rolando do topo até a chamada final (quase a página toda)
//   17–20 s O clique                cursor vai ao botão da chamada final, clica e fecha com um cartão
//
// Uso:
//   npm run raiox                              -> todas as clínicas com print e sem vídeo Raio-x
//   node gerar-raiox.mjs --only slug-1,slug-2  -> só essas clínicas (regrava se já existir)
//   node gerar-raiox.mjs --vertical            -> gera também a versão 9:16 (<id>-raiox-vertical.mp4)
//   node gerar-raiox.mjs --force               -> regrava vídeos já existentes
//   node gerar-raiox.mjs --dry-run             -> só lista o que seria gerado
// Opções de pasta: --prints <pasta> (padrão ./prints), --previews <pasta> (padrão ./previews), --out <pasta> (padrão ./videos)
import { chromium } from 'playwright';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { syncVideosList } from './videos-sync.mjs';

// Carrega configuração central de nichos
import './nichos.config.js';
const { NICHOS_CONFIG, getNicho } = globalThis;

const FPS = 30;
const DUR = 20;
const T_PRINT = 5;    // fim da cena "Hoje"
const T_PREVIA = 17;  // fim da cena "Como poderia aparecer"
const FADE = 0.35;    // duração do escurecimento entre cenas (s)
const MAX_BYTES = 9.5 * 1024 * 1024;

const FORMATOS = {
  paisagem: { sufixo: '-raiox', viewport: { width: 1280, height: 720 }, dsf: 1, mobile: false },
  vertical: { sufixo: '-raiox-vertical', viewport: { width: 360, height: 640 }, dsf: 2, mobile: true }
};

// ---------- Argumentos ----------
const raw = process.argv.slice(2);
const args = {};
for (let i = 0; i < raw.length; i++) {
  if (!raw[i].startsWith('--')) continue;
  const key = raw[i].slice(2);
  const next = raw[i + 1];
  if (next && !next.startsWith('--')) { args[key] = next; i++; } else { args[key] = true; }
}

const PRINTS = path.resolve(args.prints || './prints');
const PREVIEWS = path.resolve(args.previews || './previews');
const OUT = path.resolve(args.out || './videos');
fs.mkdirSync(OUT, { recursive: true });

// Carrega bases dos nichos
const clinicas = JSON.parse(fs.readFileSync('./clinicas-import.json', 'utf8'));
clinicas.forEach(c => { c._nicho = 'odonto'; });

let escolas = [];
if (fs.existsSync('./escolas-import.json')) {
  try {
    escolas = JSON.parse(fs.readFileSync('./escolas-import.json', 'utf8'));
    escolas.forEach(e => { e._nicho = 'idiomas'; });
  } catch (err) {
    escolas = [];
  }
}

const baseCompleta = [...clinicas, ...escolas];
const formatos = args.vertical ? [FORMATOS.paisagem, FORMATOS.vertical] : [FORMATOS.paisagem];

function acharPrint(slug) {
  for (const ext of ['.png', '.jpg', '.jpeg', '.webp']) {
    const f = path.join(PRINTS, slug + ext);
    if (fs.existsSync(f)) return f;
  }
  return null;
}

// ---------- Seleção do lote ----------
let alvo = args.nicho === 'idiomas'
  ? escolas
  : args.nicho === 'odonto'
    ? clinicas
    : baseCompleta;

if (args.only) {
  const ids = String(args.only).split(',').map(s => s.trim()).filter(Boolean);
  alvo = ids.map(id => baseCompleta.find(c => c.SLUG === id || String(c.RANKING) === id) || { SLUG: id, _naoEncontrada: true });
}
const force = Boolean(args.force || args.only);

const faltamPrints = [];
const faltamPrevias = [];
const jaFeitos = [];
const jobs = [];
for (const c of alvo) {
  if (c._naoEncontrada) { console.error(`❌ Registro não encontrado: ${c.SLUG}`); continue; }
  const print = acharPrint(c.SLUG);
  if (!print) { faltamPrints.push(c.SLUG); continue; }
  const previa = path.join(PREVIEWS, c.SLUG, 'index.html');
  if (!fs.existsSync(previa)) { faltamPrevias.push(c.SLUG); continue; }
  if (!force && fs.existsSync(path.join(OUT, `${c.SLUG}-raiox.mp4`))) { jaFeitos.push(c.SLUG); continue; }
  jobs.push({ clinic: c, print, previa });
}

function relatorioFinal() {
  if (faltamPrevias.length) console.log(`⚠️  Faltam prévias (rode node gerar-previa.js <id>): ${faltamPrevias.join(', ')}`);
  if (faltamPrints.length) {
    const lista = path.join(OUT, 'faltam-prints.txt');
    fs.writeFileSync(lista, faltamPrints.join('\n') + '\n', 'utf8');
    const amostra = faltamPrints.slice(0, 15).join(', ');
    console.log(`📸 Faltam prints (${faltamPrints.length}): ${amostra}${faltamPrints.length > 15 ? ', …' : ''}`);
    console.log(`   Lista completa em ${lista}`);
  }
}

console.log(`🎬 Raio-x: ${jobs.length} vídeo(s) a gerar · ${jaFeitos.length} já existiam · prints em ${PRINTS}`);
if (args['dry-run']) {
  jobs.forEach((j, i) => console.log(`  ${i + 1}. ${j.clinic.SLUG}`));
  relatorioFinal();
  process.exit(0);
}
if (jobs.length === 0) { relatorioFinal(); process.exit(0); }

// ---------- Utilidades ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = p => p * p * (3 - 2 * p);
const easeOut = p => 1 - Math.pow(1 - p, 3);

// Opacidade da cortina preta: escurece entre o print e a prévia (a cena do clique continua a rolagem, sem corte)
function cortina(t) {
  const bordas = [0, T_PRINT, DUR];
  let o = 0;
  for (const b of bordas) {
    const d = Math.abs(t - b);
    if (d < FADE) o = Math.max(o, 1 - d / FADE);
  }
  return o;
}

// Estilo das etiquetas (cores da marca Giovanni Pinheiro: #0E1A16 e #5EC2B5)
const OVERLAY_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&display=swap');
  #rx-label { position: fixed; z-index: 2147483646; bottom: 4.5vmin; left: 4.5vmin; display: flex; align-items: center; gap: 1.6vmin;
    padding: 1.6vmin 3vmin 1.6vmin 2.2vmin; border-radius: 999px; background: rgba(14,26,22,.92); color: #fff;
    font: 700 3.4vmin/1 Manrope, sans-serif; letter-spacing: .01em; box-shadow: 0 1vmin 4vmin rgba(0,0,0,.45);
    border: .25vmin solid rgba(94,194,181,.55); transition: none; }
  #rx-label i { width: 1.8vmin; height: 1.8vmin; border-radius: 50%; background: #5EC2B5; box-shadow: 0 0 0 .8vmin rgba(94,194,181,.25); }
  @media (max-width: 640px) { #rx-label { bottom: 96px; } }
  #rx-curtain { position: fixed; inset: 0; z-index: 2147483647; background: #000; pointer-events: none; opacity: 0; }
  #rx-cursor { position: fixed; z-index: 2147483645; width: 5.2vmin; height: 5.2vmin; left: 0; top: 0; pointer-events: none;
    filter: drop-shadow(0 .6vmin 1vmin rgba(0,0,0,.5)); display: none; }
  #rx-ripple { position: fixed; z-index: 2147483644; width: 10vmin; height: 10vmin; margin: -5vmin 0 0 -5vmin; border-radius: 50%;
    border: .5vmin solid #5EC2B5; opacity: 0; pointer-events: none; }
  #rx-card { position: fixed; inset: 0; z-index: 2147483643; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 3vmin; background: radial-gradient(circle at 50% 40%, #16302a 0%, #0E1A16 65%); color: #fff; opacity: 0; text-align: center; padding: 6vmin; }
  #rx-card .ic { width: 15vmin; height: 15vmin; border-radius: 50%; background: #5EC2B5; display: grid; place-items: center; color: #0E1A16; }
  #rx-card .ic svg { width: 8vmin; height: 8vmin; }
  #rx-card h2 { font: 800 6vmin/1.15 Manrope, sans-serif; max-width: 90%; }
  #rx-card p { font: 500 3.2vmin/1.4 Manrope, sans-serif; color: #a9d9d2; }
`;

const CURSOR_SVG = `<svg viewBox="0 0 24 24"><path d="M4 2l15 11.5-6.6 1 3.9 7.6-2.8 1.4-3.9-7.7L4 20z" fill="#fff" stroke="#111" stroke-width="1.2" stroke-linejoin="round"/></svg>`;

async function instalarOverlay(page, texto) {
  await page.evaluate(({ css, texto, cursor }) => {
    const st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
    const add = (id, html = '') => { const d = document.createElement('div'); d.id = id; d.innerHTML = html; document.body.appendChild(d); return d; };
    add('rx-label', `<i></i><span>${texto}</span>`);
    add('rx-cursor', cursor);
    add('rx-ripple');
    add('rx-card');
    add('rx-curtain');
  }, { css: OVERLAY_CSS, texto, cursor: CURSOR_SVG });
}

// ---------- Cena 1: print do Google ----------
async function prepararCenaPrint(ctx, printPath, nichoId = 'odonto') {
  const page = await ctx.newPage();
  const ext = path.extname(printPath).slice(1).replace('jpg', 'jpeg');
  const dataUrl = `data:image/${ext};base64,${fs.readFileSync(printPath).toString('base64')}`;
  const nCfg = getNicho(nichoId);
  const legenda = nCfg.legendaGoogleHoje || 'Como aparece hoje no Google';

  await page.setContent(`<!doctype html><html><head><style>
    html,body{margin:0;height:100%;overflow:hidden;background:#0E1A16}
    .bg{position:fixed;inset:-5%;background:url('${dataUrl}') center/cover;filter:blur(40px) brightness(.45)}
    .shot{position:fixed;inset:0;display:flex;align-items:center;justify-content:center}
    .shot img{max-width:88%;max-height:80%;border-radius:1.6vmin;box-shadow:0 3vmin 8vmin rgba(0,0,0,.55);transform-origin:50% 40%}
    .cap{position:fixed;left:0;right:0;top:4.5vmin;text-align:center;color:#d8eeea;font:600 3vmin/1.3 Manrope,sans-serif}
  </style></head><body><div class="bg"></div><div class="shot"><img id="shot" src="${dataUrl}"></div>
  <div class="cap">${legenda}</div></body></html>`);
  await instalarOverlay(page, 'Hoje');
  await page.evaluate(() => document.fonts && document.fonts.ready);
  return page;
}

// ---------- Cenas 2 e 3: prévia ----------
async function prepararCenaPrevia(ctx, previaPath) {
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(previaPath).href, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready);
  const info = await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = 'auto';
    document.querySelectorAll('.reveal-on-scroll').forEach(el => el.classList.add('reveal-active'));
    document.querySelectorAll('.hx-reveal').forEach(el => el.classList.add('hx-in'));
    // Carrega as imagens rolando a página uma vez
    const max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    for (let y = 0; y <= max; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); }
    scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 200));
    // Rola até centralizar a chamada final, onde acontece o clique
    const cta = document.querySelector('[data-video="cta"]');
    const r = cta ? cta.getBoundingClientRect() : null;
    const fim = r ? Math.min(max, r.top + scrollY + r.height / 2 - innerHeight / 2) : max * 0.92;
    const btn = document.querySelector('[data-video="cta"] a') || document.querySelector('[data-video="whatsapp"]');
    if (btn) btn.setAttribute('data-raiox-alvo', '');
    const href = btn ? btn.getAttribute('href') : '';
    return { fim: Math.max(0, fim), href };
  });
  info.canal = info.href.startsWith('https://wa.me/') ? 'whatsapp' : info.href.startsWith('tel:') ? 'telefone' : 'google';
  await instalarOverlay(page, 'Como poderia aparecer');
  return { page, info };
}

function obterCartao(canal, nichoId = 'odonto') {
  const nCfg = getNicho(nichoId);
  const isIdiomas = nCfg.id === 'idiomas';

  if (canal === 'whatsapp') {
    return {
      titulo: isIdiomas ? 'Um clique para o WhatsApp da escola' : 'Um clique para o WhatsApp da recepção',
      sub: isIdiomas ? 'Do Google direto para a conversa com a escola' : 'Do Google direto para a conversa com a clínica',
      icone: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c.969.54 1.802.833 2.806.833 3.181 0 5.767-2.586 5.768-5.766.001-3.18-2.585-5.766-5.768-5.766zm9.969 5.766c0 5.503-4.469 9.972-9.972 9.972-1.748 0-3.39-.452-4.819-1.246l-5.209 1.368 1.391-5.076c-.886-1.488-1.395-3.23-1.395-5.093 0-5.503 4.469-9.972 9.972-9.972 5.503 0 10.032 4.494 10.032 10.047z"/></svg>'
    };
  }
  if (canal === 'telefone') {
    return {
      titulo: isIdiomas ? 'Um clique para ligar para a escola' : 'Um clique para ligar para a recepção',
      sub: isIdiomas ? 'Do Google direto para o telefone da escola' : 'Do Google direto para o telefone da clínica',
      icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>'
    };
  }
  return {
    titulo: isIdiomas ? 'Um clique para o contato da escola' : 'Um clique para o contato da clínica',
    sub: 'Perfil no Google e página própria conectados',
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>'
  };
}

// ---------- Gravação ----------
function abrirFfmpeg(out, crf) {
  const ff = spawn(ffmpegPath, [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.0',
    '-crf', String(crf), '-preset', 'slow', '-movflags', '+faststart', '-an',
    out
  ]);
  let err = '';
  ff.stderr.on('data', d => { err += d; });
  const done = new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error(`ffmpeg falhou (${c}): ${err}`)))));
  return { ff, done };
}

// Reencoda um arquivo pronto com CRF maior quando passa do limite do WhatsApp
function reencodar(src, dst, crf) {
  return new Promise((res, rej) => {
    const ff = spawn(ffmpegPath, ['-y', '-loglevel', 'error', '-i', src, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', String(crf), '-preset', 'slow', '-movflags', '+faststart', '-an', dst]);
    ff.on('close', c => (c === 0 ? res() : rej(new Error(`ffmpeg falhou ao reencodar (${c})`))));
  });
}

async function gravar(browser, job, fmt) {
  const nichoId = job.clinic._nicho || job.clinic.NICHO || 'odonto';
  const ctx = await browser.newContext({ viewport: fmt.viewport, deviceScaleFactor: fmt.dsf, isMobile: fmt.mobile, hasTouch: fmt.mobile });
  const cenaPrint = await prepararCenaPrint(ctx, job.print, nichoId);
  const { page: cenaPrevia, info } = await prepararCenaPrevia(ctx, job.previa);
  const cartao = obterCartao(info.canal, nichoId);
  await cenaPrevia.evaluate(c => {
    document.getElementById('rx-card').innerHTML = `<div class="ic">${c.icone}</div><h2>${c.titulo}</h2><p>${c.sub}</p>`;
  }, cartao);

  const out = path.join(OUT, `${job.clinic.SLUG}${fmt.sufixo}.mp4`);
  const { ff, done } = abrirFfmpeg(out, 24);
  const W = fmt.viewport.width, H = fmt.viewport.height;
  let alvoBtn = null;

  for (let i = 0; i < FPS * DUR; i++) {
    const t = i / FPS;
    const fade = cortina(t);
    let page;

    if (t < T_PRINT) {
      page = cenaPrint;
      const z = 1 + 0.08 * ease(t / T_PRINT);
      await page.evaluate(({ z, fade }) => {
        document.getElementById('shot').style.transform = `scale(${z})`;
        document.getElementById('rx-curtain').style.opacity = fade;
      }, { z, fade });
    } else if (t < T_PREVIA) {
      page = cenaPrevia;
      // pausa de 0,8 s no topo, rolagem suave e pausa de 0,5 s na chamada final
      const p = ease(clamp((t - T_PRINT - 0.8) / (T_PREVIA - T_PRINT - 1.3)));
      await page.evaluate(({ y, fade }) => {
        scrollTo(0, y);
        document.getElementById('rx-curtain').style.opacity = fade;
      }, { y: info.fim * p, fade });
    } else {
      page = cenaPrevia;
      if (!alvoBtn) {
        alvoBtn = await page.evaluate(() => {
          document.querySelector('#rx-label span').textContent = 'O clique';
          const b = document.querySelector('[data-raiox-alvo]');
          let r = b.getBoundingClientRect();
          // Garante o botão visível (no celular a chamada final pode ser mais alta que a tela)
          if (r.top < 0 || r.bottom > innerHeight * 0.85) {
            scrollBy(0, r.top + r.height / 2 - innerHeight * 0.5);
            r = b.getBoundingClientRect();
          }
          return { x: r.left + r.width * 0.55, y: r.top + r.height * 0.6 };
        });
      }
      const tc = t - T_PREVIA;
      const mover = easeOut(clamp((tc - 0.25) / 1.2));
      const x0 = W * 0.82, y0 = H * 0.85;
      const cx = x0 + (alvoBtn.x - x0) * mover;
      const cy = y0 + (alvoBtn.y - y0) * mover;
      const clique = clamp((tc - 1.55) / 0.45);
      const card = ease(clamp((tc - 1.95) / 0.4));
      await page.evaluate(({ cx, cy, clique, card, fade }) => {
        const cur = document.getElementById('rx-cursor');
        cur.style.display = 'block';
        cur.style.transform = `translate(${cx}px, ${cy}px) scale(${clique > 0 && clique < 0.35 ? 0.85 : 1})`;
        const rp = document.getElementById('rx-ripple');
        rp.style.left = cx + 'px';
        rp.style.top = cy + 'px';
        rp.style.opacity = clique > 0 ? String(1 - clique) : '0';
        rp.style.transform = `scale(${0.4 + clique * 1.4})`;
        document.getElementById('rx-card').style.opacity = card;
        document.getElementById('rx-label').style.opacity = String(1 - card);
        cur.style.opacity = String(1 - card);
        document.getElementById('rx-curtain').style.opacity = fade;
      }, { cx, cy, clique, card, fade });
    }

    const buf = await page.screenshot({ type: 'jpeg', quality: 88 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }

  ff.stdin.end();
  await done;
  await ctx.close();

  // Garante o limite de 10 MB do WhatsApp
  for (const crf of [28, 31, 34]) {
    if (fs.statSync(out).size <= MAX_BYTES) break;
    const tmp = out.replace(/\.mp4$/, '.tmp.mp4');
    await reencodar(out, tmp, crf);
    fs.renameSync(tmp, out);
  }
  return { out, mb: fs.statSync(out).size / 1048576, canal: info.canal };
}

// ---------- Execução ----------
const executablePath = process.env.CHROMIUM_PATH || undefined;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
let ok = 0, falhas = 0;
for (const [i, job] of jobs.entries()) {
  for (const fmt of formatos) {
    const t0 = Date.now();
    try {
      const r = await gravar(browser, job, fmt);
      ok++;
      console.log(`✔ [${i + 1}/${jobs.length}] ${path.basename(r.out)} · ${r.mb.toFixed(1)} MB · botão: ${r.canal} · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    } catch (e) {
      falhas++;
      console.error(`✘ [${i + 1}/${jobs.length}] ${job.clinic.SLUG}${fmt.sufixo}: ${e.message}`);
    }
  }
  if (OUT === path.resolve('./videos')) syncVideosList(OUT);
}
await browser.close();

console.log(`\n🏁 Raio-x: ${ok} vídeo(s) gerado(s)${falhas ? `, ${falhas} com falha` : ''} em ${OUT}`);
relatorioFinal();
