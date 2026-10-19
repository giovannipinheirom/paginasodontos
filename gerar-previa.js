/**
 * Gerador Automático de Prévias - OdontoWebsites Hub (100% das 500 Clínicas)
 * Suporte Completo aos 3 Templates Oficiais: Moderno, Profissional e Amigável
 * 
 * Uso via linha de comando:
 *   node gerar-previa.js <slug-ou-ranking>    -> Gera para uma clínica específica
 *   node gerar-previa.js --camada-a           -> Gera todas as 10 clínicas da Camada A
 *   node gerar-previa.js --all-moderno        -> Gera todas as 64 clínicas Moderno
 *   node gerar-previa.js --all-profissional   -> Gera todas as 96 clínicas Profissional
 *   node gerar-previa.js --all-amigavel       -> Gera todas as 340 clínicas Amigável
 *   node gerar-previa.js --all-500            -> Gera as 500 clínicas do sistema completo
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Carrega os dados brutos da planilha
const clinicasPath = path.join(__dirname, 'clinicas-import.json');
if (!fs.existsSync(clinicasPath)) {
  console.error('❌ Arquivo clinicas-import.json não encontrado!');
  process.exit(1);
}

const clinicas = JSON.parse(fs.readFileSync(clinicasPath, 'utf8'));

// 2. Carrega os 3 modelos base do sistema
const TEMPLATES_CONFIG = {
  Moderno: {
    folder: 'moderno',
    indexPath: path.join(__dirname, 'templates', 'moderno', 'index.html'),
    cssPath: path.join(__dirname, 'templates', 'moderno', 'css', 'style.css'),
    jsPath: path.join(__dirname, 'templates', 'moderno', 'js', 'main.js')
  },
  Profissional: {
    folder: 'profissional',
    indexPath: path.join(__dirname, 'templates', 'profissional', 'index.html'),
    cssPath: path.join(__dirname, 'templates', 'profissional', 'css', 'style.css'),
    jsPath: path.join(__dirname, 'templates', 'profissional', 'js', 'main.js')
  },
  'Amigável': {
    folder: 'amigavel',
    indexPath: path.join(__dirname, 'templates', 'amigavel', 'index.html'),
    cssPath: path.join(__dirname, 'templates', 'amigavel', 'css', 'style.css'),
    jsPath: path.join(__dirname, 'templates', 'amigavel', 'js', 'main.js')
  }
};

// Alias para compatibilidade caso venha sem acento
TEMPLATES_CONFIG['Amigavel'] = TEMPLATES_CONFIG['Amigável'];

// Carrega o conteúdo HTML, CSS e JS de cada template na memória
const templatesHtml = {};
const templatesCss = {};
const templatesJs = {};

for (const [key, cfg] of Object.entries(TEMPLATES_CONFIG)) {
  if (fs.existsSync(cfg.indexPath)) {
    templatesHtml[key] = fs.readFileSync(cfg.indexPath, 'utf8');
  }
  if (fs.existsSync(cfg.cssPath)) {
    templatesCss[key] = fs.readFileSync(cfg.cssPath, 'utf8');
  }
  if (fs.existsSync(cfg.jsPath)) {
    templatesJs[key] = fs.readFileSync(cfg.jsPath, 'utf8');
  }
}

/**
 * Formata o título do hero de forma limpa e harmônica em 2 linhas,
 * evitando qualquer duplicação de bairro (ex: "em Guaianases em Guaianases").
 */
function formatHeroTitle(titulo, bairro) {
  if (!titulo) {
    return `Excelência odontológica <br><span class="highlight">em ${bairro || 'São Paulo'}.</span>`;
  }
  const cleanT = titulo.trim().replace(/\.+$/, '');
  const b = (bairro || '').trim();

  if (b) {
    const escapedB = b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // 1. Se o título já termina com "em/na/no/de <Bairro>"
    const regexEnd = new RegExp('(.*?)\\s+(em|na|no|de)\\s+' + escapedB + '$', 'i');
    const matchEnd = cleanT.match(regexEnd);
    if (matchEnd && matchEnd[1].trim()) {
      const parte1 = matchEnd[1].trim();
      const prep = matchEnd[2].toLowerCase();
      return `${parte1} <br><span class="highlight">${prep} ${b}.</span>`;
    }

    // 2. Se o título contém "em/na/no/de <Bairro>" com complemento depois (ex: ", com planejamento")
    const regexMid = new RegExp('(.*?)\\s+(em|na|no|de)\\s+' + escapedB + '(.*)$', 'i');
    const matchMid = cleanT.match(regexMid);
    if (matchMid && matchMid[1].trim()) {
      const parte1 = matchMid[1].trim();
      const prep = matchMid[2].toLowerCase();
      const resto = matchMid[3].trim();
      const sep = resto.startsWith(',') ? '' : ' ';
      return `${parte1} <br><span class="highlight">${prep} ${b}${resto ? sep + resto : ''}.</span>`;
    }
  }

  // 3. Se possui vírgula, usa a vírgula como ponto de quebra
  if (cleanT.includes(',')) {
    const idx = cleanT.lastIndexOf(',');
    const p1 = cleanT.slice(0, idx).trim();
    const p2 = cleanT.slice(idx + 1).trim();
    if (p1 && p2) {
      return `${p1} <br><span class="highlight">${p2}.</span>`;
    }
  }

  // 4. Se não tem preposição de bairro nem vírgula, quebra suavemente na metade das palavras
  const words = cleanT.split(/\s+/);
  if (words.length > 3) {
    const half = Math.ceil(words.length / 2);
    const p1 = words.slice(0, half).join(' ');
    const p2 = words.slice(half).join(' ');
    return `${p1} <br><span class="highlight">${p2}.</span>`;
  }

  return `<span class="highlight">${cleanT}.</span>`;
}

/**
 * Gera fisicamente no disco a prévia completa para uma clínica
 */
function gerarPreviaParaClinica(clinic, silent = false) {
  const templateKey = clinic.TEMPLATE || 'Moderno';
  const templateConfig = TEMPLATES_CONFIG[templateKey] || TEMPLATES_CONFIG['Moderno'];
  const baseHtml = templatesHtml[templateKey] || templatesHtml['Moderno'];

  if (!baseHtml) {
    console.error(`❌ HTML do template ${templateKey} indisponível!`);
    return { success: false, reason: `Template ${templateKey} indisponível` };
  }

  const slug = clinic.SLUG;
  const targetDir = path.join(__dirname, 'previews', slug);
  const targetCssDir = path.join(targetDir, 'css');
  const targetJsDir = path.join(targetDir, 'js');

  fs.mkdirSync(targetCssDir, { recursive: true });
  fs.mkdirSync(targetJsDir, { recursive: true });

  // Substituição das Variáveis de Conteúdo
  let html = baseHtml;

  // Título e Metatags
  html = html.replace(/<title>.*?<\/title>/, `<title>${clinic.NOME_CLINICA} | ${clinic.TITULO || clinic.NOME_CLINICA}</title>`);
  
  // Nome da clínica (substitui primeiro a expressão mais longa para não duplicar "Odontologia")
  html = html.replace(/Belo Sorriso Odontologia/g, clinic.NOME_CLINICA);
  html = html.replace(/Belo Sorriso/g, clinic.NOME_CLINICA);
  html = html.replace(/Odontologia Odontologia/g, 'Odontologia');

  // Bairro
  if (clinic.BAIRRO) {
    html = html.replace(/Vila Albano/g, clinic.BAIRRO);
  }

  // Título e Subtítulo (sem duplicações)
  if (clinic.TITULO) {
    const heroTitleHtml = formatHeroTitle(clinic.TITULO, clinic.BAIRRO);
    html = html.replace(/<h1 class="hero-title">[\s\S]*?<\/h1>/, `<h1 class="hero-title">\n            ${heroTitleHtml}\n          </h1>`);
  }

  if (clinic.SUBTITULO) {
    html = html.replace(/<p class="hero-subtitle">[\s\S]*?<\/p>/, `<p class="hero-subtitle">\n            ${clinic.SUBTITULO}\n          </p>`);
  }

  // Nota e Avaliações Google
  if (clinic.NOTA) {
    html = html.replace(/<span class="rating-score">.*?<\/span>/, `<span class="rating-score">${clinic.NOTA}</span>`);
    html = html.replace(/4,9★/g, `${clinic.NOTA}★`);
  }
  if (clinic.AVALIACOES) {
    html = html.replace(/115 avaliações no Google/g, `${clinic.AVALIACOES} avaliações no Google`);
    html = html.replace(/\+115/g, `+${clinic.AVALIACOES}`);
    html = html.replace(/\(115 avaliações\)/g, `(${clinic.AVALIACOES} avaliações)`);
  }

  // Telefone e WhatsApp
  if (clinic.TELEFONE) {
    html = html.replace(/\(11\) 98146-4161/g, clinic.TELEFONE);
  }
  if (clinic.LINK_WHATSAPP) {
    html = html.replace(/https:\/\/wa\.me\/5511981464161/g, clinic.LINK_WHATSAPP);
  }
  if (clinic.LINK_TELEFONE) {
    html = html.replace(/tel:\+5511981464161/g, clinic.LINK_TELEFONE);
  }

  // Endereço e Horário
  if (clinic.ENDERECO) {
    html = html.replace(/R\. Luísa Crapsi Orsi, 238, Vila Albano, São Paulo, SP/g, clinic.ENDERECO);
  }
  if (clinic.HORARIO) {
    html = html.replace(/Seg a sex, 9h às 18h; sáb, 9h às 12h/g, clinic.HORARIO);
  }

  // Barra mobile resumida
  if (clinic.BARRA_LINHA_1) {
    const barraTexto = clinic.BARRA_LINHA_2 ? `${clinic.BARRA_LINHA_1} | ${clinic.BARRA_LINHA_2}` : clinic.BARRA_LINHA_1;
    html = html.replace(/Seg a Sex, 9h-18h \| Sáb, 9h-12h/g, barraTexto);
  }

  // Serviços
  if (clinic.SERVICO_1) {
    html = html.replace(/Clareamento Dental/g, clinic.SERVICO_1);
  }
  if (clinic.SERVICO_2) {
    html = html.replace(/Lentes e Facetas/g, clinic.SERVICO_2);
    html = html.replace(/Lentes e Facetas de Porcelana/g, clinic.SERVICO_2);
  }
  if (clinic.SERVICO_3) {
    html = html.replace(/Clínica Geral & Check-up/g, clinic.SERVICO_3);
    html = html.replace(/Clínica Geral & Prevenção/g, clinic.SERVICO_3);
  }

  // Foto Principal (se houver foto real do Google da clínica)
  if (clinic.FOTO_PRINCIPAL && clinic.FOTO_PRINCIPAL.startsWith('http')) {
    html = html.replace(
      /https:\/\/images\.unsplash\.com\/photo-1622253692010-333f2da6031d\?auto=format&fit=crop&w=800&q=80/g,
      clinic.FOTO_PRINCIPAL
    );
  }

  // Mapa do Google
  if (clinic.LINK_MAPS) {
    html = html.replace(/https:\/\/maps\.google\.com\/\?q=R\.\+Lu%C3%ADsa\+Crapsi\+Orsi.*?SP/g, clinic.LINK_MAPS);
  }
  if (clinic.MAPA_EMBED) {
    html = html.replace(/src="https:\/\/maps\.google\.com\/maps\?q=R\.\+Lu%C3%ADsa\+Crapsi\+Orsi.*?output=embed"/g, `src="${clinic.MAPA_EMBED}"`);
  }

  // Salva o arquivo gerado
  fs.writeFileSync(path.join(targetDir, 'index.html'), html, 'utf8');

  // Grava CSS e JS do template respectivo
  const cssContent = templatesCss[templateKey] || templatesCss['Moderno'];
  const jsContent = templatesJs[templateKey] || templatesJs['Moderno'];
  fs.writeFileSync(path.join(targetCssDir, 'style.css'), cssContent, 'utf8');
  fs.writeFileSync(path.join(targetJsDir, 'main.js'), jsContent, 'utf8');

  if (!silent) {
    console.log(`✅ [${templateKey.toUpperCase()}] Prévia gerada: "${clinic.NOME_CLINICA}" (${clinic.SLUG})`);
  }
  return { success: true, slug, template: templateKey };
}

// Processa argumentos da linha de comando
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
Uso do Gerador de Prévias:
  node gerar-previa.js <slug-ou-ranking>       -> Gera para uma clínica específica
  node gerar-previa.js --camada-a              -> Gera todas as 10 da Camada A
  node gerar-previa.js --all-moderno           -> Gera todas as 64 clínicas Moderno
  node gerar-previa.js --all-profissional      -> Gera todas as 96 clínicas Profissional
  node gerar-previa.js --all-amigavel          -> Gera todas as 340 clínicas Amigável
  node gerar-previa.js --all-500               -> Gera as 500 clínicas do sistema completo
  `);
  process.exit(0);
}

const command = args[0];

if (command === '--all-500') {
  console.log('🚀 INICIANDO GERAÇÃO EM MASSA DAS 500 CLÍNICAS...');
  const inicio = Date.now();
  let sucesso = 0;
  const contadores = { Moderno: 0, Profissional: 0, 'Amigável': 0 };

  clinicas.forEach((c, idx) => {
    const res = gerarPreviaParaClinica(c, true);
    if (res.success) {
      sucesso++;
      const t = c.TEMPLATE || 'Moderno';
      contadores[t] = (contadores[t] || 0) + 1;
      if (sucesso % 50 === 0 || sucesso === clinicas.length) {
        console.log(`   ⏳ Progresso: ${sucesso}/${clinicas.length} prévias geradas no disco...`);
      }
    }
  });

  const tempoTotal = ((Date.now() - inicio) / 1000).toFixed(2);
  console.log('\n======================================================');
  console.log(`🎉 SUCESSO TOTAL: ${sucesso} prévias geradas em ${tempoTotal} segundos!`);
  console.log(`   🎨 Moderno: ${contadores['Moderno']} clínicas`);
  console.log(`   🎨 Profissional: ${contadores['Profissional']} clínicas`);
  console.log(`   🎨 Amigável: ${contadores['Amigável']} clínicas`);
  console.log('   📁 Todas as pastas físicas gravadas em /previews/');
  console.log('======================================================\n');
} else if (command === '--camada-a') {
  console.log('--- PROCESSANDO CAMADA A (10 CLÍNICAS PRIORITÁRIAS) ---');
  const camadaA = clinicas.filter(c => c.CAMADA === 'A');
  let sucesso = 0;

  camadaA.forEach(c => {
    const res = gerarPreviaParaClinica(c);
    if (res.success) sucesso++;
  });

  console.log(`\n🎉 Resumo da Camada A: ${sucesso}/${camadaA.length} prévias geradas com sucesso (100% liberadas).`);
} else if (command === '--all-moderno') {
  console.log('--- GERANDO TODAS AS CLÍNICAS COM TEMPLATE MODERNO ---');
  const modernas = clinicas.filter(c => c.TEMPLATE === 'Moderno');
  modernas.forEach(c => gerarPreviaParaClinica(c));
  console.log(`\nTotal geradas: ${modernas.length} clínicas.`);
} else if (command === '--all-profissional') {
  console.log('--- GERANDO TODAS AS CLÍNICAS COM TEMPLATE PROFISSIONAL ---');
  const profissionais = clinicas.filter(c => c.TEMPLATE === 'Profissional');
  profissionais.forEach(c => gerarPreviaParaClinica(c));
  console.log(`\nTotal geradas: ${profissionais.length} clínicas.`);
} else if (command === '--all-amigavel') {
  console.log('--- GERANDO TODAS AS CLÍNICAS COM TEMPLATE AMIGÁVEL ---');
  const amigaveis = clinicas.filter(c => c.TEMPLATE === 'Amigável');
  amigaveis.forEach(c => gerarPreviaParaClinica(c));
  console.log(`\nTotal geradas: ${amigaveis.length} clínicas.`);
} else {
  const found = clinicas.find(c => c.SLUG === command || c.RANKING.toString() === command);
  if (!found) {
    console.error(`❌ Nenhuma clínica encontrada com o identificador: "${command}"`);
  } else {
    gerarPreviaParaClinica(found);
  }
}
