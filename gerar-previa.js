/**
 * Gerador Automático de Prévias - OdontoWebsites Hub (100% das 500 Clínicas)
 * Desde 21/10/2026 todas as clínicas usam o template Moderno (templates/moderno, marcadores {{...}}).
 * Os templates Profissional e Amigável continuam na pasta templates/, mas não são mais usados.
 * 
 * Uso via linha de comando:
 *   node gerar-previa.js <slug-ou-ranking>    -> Gera para uma clínica específica
 *   node gerar-previa.js --camada-a           -> Gera todas as 10 clínicas da Camada A
 *   node gerar-previa.js --all-moderno        -> Gera todas as 64 clínicas Moderno
 *   node gerar-previa.js --all-profissional   -> Gera todas as 96 clínicas Profissional
 *   node gerar-previa.js --all-amigavel       -> Gera todas as 340 clínicas Amigável
 *   node gerar-previa.js --all-500            -> Gera as 500 clínicas do sistema completo
 *   Acrescente --saida previews-novo para gravar em outra pasta sem substituir as prévias atuais.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Carrega configuração central de nichos
import './nichos.config.js';
const { NICHOS_CONFIG, getNicho } = globalThis;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Carrega os dados brutos da planilha de clínicas
const clinicasPath = path.join(__dirname, 'clinicas-import.json');
if (!fs.existsSync(clinicasPath)) {
  console.error('❌ Arquivo clinicas-import.json não encontrado!');
  process.exit(1);
}

const clinicas = JSON.parse(fs.readFileSync(clinicasPath, 'utf8'));

// Carrega dados de escolas (se existirem)
const escolasPath = path.join(__dirname, 'escolas-import.json');
let escolas = [];
if (fs.existsSync(escolasPath)) {
  try {
    escolas = JSON.parse(fs.readFileSync(escolasPath, 'utf8'));
  } catch (e) {
    escolas = [];
  }
}

// 2. Carrega os modelos base do sistema
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
  },
  IdiomasProvisorio: {
    folder: 'idiomas/provisorio',
    indexPath: path.join(__dirname, 'templates', 'idiomas', 'provisorio', 'index.html'),
    cssPath: path.join(__dirname, 'templates', 'idiomas', 'provisorio', 'css', 'style.css'),
    jsPath: path.join(__dirname, 'templates', 'idiomas', 'provisorio', 'js', 'main.js')
  },
  IdiomasOficial: {
    folder: 'idiomas/oficial',
    indexPath: path.join(__dirname, 'templates', 'idiomas', 'oficial', 'index.html'),
    cssPath: path.join(__dirname, 'templates', 'idiomas', 'oficial', 'css', 'style.css'),
    jsPath: path.join(__dirname, 'templates', 'idiomas', 'oficial', 'js', 'main.js')
  }
};

// Alias para compatibilidade caso venha sem acento ou com outros nomes
TEMPLATES_CONFIG['Amigavel'] = TEMPLATES_CONFIG['Amigável'];
TEMPLATES_CONFIG['oficial'] = TEMPLATES_CONFIG['IdiomasOficial'];
TEMPLATES_CONFIG['Oficial'] = TEMPLATES_CONFIG['IdiomasOficial'];

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
    return `Cuidado odontológico <br><span class="highlight">em ${bairro || 'São Paulo'}.</span>`;
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

// ---------- Template Moderno v2 (marcadores {{...}}) ----------

// Descrições neutras e informativas dos serviços cadastrados (sem promessa de resultado, normas do CFO)
const SERVICOS_INFO = {
  'clínica geral': { icon: 'tooth', texto: 'Consultas de rotina, diagnóstico e acompanhamento da saúde bucal ao longo do tempo.' },
  'limpeza e prevenção': { icon: 'sparkle', texto: 'Limpeza profissional, remoção de tártaro e orientações de higiene para o dia a dia.' },
  'restaurações': { icon: 'layers', texto: 'Tratamento de cáries e reparo de dentes desgastados ou fraturados.' },
  'estética dental': { icon: 'sparkle', texto: 'Procedimentos de forma e cor dos dentes, como clareamento, indicados após avaliação.' },
  'ortodontia': { icon: 'align', texto: 'Aparelhos para corrigir a posição dos dentes e a mordida, com manutenções periódicas.' },
  'implantes dentários': { icon: 'implant', texto: 'Reposição de dentes ausentes com implantes, planejada a partir de exames e avaliação clínica.' },
  'odontopediatria': { icon: 'smile', texto: 'Atendimento para bebês, crianças e adolescentes, com orientação para os pais.' },
  'tratamento de canal': { icon: 'drop', texto: 'Endodontia para tratar a parte interna do dente quando há inflamação ou infecção.' },
  'periodontia': { icon: 'shield', texto: 'Cuidado da gengiva e dos tecidos que sustentam os dentes.' },
  'urgência odontológica': { icon: 'clock', texto: 'Atendimento para dor, inchaço ou trauma dental, conforme a agenda da clínica.' }
};
const SERVICO_TEXTO_PADRAO = 'Atendimento com avaliação clínica e plano de tratamento explicado na consulta.';

const ICONS = {
  tooth: '<path d="M7 3c-2.5 0-4 2-4 4.5 0 3 1.5 5 2 7.5.5 2.5 1 6 2.5 6s1.5-4 2.5-5.5c.5-.8 1.5-.8 2 0 1 1.5 1 5.5 2.5 5.5s2-3.5 2.5-6c.5-2.5 2-4.5 2-7.5C21 5 19.5 3 17 3c-2 0-3 1.2-5 1.2S9 3 7 3z"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
  align: '<rect x="3" y="8" width="18" height="8" rx="4"/><path d="M8 8v8M12 8v8M16 8v8"/>',
  implant: '<path d="M8 3h8l-1 5H9z"/><path d="M10 8h4M9.5 11h5M10 14h4M10.5 17h3M11 20h2"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
};
const svgIcon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.tooth}</svg>`;

const WA_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c.969.54 1.802.833 2.806.833 3.181 0 5.767-2.586 5.768-5.766.001-3.18-2.585-5.766-5.768-5.766zm9.969 5.766c0 5.503-4.469 9.972-9.972 9.972-1.748 0-3.39-.452-4.819-1.246l-5.209 1.368 1.391-5.076c-.886-1.488-1.395-3.23-1.395-5.093 0-5.503 4.469-9.972 9.972-9.972 5.503 0 10.032 4.494 10.032 10.047z"/></svg>';
const PHONE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
const ARROW_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';

const esc = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const filled = v => v && !/^\[.*\]$/.test(String(v).trim());
const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI'];

function iniciais(nome) {
  const ignorar = /^(odontologia|odonto|clinica|clínica|consultorio|consultório|dr|dra|dr\.|dra\.|de|da|do|das|dos|e|&|-)$/i;
  const palavras = String(nome).split(/\s+/).filter(p => p && !ignorar.test(p));
  const base = palavras.length ? palavras : String(nome).split(/\s+/);
  const letras = base.length === 1 ? base[0].slice(0, 2) : base[0][0] + base[1][0];
  return letras.toUpperCase();
}

// Pede uma versão maior da foto do Google (a planilha guarda a miniatura de ~400px)
function fotoAmpliada(url) {
  return String(url)
    .replace(/=w\d+-h\d+(-k-no)?$/, '=w1000-h1300-k-no')
    .replace(/([?&])w=\d+&h=\d+/, '$1w=900&h=1100');
}

// Seções originais do Moderno: troca os textos de exemplo (Belo Sorriso / Vila Albano) pelos dados da clínica
function aplicarSecoesOriginais(html, clinic, ctx) {
  const { temWhats, temTel, telHref } = ctx;
  const troca = (de, para) => { html = html.split(de).join(para); };

  troca('Belo Sorriso Odontologia', esc(clinic.NOME_CLINICA));
  troca('Belo Sorriso', esc(clinic.NOME_CLINICA));
  troca('Odontologia Odontologia', 'Odontologia');
  troca('Vila Albano', esc(clinic.BAIRRO || 'São Paulo'));

  troca('4,9★', `${esc(clinic.NOTA)}★`);
  troca('115 avaliações no Google', `${esc(clinic.AVALIACOES)} avaliações no Google`);
  troca('+115', `+${esc(clinic.AVALIACOES)}`);
  troca('(115 avaliações)', `(${esc(clinic.AVALIACOES)} avaliações)`);

  // Contato: WhatsApp da recepção > telefone > perfil no Google (nunca o número do exemplo)
  if (temWhats) {
    troca('https://wa.me/5511981464161', esc(clinic.LINK_WHATSAPP));
  } else {
    html = html.replace(/https:\/\/wa\.me\/5511981464161(\?text=[^"]*)?/g, esc(telHref));
    html = html.replace(/ (no|pelo) WhatsApp/g, temTel ? ' por telefone' : ' pelo Google');
    troca('Chamar por telefone', 'Ligar para a clínica');
    troca('Chamar pelo Google', 'Ver contato no Google');
    troca('class="btn btn-whatsapp"', 'class="btn btn-gold"');
    // Barra do celular: sem WhatsApp, fica só o botão de ligar (ou de contato no Google)
    html = html.replace(/\s*<a [^>]*mobile-bar-btn-whatsapp[\s\S]*?<\/a>/, '');
    if (!temTel) troca('<span>Ligar</span>', '<span>Contato</span>');
    // Ícone do WhatsApp nos botões do modelo vira telefone (ou some, sem telefone)
    html = html.replace(/<svg width="(\d+)" height="(\d+)" viewBox="0 0 24 24" fill="currentColor">\s*<path d="M12\.031[^"]*"\/>\s*<\/svg>/g,
      (_, w, h) => (temTel ? PHONE_ICON.replace('<svg ', `<svg width="${w}" height="${h}" `) : ''));
  }
  troca('tel:+5511981464161', esc(telHref));
  troca('(11) 98146-4161', temTel ? esc(clinic.TELEFONE) : 'Telefone no perfil do Google');

  troca('R. Luísa Crapsi Orsi, 238, Vila Albano, São Paulo, SP', esc(clinic.ENDERECO));
  troca(`R. Luísa Crapsi Orsi, 238, ${esc(clinic.BAIRRO || 'São Paulo')}, São Paulo, SP`, esc(clinic.ENDERECO));
  troca('Seg a sex, 9h às 18h; sáb, 9h às 12h', esc(clinic.HORARIO));
  const barra = clinic.BARRA_LINHA_2 ? `${clinic.BARRA_LINHA_1} | ${clinic.BARRA_LINHA_2}` : clinic.BARRA_LINHA_1;
  const barraTexto = String(barra || clinic.HORARIO || '');
  troca('Seg a Sex, 9h-18h | Sáb, 9h-12h', esc(temWhats ? barraTexto : barraTexto.replace(/ (no|pelo) WhatsApp/g, temTel ? ' por telefone' : ' pelo Google')));

  // Serviços 1 a 3: nome e descrição do serviço cadastrado (os cards 4 a 6 continuam os do modelo)
  const textosModelo = [
    'Protocolo personalizado para restaurar a luminosidade e cor natural dos dentes de forma segura, uniforme e com controle de sensibilidade.',
    'Lâminas ultrafinas de cerâmica que corrigem pequenas imperfeições de formato, alinhamento e tonalidade com harmonia e naturalidade.',
    'Avaliação completa da saúde bucal, profilaxia preventiva, restaurações estéticas e orientações para manter seu sorriso saudável em longo prazo.'
  ];
  [clinic.SERVICO_1, clinic.SERVICO_2, clinic.SERVICO_3].forEach((sv, i) => {
    if (!sv) return;
    const info = SERVICOS_INFO[sv.trim().toLowerCase()];
    if (info) troca(textosModelo[i], esc(info.texto));
  });
  if (clinic.SERVICO_1) troca('Clareamento Dental', esc(clinic.SERVICO_1));
  if (clinic.SERVICO_2) { troca('Lentes e Facetas de Porcelana', esc(clinic.SERVICO_2)); troca('Lentes e Facetas', esc(clinic.SERVICO_2)); }
  if (clinic.SERVICO_3) { troca('Clínica Geral & Check-up', esc(clinic.SERVICO_3)); troca('Clínica Geral & Prevenção', esc(clinic.SERVICO_3)); }

  if (clinic.LINK_MAPS) html = html.replace(/https:\/\/maps\.google\.com\/\?q=R\.\+Lu%C3%ADsa\+Crapsi\+Orsi[^"]*?SP/g, esc(clinic.LINK_MAPS));
  if (clinic.MAPA_EMBED) html = html.replace(/src="https:\/\/maps\.google\.com\/maps\?q=R\.\+Lu%C3%ADsa\+Crapsi\+Orsi[^"]*?output=embed"/g, `src="${esc(clinic.MAPA_EMBED)}"`);
  return html;
}

function renderModerno(clinic, baseHtml) {
  const nome = clinic.NOME_CLINICA;
  const bairro = clinic.BAIRRO || 'São Paulo';
  const temWhats = clinic.TEM_WHATSAPP === 'sim' && /^https:\/\/wa\.me\/55\d+/.test(clinic.LINK_WHATSAPP || '');
  const temTel = /^tel:\+\d+/.test(clinic.LINK_TELEFONE || '');
  const telHref = temTel ? clinic.LINK_TELEFONE : (clinic.LINK_MAPS || '#');
  const waBase = temWhats ? clinic.LINK_WHATSAPP : null;

  const servicos = [clinic.SERVICO_1, clinic.SERVICO_2, clinic.SERVICO_3].filter(Boolean);
  const servicosHtml = servicos.map((s, i) => {
    const info = SERVICOS_INFO[s.trim().toLowerCase()] || {};
    const link = waBase
      ? `<a href="${esc(waBase)}?text=${encodeURIComponent(`Olá! Gostaria de saber mais sobre ${s.toLowerCase()}.`)}" target="_blank" rel="noopener noreferrer" class="service-link"><span>Perguntar no WhatsApp</span>${ARROW_ICON}</a>`
      : temTel
        ? `<a href="${esc(telHref)}" class="service-link"><span>Ligar e perguntar</span>${ARROW_ICON}</a>`
        : '';
    return `          <article class="service reveal">
            <div class="service-top">
              <span class="service-icon">${svgIcon(info.icon)}</span>
              <span class="service-num">${ROMANOS[i]}</span>
            </div>
            <h3 class="service-title">${esc(s)}</h3>
            <p class="service-text">${esc(info.texto || SERVICO_TEXTO_PADRAO)}</p>
            ${link}
          </article>`;
  }).join('\n');

  const tickerItens = [`Odontologia em ${bairro}`, ...servicos, filled(clinic.SELO) ? clinic.SELO : null].filter(Boolean);
  const metade = Array(3).fill(tickerItens).flat().map(t => `<span class="ticker-item">${esc(t)}</span>`).join('');

  const foto = String(clinic.FOTO_PRINCIPAL || '');
  const heroMedia = foto.startsWith('http')
    ? `<img src="${esc(fotoAmpliada(foto))}" alt="Fachada ou consultório de ${esc(nome)} em ${esc(bairro)}" loading="eager" referrerpolicy="no-referrer">`
    : `<div class="arch-monogram"><span class="gold-text">${esc(iniciais(nome))}</span></div>`;


  // O selo some quando só repete a nota do Google, que já aparece no topo
  const flags = { NOTA: filled(clinic.NOTA), SELO: filled(clinic.SELO) && !/google/i.test(clinic.SELO), TEM_WHATSAPP: temWhats && temTel, TELEFONE: temTel };
  const tokens = {
    TITLE_TAG: esc(`${nome} | ${clinic.TITULO || `Odontologia em ${bairro}`}`.replace(/\.$/, '')),
    META_DESC: esc(`${clinic.SUBTITULO || ''} Odontologia em ${bairro}, São Paulo.`.trim()),
    NOME: esc(nome),
    BAIRRO: esc(bairro),
    INICIAIS: esc(iniciais(nome)),
    HERO_TITLE: formatHeroTitle(esc(clinic.TITULO), esc(bairro)),
    SUBTITULO: esc(clinic.SUBTITULO || ''),
    NOTA: esc(clinic.NOTA),
    AVALIACOES: esc(clinic.AVALIACOES),
    SELO: esc(clinic.SELO),
    // Prioridade do botão principal: WhatsApp da recepção > telefone > perfil no Google Maps
    CTA_HREF: esc(temWhats ? clinic.LINK_WHATSAPP : telHref),
    CTA_TARGET: temWhats || !temTel ? ' target="_blank" rel="noopener noreferrer"' : '',
    CTA_ICON: temWhats ? WA_ICON : temTel ? PHONE_ICON : '',
    CTA_LABEL: esc(temWhats ? (clinic.TEXTO_BOTAO || 'Agendar pelo WhatsApp') : temTel ? 'Ligar para a clínica' : 'Ver contato no Google'),
    CTA_CURTO: temWhats ? 'Agendar' : temTel ? 'Ligar' : 'Contato',
    CANAL: temWhats ? 'WhatsApp' : temTel ? 'telefone' : 'perfil do Google',
    TEL_HREF: esc(telHref),
    TELEFONE: esc(clinic.TELEFONE),
    ENDERECO: esc(clinic.ENDERECO),
    HORARIO: esc(clinic.HORARIO),
    MAPS: esc(clinic.LINK_MAPS || '#'),
    MAPA_EMBED: esc(clinic.MAPA_EMBED || ''),
    HERO_MEDIA: heroMedia,
    SERVICOS: servicosHtml,
    TICKER: metade + metade,
    RT: esc(filled(clinic.RESPONSAVEL_TECNICO) ? clinic.RESPONSAVEL_TECNICO : 'Cirurgião(ã)-Dentista'),
    CRO: esc(filled(clinic.CRO) ? clinic.CRO : 'a informar'),
    ANO: String(new Date().getFullYear())
  };

  let html = aplicarSecoesOriginais(baseHtml, clinic, { temWhats, temTel, telHref });
  html = html.replace(/<!--if:(\w+)-->([\s\S]*?)<!--\/if:\1-->/g, (_, key, inner) => (flags[key] ? inner : ''));
  html = html.replace(/\{\{(\w+)\}\}/g, (m, key) => (key in tokens ? tokens[key] : m));
  return html;
}

// Pasta de saída (padrão ./previews; use --saida previews-novo para gerar ao lado sem substituir)
const saidaIdx = process.argv.indexOf('--saida');
const OUTPUT_DIR = path.resolve(__dirname, saidaIdx > -1 ? process.argv[saidaIdx + 1] : 'previews');
if (saidaIdx > -1) process.argv.splice(saidaIdx, 2);

/**
 * Gera fisicamente no disco a prévia completa para uma clínica
 */
function gerarPreviaParaClinica(clinic, silent = false) {
  // Desde 21/10/2026 todas as clínicas usam o Moderno; os outros templates ficam no código, sem uso.
  const templateKey = 'Moderno';
  const templateConfig = TEMPLATES_CONFIG[templateKey] || TEMPLATES_CONFIG['Moderno'];
  const baseHtml = templatesHtml[templateKey] || templatesHtml['Moderno'];

  if (!baseHtml) {
    console.error(`❌ HTML do template ${templateKey} indisponível!`);
    return { success: false, reason: `Template ${templateKey} indisponível` };
  }

  const slug = clinic.SLUG;
  const targetDir = path.join(OUTPUT_DIR, slug);
  const targetCssDir = path.join(targetDir, 'css');
  const targetJsDir = path.join(targetDir, 'js');

  fs.mkdirSync(targetCssDir, { recursive: true });
  fs.mkdirSync(targetJsDir, { recursive: true });

  const html = renderModerno(clinic, baseHtml);

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

/**
 * Renderiza o template provisório para escolas de idiomas
 */
function renderEscolaProvisorio(escola, baseHtml) {
  const nome = escola.NOME_CLINICA || escola.NOME_GOOGLE || 'Escola de Idiomas';
  const bairro = escola.BAIRRO || 'São Paulo';

  // Monta seção de avaliações reais se existirem
  let secaoAvaliacoes = '';
  const reviews = Array.isArray(escola.AVALIACOES_REAIS) ? escola.AVALIACOES_REAIS : [];
  if (reviews.length > 0) {
    const cardsHtml = reviews.map(r => {
      const estrelasCount = typeof r.estrelas === 'number' ? r.estrelas : 5;
      const estrelasStr = '★'.repeat(Math.min(5, Math.max(1, estrelasCount)));
      const avatarHtml = r.fotoAutor
        ? `<img src="${esc(r.fotoAutor)}" alt="${esc(r.autor)}" class="review-avatar-img" loading="lazy">`
        : `<div class="review-avatar-letter">${esc(r.autor ? r.autor.charAt(0).toUpperCase() : 'A')}</div>`;
      const dataStr = r.data ? ` · ${esc(r.data)}` : '';

      return `        <div class="review-card">
          <div class="review-header">
            <div class="review-avatar-wrap">
              ${avatarHtml}
            </div>
            <div class="review-meta">
              <strong class="review-author">${esc(r.autor)}</strong>
              <span class="review-verified"><span class="badge-g">G</span> Aluno no Google${dataStr}</span>
            </div>
          </div>
          <div class="review-stars">${estrelasStr}</div>
          <p class="review-text">"${esc(r.texto)}"</p>
        </div>`;
    }).join('\n');

    secaoAvaliacoes = `<section class="section-avaliacoes" id="avaliacoes" data-video="avaliacoes">
    <div class="container">
      <div class="section-header">
        <span class="section-tag">Opinião de Quem Estuda Conosco</span>
        <h2>O Que Dizem Nossos Alunos</h2>
        <p>Depoimentos reais publicados espontaneamente no perfil oficial do Google Maps.</p>
      </div>
      <div class="reviews-grid">
${cardsHtml}
      </div>
    </div>
  </section>`;
  }

  // Monta bloco de foto real da escola se existir
  let fotoEscolaHtml = '';
  const fotoCapa = escola.FOTO_CAPA || escola.FOTO_PRINCIPAL || '';
  if (fotoCapa) {
    let fotosExtrasHtml = '';
    const extras = Array.isArray(escola.FOTOS_EXTRAS) ? escola.FOTOS_EXTRAS : [];
    if (extras.length > 0) {
      fotosExtrasHtml = `
            <div class="fotos-extras-grid">
              ${extras.map(u => `<img src="${esc(u)}" alt="Espaço da Escola" class="foto-thumb" loading="lazy">`).join('\n              ')}
            </div>`;
    }

    fotoEscolaHtml = `<div class="sobre-foto-wrapper">
            <img src="${esc(fotoCapa)}" alt="${esc(nome)}" class="sobre-foto" loading="lazy">
            <div class="foto-badge">
              <span class="badge-dot"></span> Fachada / Espaço da Escola
            </div>
          </div>${fotosExtrasHtml}`;
  }

  const tokens = {
    NOME_CLINICA: esc(nome),
    NOME: esc(nome),
    BAIRRO: esc(bairro),
    TITULO: esc(escola.TITULO || `Aulas de Idiomas em ${bairro}.`),
    SUBTITULO: esc(escola.SUBTITULO || `Metodologia personalizada para crianças, jovens e adultos no ${bairro}.`),
    SERVICO_1: esc(escola.SERVICO_1 || 'Inglês para Iniciantes'),
    SERVICO_2: esc(escola.SERVICO_2 || 'Conversação e Prática'),
    SERVICO_3: esc(escola.SERVICO_3 || 'Aulas Particulares e em Turmas'),
    SELO: esc(escola.SELO || `${escola.NOTA || '5,0'} no Google`),
    TEXTO_BOTAO: esc(escola.TEXTO_BOTAO || 'Falar com a escola no WhatsApp'),
    NOTA: esc(escola.NOTA || '5,0'),
    AVALIACOES: esc(escola.AVALIACOES || '0'),
    TELEFONE: esc(escola.TELEFONE || ''),
    LINK_TELEFONE: esc(escola.LINK_TELEFONE || '#'),
    LINK_WHATSAPP: esc(escola.LINK_WHATSAPP || '#'),
    ENDERECO: esc(escola.ENDERECO || `${bairro}, São Paulo - SP`),
    HORARIO: esc(escola.HORARIO || 'Seg a sex, 8h às 20h; sáb, 8h às 13h'),
    MAPA_EMBED: esc(escola.MAPA_EMBED || `https://maps.google.com/maps?q=${encodeURIComponent(nome + ' ' + bairro)}&output=embed`),
    FOTO_PRINCIPAL: esc(fotoCapa),
    FOTO_CAPA: esc(fotoCapa),
    SECAO_AVALIACOES: secaoAvaliacoes,
    FOTO_ESCOLA_HTML: fotoEscolaHtml,
    ANO: String(new Date().getFullYear())
  };

  let html = baseHtml.replace(/\{\{(\w+)\}\}/g, (m, key) => (key in tokens ? tokens[key] : m));
  return html;
}

function gerarShortName(nomeCompleto) {
  if (!nomeCompleto) return 'Escola';
  let n = nomeCompleto.replace(/\b(escola|cursos?|idiomas?|english|school|aulas?|de|em|da|do|para|ltda|me)\b/gi, '').trim();
  const parts = n.split(/\s+/).filter(p => p.length > 1);
  return parts[0] || nomeCompleto.split(' ')[0] || 'Escola';
}

function gerarMonograma(nomeCompleto) {
  const words = String(nomeCompleto || '').trim().split(/\s+/).filter(w => w.length > 2);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return (String(nomeCompleto || 'ES').slice(0, 2)).toUpperCase();
}

/**
 * Renderiza o template oficial definitivo para escolas de idiomas
 */
function renderEscolaOficial(escola, baseHtml) {
  const nome = escola.NOME_CLINICA || escola.NOME_GOOGLE || 'Escola de Idiomas';
  const shortName = gerarShortName(nome);
  const monogram = gerarMonograma(nome);

  // Detecção e tratamento da Cidade (São Bernardo do Campo vs São Paulo)
  let cidade = 'São Paulo';
  if ((escola.CIDADE && escola.CIDADE.includes('Bernardo')) || (escola.ENDERECO && escola.ENDERECO.includes('Bernardo'))) {
    cidade = 'São Bernardo do Campo';
  } else if (escola.CIDADE) {
    cidade = escola.CIDADE.split('-')[0].trim();
  }

  const bairro = escola.BAIRRO || 'Centro';
  const endereco = escola.ENDERECO || `${bairro}, ${cidade} - SP`;
  const fotoCapa = escola.FOTO_CAPA || escola.FOTO_PRINCIPAL || '';

  // Foto Hero HTML
  let fotoHeroHtml = '';
  if (fotoCapa) {
    fotoHeroHtml = `<img src="${esc(fotoCapa)}" alt="${esc(nome)}" class="aspect-[4/5] w-full rounded-t-[999px] rounded-b-[1.6rem] object-cover" loading="eager">`;
  } else {
    fotoHeroHtml = `<div class="aspect-[4/5] w-full rounded-t-[999px] rounded-b-[1.6rem] bg-navy-900 flex flex-col items-center justify-center text-center p-8">
      <span class="text-6xl font-extrabold text-white font-display">${esc(monogram)}</span>
      <span class="mt-4 text-xs font-bold uppercase tracking-widest text-crimson-400">${esc(nome)}</span>
      <span class="mt-1 text-xs text-navy-200">${esc(bairro)} · ${esc(cidade)}</span>
    </div>`;
  }

  // Depoimentos Reais Cards HTML
  let depoimentosHtml = '';
  const reviews = Array.isArray(escola.AVALIACOES_REAIS) ? escola.AVALIACOES_REAIS : [];
  if (reviews.length > 0) {
    depoimentosHtml = reviews.map(r => {
      const avatarHtml = r.fotoAutor
        ? `<img src="${esc(r.fotoAutor)}" alt="${esc(r.autor)}" class="h-10 w-10 rounded-full object-cover">`
        : `<div class="h-10 w-10 rounded-full bg-navy-100 flex items-center justify-center font-bold text-navy-900 text-sm">${esc((r.autor || 'A')[0])}</div>`;
      const estrelasStr = '★'.repeat(r.estrelas || 5);
      return `<div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-3">
            ${avatarHtml}
            <div>
              <h4 class="font-display font-bold text-navy-900 text-sm">${esc(r.autor)}</h4>
              <p class="text-[11px] text-slate-400">Aluno no Google · ${esc(r.data || 'recente')}</p>
            </div>
          </div>
          <div class="mt-3 text-amber-500 text-xs tracking-wider">${estrelasStr}</div>
          <p class="mt-3 text-xs leading-relaxed text-slate-600 italic">"${esc(r.texto)}"</p>
        </div>
        <div class="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
          <span class="inline-block h-3.5 w-3.5 rounded-full bg-blue-500 text-white text-[9px] font-bold text-center leading-[14px]">G</span>
          Avaliação verificada
        </div>
      </div>`;
    }).join('\n');
  } else {
    depoimentosHtml = `<div class="col-span-full rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500 text-sm">
      Mais de ${esc(escola.AVALIACOES || '10')} avaliações registradas e verificadas com nota média <strong>★ ${esc(escola.NOTA || '5,0')}</strong> no Google Maps.
    </div>`;
  }

  // Galeria de Fotos HTML
  let galeriaHtml = '';
  const fotosExtras = Array.isArray(escola.FOTOS_EXTRAS) ? escola.FOTOS_EXTRAS : [];
  const fotosTodas = [fotoCapa, ...fotosExtras].filter(Boolean);
  if (fotosTodas.length > 0) {
    galeriaHtml = fotosTodas.slice(0, 3).map(url => `
      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 aspect-video shadow-sm">
        <img src="${esc(url)}" alt="Espaço da Escola" class="h-full w-full object-cover transition-transform duration-300 hover:scale-105" loading="lazy">
      </div>
    `).join('\n');
  } else {
    galeriaHtml = `
      <div class="col-span-full rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500 text-sm">
        Unidade própria com salas climatizadas e ambiente imersivo no ${esc(bairro)}, ${esc(cidade)}.
      </div>
    `;
  }

  const tokens = {
    NOME_CLINICA: esc(nome),
    NOME: esc(nome),
    SHORT_NAME: esc(shortName),
    MONOGRAM: esc(monogram),
    LOGO_TAGLINE: 'English School',
    CIDADE: esc(cidade),
    CIDADE_COMPLETA: esc(`${cidade} - SP`),
    BAIRRO: esc(bairro),
    ENDERECO: esc(endereco),
    NOTA: esc(escola.NOTA || '5,0'),
    AVALIACOES: esc(escola.AVALIACOES || '10'),
    SUBTITULO: esc(escola.SUBTITULO || `Ensino orientado às necessidades de cada aluno, turmas reduzidas e professores dedicados no ${bairro} — pensado para você falar com confiança.`),
    TEXTO_BOTAO: 'Agendar aula experimental no WhatsApp',
    SERVICO_1: esc(escola.SERVICO_1 || 'Inglês Regular (A1 ao C1)'),
    SERVICO_2: esc(escola.SERVICO_2 || 'Conversação e Fluência'),
    SERVICO_3: esc(escola.SERVICO_3 || 'Aulas Particulares e In-Company'),
    LINK_WHATSAPP: esc(escola.LINK_WHATSAPP || '#'),
    LINK_MAPS: esc(escola.LINK_MAPS || '#'),
    MAPA_EMBED: esc(escola.MAPA_EMBED || `https://maps.google.com/maps?q=${encodeURIComponent(nome + ' ' + bairro + ' ' + cidade)}&output=embed`),
    TELEFONE: esc(escola.TELEFONE || 'WhatsApp da Escola'),
    HORARIO: esc(escola.HORARIO || 'Segunda a sexta, 8h às 20h; sábado, 8h às 13h'),
    FOTO_HERO_HTML: fotoHeroHtml,
    DEPOIMENTOS_CARDS: depoimentosHtml,
    GALERIA_CARDS: galeriaHtml,
    ANO: String(new Date().getFullYear())
  };

  let html = baseHtml.replace(/\{\{(\w+)\}\}/g, (m, key) => (key in tokens ? tokens[key] : m));
  return html;
}

/**
 * Gera fisicamente no disco a prévia completa para uma escola de idiomas
 */
function gerarPreviaParaEscola(escola, silent = false) {
  const templateKey = templatesHtml['IdiomasOficial'] ? 'IdiomasOficial' : 'IdiomasProvisorio';
  const baseHtml = templatesHtml[templateKey];

  if (!baseHtml) {
    console.error(`❌ HTML do template ${templateKey} indisponível!`);
    return { success: false, reason: `Template ${templateKey} indisponível` };
  }

  const slug = escola.SLUG;
  const targetDir = path.join(OUTPUT_DIR, slug);
  const targetCssDir = path.join(targetDir, 'css');
  const targetJsDir = path.join(targetDir, 'js');

  fs.mkdirSync(targetCssDir, { recursive: true });
  fs.mkdirSync(targetJsDir, { recursive: true });

  const html = templateKey === 'IdiomasOficial' 
    ? renderEscolaOficial(escola, baseHtml)
    : renderEscolaProvisorio(escola, baseHtml);

  // Salva o arquivo gerado
  fs.writeFileSync(path.join(targetDir, 'index.html'), html, 'utf8');

  // Grava CSS e JS do template respectivo
  const cssContent = templatesCss[templateKey] || '';
  const jsContent = templatesJs[templateKey] || '';
  fs.writeFileSync(path.join(targetCssDir, 'style.css'), cssContent, 'utf8');
  fs.writeFileSync(path.join(targetJsDir, 'main.js'), jsContent, 'utf8');

  if (!silent) {
    console.log(`✅ [IDIOMAS - OFICIAL] Prévia gerada: "${escola.NOME_CLINICA}" (${escola.SLUG})`);
  }
  return { success: true, slug, template: templateKey };
}

// Processa argumentos da linha de comando
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
Uso do Gerador de Prévias:
  node gerar-previa.js <slug-ou-ranking>       -> Gera para uma clínica ou escola específica
  node gerar-previa.js --camada-a              -> Gera todas as 10 da Camada A (clínicas)
  node gerar-previa.js --all-moderno           -> Gera todas as 64 clínicas Moderno
  node gerar-previa.js --all-profissional      -> Gera todas as 96 clínicas Profissional
  node gerar-previa.js --all-amigavel          -> Gera todas as 340 clínicas Amigável
  node gerar-previa.js --all-500               -> Gera as 500 clínicas do sistema completo
  node gerar-previa.js --all-escolas           -> Gera todas as escolas de idiomas
  node gerar-previa.js slug-1,slug-2           -> Gera vários registros de uma vez
  Acrescente --saida previews-novo para gravar em outra pasta sem substituir as atuais.
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
} else if (command === '--all-escolas') {
  console.log('🚀 INICIANDO GERAÇÃO DE TODAS AS ESCOLAS DE IDIOMAS...');
  const inicio = Date.now();
  let sucesso = 0;
  escolas.forEach(e => {
    const res = gerarPreviaParaEscola(e, true);
    if (res.success) sucesso++;
  });
  const tempoTotal = ((Date.now() - inicio) / 1000).toFixed(2);
  console.log('\n======================================================');
  console.log(`🎉 SUCESSO: ${sucesso}/${escolas.length} prévias de escolas geradas em ${tempoTotal}s!`);
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
  // Aceita um ou vários slugs/rankings separados por vírgula
  for (const id of command.split(',').map(x => x.trim()).filter(Boolean)) {
    const foundClinica = clinicas.find(c => c.SLUG === id || String(c.RANKING) === id);
    if (foundClinica) {
      gerarPreviaParaClinica(foundClinica);
      continue;
    }
    const foundEscola = escolas.find(e => e.SLUG === id || String(e.RANKING) === id);
    if (foundEscola) {
      gerarPreviaParaEscola(foundEscola);
      continue;
    }
    console.error(`❌ Nenhum registro encontrado com o identificador: "${id}"`);
  }
}
