// Tira o print "Hoje" do perfil da clínica no Google Maps e salva em prints/<id>.png (cena inicial do Raio-x).
//
// Uso:
//   node tirar-print.mjs --only slug-1,slug-2   -> tira o print dessas clínicas
//   node tirar-print.mjs --only slug --force    -> refaz um print que já existe
//   node tirar-print.mjs --only slug --ver      -> abre o navegador visível (útil quando o Google pede confirmação)
//
// Se o Google mostrar CAPTCHA ou "tráfego incomum", o script para e avisa: o print deve ser tirado à mão (Win+Shift+S).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const raw = process.argv.slice(2);
const args = {};
for (let i = 0; i < raw.length; i++) {
  if (!raw[i].startsWith('--')) continue;
  const key = raw[i].slice(2);
  const next = raw[i + 1];
  if (next && !next.startsWith('--')) { args[key] = next; i++; } else { args[key] = true; }
}

if (!args.only) {
  console.log('Uso: node tirar-print.mjs --only <id>[,<id>...] [--force] [--ver]');
  process.exit(0);
}

const PRINTS = path.resolve(args.prints || './prints');
fs.mkdirSync(PRINTS, { recursive: true });

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

const todosRegistros = args.nicho === 'idiomas' 
  ? escolas 
  : args.nicho === 'odonto' 
    ? clinicas 
    : [...clinicas, ...escolas];

const ids = String(args.only).split(',').map(s => s.trim()).filter(Boolean);

const normal = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const browser = await chromium.launch({ headless: !args.ver });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: 'pt-BR',
  timezoneId: 'America/Sao_Paulo'
});

const falhas = [];
for (const id of ids) {
  const c = todosRegistros.find(x => x.SLUG === id || String(x.RANKING) === id);
  if (!c) { console.error(`❌ Registro não encontrado: ${id}`); falhas.push(id); continue; }
  const out = path.join(PRINTS, `${c.SLUG}.png`);
  if (fs.existsSync(out) && !args.force) { console.log(`↷ Já existe: ${out} (use --force para refazer)`); continue; }

  const page = await ctx.newPage();
  try {
    await page.goto(c.LINK_MAPS, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Tela de cookies do Google: escolhe a opção mais restritiva
    if (page.url().includes('consent.google')) {
      const rejeitar = page.getByRole('button', { name: /Rejeitar tudo|Reject all/i }).first();
      await rejeitar.click({ timeout: 10000 });
      await page.waitForLoadState('domcontentloaded');
    }
    if (/\/sorry\/|captcha/i.test(page.url())) throw new Error('o Google pediu verificação (CAPTCHA); tire o print à mão');

    // Quando a busca devolve uma lista, abre o primeiro resultado
    const h1 = page.locator('h1').filter({ hasNotText: /^Resultados$/ }).first();
    await h1.waitFor({ timeout: 25000 }).catch(async () => {
      await page.locator('a.hfpxzc').first().click({ timeout: 8000 });
      await h1.waitFor({ timeout: 20000 });
    });
    // Esconde dicas flutuantes (ex.: "Recolher painel lateral") e tira o foco dos botões
    await page.addStyleTag({ content: '[role="tooltip"], .ITxTuf, .vKmG2c { display: none !important; }' });
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.mouse.move(1430, 890);
    await page.waitForTimeout(3500); // fotos e mapa terminam de carregar
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('body *')) {
        if (el.children.length === 0 && /^(Recolher painel lateral|Collapse side panel)$/.test(el.textContent.trim())) {
          (el.closest('[role="tooltip"]') || el.parentElement || el).style.setProperty('display', 'none', 'important');
        }
      }
    });

    const titulo = (await h1.innerText()).trim();
    // Painel do perfil + parte do mapa: fica legível no vídeo de 720p
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1000, height: 900 } });

    const confere = normal(titulo).includes(normal(c.NOME_CLINICA).split(' ')[0]) || normal(c.NOME_GOOGLE).includes(normal(titulo)) || normal(titulo).includes(normal(c.NOME_GOOGLE));
    console.log(`${confere ? '✔' : '⚠️ '} ${c.SLUG}: "${titulo}" → ${out}${confere ? '' : ` (nome esperado: "${c.NOME_GOOGLE}"; confira o print)`}`);
  } catch (e) {
    falhas.push(c.SLUG);
    console.error(`✘ ${c.SLUG}: ${e.message.split('\n')[0]}`);
  } finally {
    await page.close();
  }
}

await browser.close();
if (falhas.length) {
  console.log(`\nSem print automático: ${falhas.join(', ')}`);
  process.exit(1);
}
