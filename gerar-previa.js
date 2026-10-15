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
  
  // Nome da clínica
  html = html.replace(/Belo Sorriso/g, clinic.NOME_CLINICA);
  html = html.replace(/Belo Sorriso Odontologia/g, clinic.NOME_CLINICA);

  // Bairro
  if (clinic.BAIRRO) {
    html = html.replace(/Vila Albano/g, clinic.BAIRRO);
  }

  // Título e Subtítulo
  if (clinic.TITULO) {
    const heroTitleHtml = `${clinic.TITULO.replace(/\./g, '')} <br><span class="highlight">em ${clinic.BAIRRO || 'São Paulo'}.</span>`;
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
