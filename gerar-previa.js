/**
 * Gerador Automático de Prévias - OdontoWebsites Hub
 * Uso via linha de comando:
 *   node gerar-previa.js <slug-ou-ranking>
 *   node gerar-previa.js --camada-a
 *   node gerar-previa.js --all-moderno
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega os dados brutos da planilha
const clinicasPath = path.join(__dirname, 'clinicas-import.json');
if (!fs.existsSync(clinicasPath)) {
  console.error('❌ Arquivo clinicas-import.json não encontrado!');
  process.exit(1);
}

const clinicas = JSON.parse(fs.readFileSync(clinicasPath, 'utf8'));

// Carrega o modelo base Moderno
const templateModernoPath = path.join(__dirname, 'templates', 'moderno', 'index.html');
if (!fs.existsSync(templateModernoPath)) {
  console.error('❌ Template Moderno não encontrado em templates/moderno/index.html!');
  process.exit(1);
}

const templateBaseModerno = fs.readFileSync(templateModernoPath, 'utf8');

function gerarPreviaParaClinica(clinic) {
  // 1. REGRA OBRIGATÓRIA: Se não for Moderno, aborta com erro!
  if (clinic.TEMPLATE !== 'Moderno') {
    console.error(`\n⚠️  BLOQUEADO: A clínica "${clinic.NOME_CLINICA}" (Ranking #${clinic.RANKING}) usa o template "${clinic.TEMPLATE}".`);
    console.error(`   ❌ O modelo "${clinic.TEMPLATE}" ainda não foi construído. Apenas o modelo "Moderno" está disponível.`);
    return { success: false, reason: `Template ${clinic.TEMPLATE} não construído` };
  }

  const slug = clinic.SLUG;
  const targetDir = path.join(__dirname, 'previews', slug);
  const targetCssDir = path.join(targetDir, 'css');
  const targetJsDir = path.join(targetDir, 'js');

  fs.mkdirSync(targetCssDir, { recursive: true });
  fs.mkdirSync(targetJsDir, { recursive: true });

  // 2. Substituição das Variáveis
  let html = templateBaseModerno;

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
    const heroTitleHtml = `${clinic.TITULO.replace(/\./g, '')} <br><span class="highlight">em ${clinic.BAIRRO}.</span>`;
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

  // Copia CSS e JS do template moderno
  fs.copyFileSync(
    path.join(__dirname, 'templates', 'moderno', 'css', 'style.css'),
    path.join(targetCssDir, 'style.css')
  );
  fs.copyFileSync(
    path.join(__dirname, 'templates', 'moderno', 'js', 'main.js'),
    path.join(targetJsDir, 'main.js')
  );

  console.log(`✅ [SUCESSO] Prévia gerada para: "${clinic.NOME_CLINICA}" (${clinic.SLUG})`);
  console.log(`   📂 Arquivo: previews/${slug}/index.html`);
  console.log(`   🌐 Subdomínio: https://${slug}.odontowebsites.com.br`);
  return { success: true, slug };
}

// Processa argumentos da linha de comando
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
Uso do Gerador:
  node gerar-previa.js <slug-ou-ranking>       -> Gera para uma clínica específica
  node gerar-previa.js --camada-a              -> Tenta gerar todas da Camada A (trava quem não for Moderno)
  node gerar-previa.js --all-moderno           -> Gera todas as 64 clínicas com template Moderno
  `);
  process.exit(0);
}

const command = args[0];

if (command === '--camada-a') {
  console.log('--- PROCESSANDO CAMADA A (10 CLÍNICAS PRIORITÁRIAS) ---');
  const camadaA = clinicas.filter(c => c.CAMADA === 'A');
  let sucesso = 0;
  let bloqueadas = 0;

  camadaA.forEach(c => {
    const res = gerarPreviaParaClinica(c);
    if (res.success) sucesso++;
    else bloqueadas++;
  });

  console.log(`\nResumo da Camada A: ${sucesso} geradas com sucesso (Moderno), ${bloqueadas} bloqueadas com aviso (outros templates).`);
} else if (command === '--all-moderno') {
  console.log('--- GERANDO TODAS AS CLÍNICAS COM TEMPLATE MODERNO ---');
  const modernas = clinicas.filter(c => c.TEMPLATE === 'Moderno');
  modernas.forEach(c => gerarPreviaParaClinica(c));
  console.log(`\nTotal geradas: ${modernas.length} clínicas.`);
} else {
  const found = clinicas.find(c => c.SLUG === command || c.RANKING.toString() === command);
  if (!found) {
    console.error(`❌ Nenhuma clínica encontrada com o identificador: "${command}"`);
  } else {
    gerarPreviaParaClinica(found);
  }
}
