/**
 * importar-apify.mjs
 * Importador e ranqueador de dados do Apify (Google Maps Scraper) para escolas e novos nichos.
 *
 * Uso:
 *   node importar-apify.mjs --nicho idiomas --arquivo <caminho.json|.csv>
 *
 * Exemplo:
 *   node importar-apify.mjs --nicho idiomas --arquivo "C:/Users/administrator.INOVACOMVALOR/Downloads/dataset_crawler-google-places_2026-10-28_12-36-15-334.json"
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importa configuração central dos nichos
import './nichos.config.js';
const { NICHOS_CONFIG, getNicho } = globalThis;

// ---------- Processamento de Argumentos ----------
const rawArgs = process.argv.slice(2);
const args = {};
for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i].startsWith('--')) {
    const key = rawArgs[i].slice(2);
    const next = rawArgs[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i++;
    } else {
      args[key] = true;
    }
  }
}

const nichoId = args.nicho || 'idiomas';
const nichoConfig = getNicho(nichoId);
const arquivoCaminho = args.arquivo;

if (!arquivoCaminho) {
  console.error('❌ Erro: informe o caminho do arquivo com --arquivo <caminho>');
  console.log('Exemplo: node importar-apify.mjs --nicho idiomas --arquivo dataset.json');
  process.exit(1);
}

if (!fs.existsSync(arquivoCaminho)) {
  console.error(`❌ Arquivo não encontrado: ${arquivoCaminho}`);
  process.exit(1);
}

console.log(`\n======================================================`);
console.log(`🎓 IMPORTADOR APIFY · NICHO: ${nichoConfig.rotulo.toUpperCase()}`);
console.log(`======================================================`);
console.log(`Arquivo de entrada: ${arquivoCaminho}`);

// ---------- Lista Configurável de Franquias / Redes a Excluir ----------
const FRANQUIAS_PADRAO = [
  'wizard', 'ccaa', 'fisk', 'cna', 'wise up', 'wiseup', 'yázigi', 'yazigi',
  'cultura inglesa', 'open english', 'number one', 'knn', 'skill', 'uptime',
  'fluency academy', 'berlitz', 'minds', 'inFlux', 'influx', 'rockfeller',
  'red balloon', 'kumon', 'alub', 'cel-lep', 'cellep'
];

// ---------- Funções Utilitárias ----------
function normalizarTexto(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function gerarSlugBase(nome, bairro) {
  const limpo = normalizarTexto(`${nome} ${bairro}`)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
  return limpo || 'escola-idiomas';
}

function isCelular(phone) {
  if (!phone) return false;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) {
    return digits[4] === '9';
  }
  if (digits.length === 12 && digits.startsWith('55')) {
    return digits[4] === '9';
  }
  if (digits.length === 11) {
    return digits[2] === '9';
  }
  if (digits.length === 9) {
    return digits[0] === '9';
  }
  return false;
}

function formatarTelefoneBR(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  let d = digits;
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) {
    d = d.slice(2);
  }
  if (d.length === 11) {
    return `${d.slice(0, 2)} ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `${d.slice(0, 2)} ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return phone;
}

function detectarIdiomas(title, categoryName, categories) {
  const combined = normalizarTexto(`${title} ${categoryName || ''} ${(categories || []).join(' ')}`);
  const encontrados = [];
  if (combined.includes('ingles') || combined.includes('english')) encontrados.push('Inglês');
  if (combined.includes('espanhol') || combined.includes('spanish')) encontrados.push('Espanhol');
  if (combined.includes('frances') || combined.includes('french')) encontrados.push('Francês');
  if (combined.includes('alemao') || combined.includes('german')) encontrados.push('Alemão');
  if (combined.includes('italiano') || combined.includes('italian')) encontrados.push('Italiano');
  if (combined.includes('japones') || combined.includes('japanese')) encontrados.push('Japonês');
  if (combined.includes('mandarim') || combined.includes('chines')) encontrados.push('Mandarim');
  if (encontrados.length === 0) encontrados.push('Inglês');
  return encontrados;
}

// ---------- Leitura do Arquivo de Entrada (JSON ou CSV) ----------
let rawRecords = [];
const ext = path.extname(arquivoCaminho).toLowerCase();

if (ext === '.json') {
  const content = fs.readFileSync(arquivoCaminho, 'utf8');
  rawRecords = JSON.parse(content);
  if (!Array.isArray(rawRecords)) {
    if (rawRecords.items && Array.isArray(rawRecords.items)) rawRecords = rawRecords.items;
    else rawRecords = [rawRecords];
  }
} else if (ext === '.csv') {
  const content = fs.readFileSync(arquivoCaminho, 'utf8');
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length > 0) {
    const headers = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim());
    for (let i = 1; i < lines.length; i++) {
      // Split respeitando aspas simples/duplas
      const parts = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = parts[idx] ? parts[idx].replace(/^["']|["']$/g, '').trim() : '';
      });
      rawRecords.push(row);
    }
  }
} else {
  console.error('❌ Formato de arquivo não suportado diretamente. Use .json ou .csv');
  process.exit(1);
}

console.log(`Linhas/Registros brutos lidos: ${rawRecords.length}`);

// ---------- Detecção Dinâmica de Colunas ----------
const sample = rawRecords[0] || {};
const keys = Object.keys(sample);

function acharColuna(possibilidades) {
  for (const p of possibilidades) {
    const match = keys.find(k => k.toLowerCase() === p.toLowerCase());
    if (match) return match;
  }
  return null;
}

const colMapa = {
  title: acharColuna(['title', 'name', 'nome', 'placeName']),
  categoryName: acharColuna(['categoryName', 'category', 'categoria', 'categories']),
  address: acharColuna(['address', 'formattedAddress', 'endereco', 'streetAddress']),
  neighborhood: acharColuna(['neighborhood', 'bairro', 'sublocality']),
  city: acharColuna(['city', 'cidade', 'municipality']),
  state: acharColuna(['state', 'estado']),
  phone: acharColuna(['phone', 'telefone', 'telephone']),
  phoneUnformatted: acharColuna(['phoneUnformatted', 'telefoneFormatado', 'phone_unformatted']),
  website: acharColuna(['website', 'site', 'url_website']),
  totalScore: acharColuna(['totalScore', 'score', 'nota', 'rating']),
  reviewsCount: acharColuna(['reviewsCount', 'reviews', 'avaliacoes', 'userRatingsTotal']),
  url: acharColuna(['url', 'link', 'googleMapsUrl', 'linkMaps']),
  placeId: acharColuna(['placeId', 'place_id', 'id']),
  imageUrl: acharColuna(['imageUrl', 'fotoPrincipal', 'image', 'photo']),
  imagesCount: acharColuna(['imagesCount', 'fotosNoGoogle', 'photosCount']),
  permanentlyClosed: acharColuna(['permanentlyClosed', 'fechadoPermanente']),
  temporarilyClosed: acharColuna(['temporarilyClosed', 'fechadoTemporario']),
  openingHours: acharColuna(['openingHours', 'horario', 'hours']),
  location: acharColuna(['location', 'coords', 'coordenadas'])
};

console.log('\n--- MAPEAMENTO DETECTADO DE COLUNAS ---');
for (const [campo, col] of Object.entries(colMapa)) {
  console.log(`  • ${campo.padEnd(18)} -> ${col ? `"${col}"` : '(não detectado)'}`);
}

// ---------- Carregar Slugs das Clínicas Existentes para Evitar Colisão ----------
const clinicasPath = path.join(__dirname, 'clinicas-import.json');
const slugsExistentes = new Set();
if (fs.existsSync(clinicasPath)) {
  try {
    const clinicasData = JSON.parse(fs.readFileSync(clinicasPath, 'utf8'));
    clinicasData.forEach(c => {
      if (c.SLUG) slugsExistentes.add(c.SLUG.toLowerCase());
    });
    console.log(`\nBase de clínicas existente carregada (${slugsExistentes.size} slugs protegidos contra colisão).`);
  } catch (e) {
    console.warn('Aviso: não foi possível ler clinicas-import.json para checagem de slugs:', e.message);
  }
}

// ---------- Filtragem e Deduplicação ----------
const franquiasRegex = new RegExp(`\\b(${FRANQUIAS_PADRAO.map(f => f.replace(/\s+/g, '\\s*')).join('|')})\\b`, 'i');

const estatisticas = {
  totalLido: rawRecords.length,
  removidoNaoSP: 0,
  removidoFechada: 0,
  removidoComSite: 0,
  removidoSemTelefone: 0,
  removidoNotaBaixa: 0,
  removidoPoucasAvaliacoes: 0,
  removidoFranquia: 0,
  removidoDuplicado: 0,
  totalAprovado: 0
};

const vistasPlaceId = new Set();
const vistasTelefone = new Set();
const candidatosAprovados = [];

rawRecords.forEach(raw => {
  const title = (raw[colMapa.title] || '').trim();
  if (!title) return;

  const city = raw[colMapa.city] || '';
  const state = raw[colMapa.state] || '';
  const address = raw[colMapa.address] || '';
  const normalAddress = normalizarTexto(`${city} ${state} ${address}`);

  // 1. Manter apenas São Paulo
  const isSP = normalAddress.includes('sao paulo') || normalAddress.includes('sp,') || normalAddress.includes(' - sp');
  if (!isSP) {
    estatisticas.removidoNaoSP++;
    return;
  }

  // 2. Não fechada temporária ou permanentemente
  const permClosed = raw[colMapa.permanentlyClosed] === true || String(raw[colMapa.permanentlyClosed]).toLowerCase() === 'true';
  const tempClosed = raw[colMapa.temporarilyClosed] === true || String(raw[colMapa.temporarilyClosed]).toLowerCase() === 'true';
  if (permClosed || tempClosed) {
    estatisticas.removidoFechada++;
    return;
  }

  // 3. Sem site (website vazio)
  const website = (raw[colMapa.website] || '').trim();
  if (website && website.length > 0 && !website.includes('google.com') && !website.includes('maps')) {
    estatisticas.removidoComSite++;
    return;
  }

  // 4. Com telefone
  const phone = (raw[colMapa.phone] || raw[colMapa.phoneUnformatted] || '').trim();
  if (!phone) {
    estatisticas.removidoSemTelefone++;
    return;
  }

  // 5. Excluir franquias e redes conhecidas
  if (franquiasRegex.test(title)) {
    estatisticas.removidoFranquia++;
    return;
  }

  // 6. Nota a partir de 4,5
  const scoreRaw = raw[colMapa.totalScore];
  const score = parseFloat(String(scoreRaw || '0').replace(',', '.'));
  if (isNaN(score) || score < 4.5) {
    estatisticas.removidoNotaBaixa++;
    return;
  }

  // 7. Pelo menos 5 avaliações
  const reviewsRaw = raw[colMapa.reviewsCount];
  const reviews = parseInt(String(reviewsRaw || '0').replace(/\D/g, ''), 10);
  if (isNaN(reviews) || reviews < 5) {
    estatisticas.removidoPoucasAvaliacoes++;
    return;
  }

  // 8. Deduplicação por placeId ou telefone
  const placeId = (raw[colMapa.placeId] || '').trim();
  const digitsPhone = phone.replace(/\D/g, '');

  if (placeId && vistasPlaceId.has(placeId)) {
    estatisticas.removidoDuplicado++;
    return;
  }
  if (digitsPhone && vistasTelefone.has(digitsPhone)) {
    estatisticas.removidoDuplicado++;
    return;
  }

  if (placeId) vistasPlaceId.add(placeId);
  if (digitsPhone) vistasTelefone.add(digitsPhone);

  // ---------- Cálculo de Ranking ----------
  let pontos = 0;
  // nota 4,9 ou mais: +3; nota 4,7 a 4,8: +1,5;
  if (score >= 4.9) pontos += 3;
  else if (score >= 4.7) pontos += 1.5;

  // de 10 a 150 avaliações: +3;
  if (reviews >= 10 && reviews <= 150) pontos += 3;

  // celular: +2;
  const cel = isCelular(phone);
  if (cel) pontos += 2;

  // 5 fotos ou mais: +1;
  const imagesCount = parseInt(String(raw[colMapa.imagesCount] || '0').replace(/\D/g, ''), 10) || 0;
  if (imagesCount >= 5) pontos += 1;

  // nome com cara de escola pequena ("English", "Idiomas", "Language", nome de pessoa): +1.
  if (/\b(english|idiomas|language|escola|cursos?|instituto)\b/i.test(title) || /^[A-Z][a-z]+ [A-Z][a-z]+/.test(title)) {
    pontos += 1;
  }

  candidatosAprovados.push({
    raw,
    title,
    score,
    reviews,
    phone,
    cel,
    imagesCount,
    pontos
  });
});

estatisticas.totalAprovado = candidatosAprovados.length;

// Ordena por pontuação decrescente; desempate por número de avaliações
candidatosAprovados.sort((a, b) => {
  if (b.pontos !== a.pontos) return b.pontos - a.pontos;
  return b.reviews - a.reviews;
});

// ---------- Construção dos Objetos Finais Formatados ----------
const escolasImport = [];
const escolasData = [];
const escolasExtra = {};
const slugsUsados = new Set();

candidatosAprovados.forEach((cand, idx) => {
  const rankingNum = idx + 1;
  let camada = 'C';
  if (rankingNum <= 10) camada = 'A';
  else if (rankingNum <= 60) camada = 'B';

  const raw = cand.raw;
  const title = cand.title;
  let bairro = (raw[colMapa.neighborhood] || '').trim();
  if (!bairro) {
    // Tenta extrair do endereço
    const addr = raw[colMapa.address] || '';
    const match = addr.match(/-\s*([^,-]+),\s*São Paulo/i);
    bairro = match ? match[1].trim() : 'São Paulo';
  }

  // Gera SLUG único (sem colisão com clínicas ou outras escolas)
  let slug = gerarSlugBase(title, bairro);
  if (slugsExistentes.has(slug) || slugsUsados.has(slug)) {
    slug = `${slug}-idiomas`;
  }
  let slugTentativa = slug;
  let counter = 2;
  while (slugsExistentes.has(slugTentativa) || slugsUsados.has(slugTentativa)) {
    slugTentativa = `${slug}-${counter}`;
    counter++;
  }
  slug = slugTentativa;
  slugsUsados.add(slug);

  const cleanPhone = cand.phone.replace(/\D/g, '');
  let phoneFormatted = formatarTelefoneBR(cand.phone);
  let telLink = `tel:+${cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone}`;
  let waLink = cand.cel ? `https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone}` : telLink;

  const idiomas = detectarIdiomas(title, raw[colMapa.categoryName], raw.categories);
  const idiomaPrincipal = idiomas[0] || 'Idiomas';

  const notaFormatada = cand.score.toFixed(1).replace('.', ',');
  const avaliacoesStr = String(cand.reviews);

  // Link do Google Maps
  let linkMaps = raw[colMapa.url] || '';
  if (!linkMaps && raw[colMapa.placeId]) {
    linkMaps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title)}&query_place_id=${raw[colMapa.placeId]}`;
  }

  // Horários
  let horarioTexto = 'Seg a sex, 8h às 20h; sáb, 8h às 13h';
  if (raw[colMapa.openingHours] && Array.isArray(raw[colMapa.openingHours]) && raw[colMapa.openingHours].length > 0) {
    horarioTexto = raw[colMapa.openingHours].slice(0, 2).map(h => typeof h === 'object' ? `${h.day || ''}: ${h.hours || ''}` : String(h)).join(' · ');
  }

  const escolaObj = {
    CAMADA: camada,
    RANKING: String(rankingNum),
    PRONTA_PARA_GERAR: "sim",
    ALERTAS: "",
    STATUS_PREVIA: "pendente",
    TEMPLATE: "provisorio",
    NICHO: "idiomas",
    SLUG: slug,
    NOME_CLINICA: title, // compatibilidade com os scripts que usam c.NOME_CLINICA
    NOME_GOOGLE: title,
    BAIRRO: bairro,
    TITULO: `Aulas de ${idiomaPrincipal} em ${bairro}.`,
    SUBTITULO: `Metodologia personalizada para crianças, jovens e adultos no ${bairro}.`,
    SERVICO_1: `${idiomaPrincipal} para Iniciantes`,
    SERVICO_2: `Conversação em ${idiomaPrincipal}`,
    SERVICO_3: `Aulas Particulares e em Turmas`,
    SELO: `${notaFormatada} no Google · ${avaliacoesStr} avaliações`,
    TEXTO_BOTAO: cand.cel ? "Falar com a escola no WhatsApp" : "Ligar para a escola",
    NOTA: notaFormatada,
    AVALIACOES: avaliacoesStr,
    TELEFONE: phoneFormatted,
    LINK_TELEFONE: telLink,
    TEM_WHATSAPP: cand.cel ? "sim" : "não",
    LINK_WHATSAPP: waLink,
    ENDERECO: raw[colMapa.address] || `${bairro}, São Paulo - SP`,
    HORARIO: horarioTexto,
    BARRA_LINHA_1: "Seg a sáb",
    BARRA_LINHA_2: "Aulas presenciais e online",
    LINK_MAPS: linkMaps,
    MAPA_EMBED: `https://maps.google.com/maps?q=${encodeURIComponent(title + ' ' + bairro + ' São Paulo')}&output=embed`,
    FOTO_PRINCIPAL: raw[colMapa.imageUrl] || "",
    FOTOS_NO_GOOGLE: String(cand.imagesCount),
    PALETA_NOME: "azul royal, branco e grafite",
    COR_PRIMARIA: "#1E3A8A",
    COR_FUNDO: "#F8FAFC",
    COR_DESTAQUE: "#2563EB",
    COR_TEXTO: "#0F172A",
    RESPONSAVEL_TECNICO: "Coordenação Pedagógica",
    CRO: "",
    DIAGNOSTICO: `${title} tem nota ${notaFormatada} com ${avaliacoesStr} avaliações no Google em ${bairro}, mas quem busca curso no bairro hoje não encontra um site próprio nem botão para falar direto no WhatsApp.`,
    BRIEFING: `Ângulo: escola de referência em ${bairro}. Topo com 'Aulas de ${idiomaPrincipal} em ${bairro}' e nota ${notaFormatada}. Botão de WhatsApp direto para a secretaria.`,
    ANGULO: `Volume de avaliações: "vocês têm ${avaliacoesStr} avaliações no Google em ${bairro}, uma reputação excelente que merece uma página própria para converter em matrículas."`,
    MENSAGEM_POS_LIGACAO: `Oi! Aqui é o {SEU_NOME}. Conforme conversamos, montei uma prévia da página da ${title}: {LINK_PREVIA}\n\nFico no aguardo do que acharem!`,
    MENSAGEM_ABORDAGEM: `Boa tarde! É da ${title}? Vi o perfil de vocês no Google com nota ${notaFormatada} em ${bairro}. Montei um vídeo de 20 segundos mostrando como a escola poderia aparecer com uma página própria e o WhatsApp integrado. Posso te mandar?`,
    MELHOR_HORARIO_LIGAR: "10h às 12h ou 14h às 17h",
    IDIOMAS: idiomas.join(', ')
  };

  escolasImport.push(escolaObj);

  // Formato para js/escolas-data.js (compatível com CLINICAS_DATA)
  escolasData.push({
    id: slug,
    ranking: rankingNum,
    camada,
    nicho: "idiomas",
    nome: title,
    nomeGoogle: title,
    bairro,
    cidade: "São Paulo - SP",
    subdominio: `${slug}.odontowebsites.com.br`,
    caminhoLocal: `previews/${slug}/index.html`,
    template: "provisorio",
    status: "pendente",
    nota: notaFormatada,
    avaliacoes: avaliacoesStr,
    telefone: phoneFormatted,
    telefoneFormatado: cleanPhone,
    linkTelefone: telLink,
    linkWhatsapp: waLink,
    endereco: escolaObj.ENDERECO,
    horario: horarioTexto,
    barraLinha1: escolaObj.BARRA_LINHA_1,
    barraLinha2: escolaObj.BARRA_LINHA_2,
    titulo: escolaObj.TITULO,
    subtitulo: escolaObj.SUBTITULO,
    servico1: escolaObj.SERVICO_1,
    servico2: escolaObj.SERVICO_2,
    servico3: escolaObj.SERVICO_3,
    idiomas: idiomas
  });

  // Formato para js/escolas-extra.js
  escolasExtra[slug] = {
    tw: cand.cel ? "sim" : "não",
    fotos: cand.imagesCount,
    melhorHorario: escolaObj.MELHOR_HORARIO_LIGAR,
    nomeGoogle: title,
    s1: escolaObj.SERVICO_1,
    s2: escolaObj.SERVICO_2,
    s3: escolaObj.SERVICO_3,
    idiomas: idiomas,
    nicho: "idiomas"
  };
});

// ---------- Gravação dos Arquivos ----------
const outImport = path.join(__dirname, 'escolas-import.json');
fs.writeFileSync(outImport, JSON.stringify(escolasImport, null, 2), 'utf8');
console.log(`\n💾 Gravado: ${outImport} (${escolasImport.length} escolas)`);

const outData = path.join(__dirname, 'js', 'escolas-data.js');
const jsDataContent = `/**
 * Banco de Dados de Escolas de Idiomas - Hub de Prospecção
 * Gerado automaticamente a partir de escolas-import.json via importar-apify.mjs
 */
const ESCOLAS_DATA = ${JSON.stringify(escolasData, null, 2)};

if (typeof window !== 'undefined') {
  window.ESCOLAS_DATA = ESCOLAS_DATA;
}
if (typeof globalThis !== 'undefined') {
  globalThis.ESCOLAS_DATA = ESCOLAS_DATA;
}
`;
fs.writeFileSync(outData, jsDataContent, 'utf8');
console.log(`💾 Gravado: ${outData}`);

const outExtra = path.join(__dirname, 'js', 'escolas-extra.js');
const jsExtraContent = `/**
 * Metadados Extras das Escolas de Idiomas
 */
var ESCOLAS_EXTRA = ${JSON.stringify(escolasExtra, null, 2)};

if (typeof window !== 'undefined') {
  window.ESCOLAS_EXTRA = ESCOLAS_EXTRA;
}
if (typeof globalThis !== 'undefined') {
  globalThis.ESCOLAS_EXTRA = ESCOLAS_EXTRA;
}
`;
fs.writeFileSync(outExtra, jsExtraContent, 'utf8');
console.log(`💾 Gravado: ${outExtra}`);

// ---------- Relatório Final e Top 20 ----------
console.log('\n======================================================');
console.log('📊 RESUMO DA IMPORTAÇÃO E FILTRAGEM');
console.log('======================================================');
console.log(`Total de registros lidos da planilha: ${estatisticas.totalLido}`);
console.log(`Removidas por não ser São Paulo:      ${estatisticas.removidoNaoSP}`);
console.log(`Removidas por estarem fechadas:       ${estatisticas.removidoFechada}`);
console.log(`Removidas por já possuírem website:   ${estatisticas.removidoComSite}`);
console.log(`Removidas por falta de telefone:      ${estatisticas.removidoSemTelefone}`);
console.log(`Removidas por franquias/redes:        ${estatisticas.removidoFranquia}`);
console.log(`Removidas por nota < 4,5:             ${estatisticas.removidoNotaBaixa}`);
console.log(`Removidas por avaliações < 5:         ${estatisticas.removidoPoucasAvaliacoes}`);
console.log(`Removidas por duplicidade (ID/tel):   ${estatisticas.removidoDuplicado}`);
console.log(`------------------------------------------------------`);
console.log(`🎯 TOTAL DE ESCOLAS QUALIFICADAS IMPORTADAS: ${estatisticas.totalAprovado}`);
console.log('======================================================');

console.log('\n🏆 TOP 20 ESCOLAS RANQUEADAS:');
escolasImport.slice(0, 20).forEach((e, idx) => {
  const pts = candidatosAprovados[idx].pontos;
  console.log(`${String(idx + 1).padStart(2, ' ')}. [${pts} pts | Camada ${e.CAMADA}] ${e.NOME_CLINICA} (${e.BAIRRO})`);
  console.log(`    Nota: ${e.NOTA} · ${e.AVALIACOES} avaliações · Celular/WhatsApp: ${e.TEM_WHATSAPP} · Idiomas: ${e.IDIOMAS}`);
  console.log(`    Slug: ${e.SLUG}`);
});
console.log('\n✅ Importação concluída com sucesso!');
