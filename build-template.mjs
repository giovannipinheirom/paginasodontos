import fs from 'node:fs';
import path from 'node:path';

const srcHtmlPath = 'C:/Users/administrator.INOVACOMVALOR/Desktop/site-escola-de-ingles/.next/server/app/index.html';
const rawHtml = fs.readFileSync(srcHtmlPath, 'utf8');

// 1. Extrai o conteúdo entre o início do header e o fim do footer
const headerIndex = rawHtml.indexOf('<header');
const footerEndIndex = rawHtml.indexOf('</footer>') + 9;
const floatingEndIndex = rawHtml.indexOf('</div></div><script', footerEndIndex) + 12;

let bodyContent = rawHtml.substring(headerIndex, floatingEndIndex);

// 2. Remove todos os estilos iniciais de Framer Motion (opacity:0 e translateY)
bodyContent = bodyContent.replace(/style="opacity:0[^"]*"/g, '');
bodyContent = bodyContent.replace(/style="[^"]*opacity:0[^"]*"/g, '');

// 3. Ajusta o Header para comportamento transparente no topo
bodyContent = bodyContent.replace(/aria-label="Progress Idiomas — página inicial" href="\/"/g, 'href="#topo" id="headerLogoLink"');
bodyContent = bodyContent.replace(
  '<span class="font-display text-[17px] font-extrabold tracking-tight transition-colors text-white">Progress Idiomas</span>',
  '<span class="font-display text-[17px] font-extrabold tracking-tight transition-colors text-white" id="headerBrandName">{{NOME_CLINICA}}</span>'
);

// Links de navegação interna
bodyContent = bodyContent.replace(/href="\/cursos"/g, 'href="#grade"');
bodyContent = bodyContent.replace(/href="\/na-escola"/g, 'href="#galeria"');
bodyContent = bodyContent.replace(/href="\/aulas-corporativas"/g, 'href="#grade"');
bodyContent = bodyContent.replace(/href="\/metodologia"/g, 'href="#porque"');
bodyContent = bodyContent.replace(/href="\/sobre"/g, 'href="#porque"');
bodyContent = bodyContent.replace(/href="\/teste-de-nivel"/g, 'href="#grade"');
bodyContent = bodyContent.replace(/href="\/contato"/g, 'href="#cta-final"');

// Botão do header para WhatsApp
bodyContent = bodyContent.replace(
  /href="https:\/\/wa\.me\/5500000000000\?text=[^"]*"/g,
  'href="{{LINK_WHATSAPP}}" data-action="whatsapp"'
);

// Adiciona ID ao botão mobile hamburger
bodyContent = bodyContent.replace(
  'aria-controls="mobile-menu" aria-label="Abrir menu"',
  'aria-controls="mobile-menu" aria-label="Abrir menu" id="mobileMenuToggle"'
);

// 4. Substitui placeholders de dados centrais
bodyContent = bodyContent.replace(/Progress Idiomas/g, '{{NOME_CLINICA}}');
bodyContent = bodyContent.replace(/PROGRESS IDIOMAS/g, '{{NOME_MAIUSCULO}}');
bodyContent = bodyContent.replace(/Progress/g, '{{SHORT_NAME}}');
bodyContent = bodyContent.replace(/>PI</g, '>{{MONOGRAM}}<');
bodyContent = bodyContent.replace(/English School/g, '{{LOGO_TAGLINE}}');
bodyContent = bodyContent.replace(/\[CIDADE\]/g, '{{CIDADE}}');
bodyContent = bodyContent.replace(/\[BAIRRO\]/g, '{{BAIRRO}}');
bodyContent = bodyContent.replace(/\[NOTA\]/g, '{{NOTA}}');
bodyContent = bodyContent.replace(/\[Nº\]/g, '{{AVALIACOES}}');

// Ajusta o badge flutuante "Turmas reduzidas" na Hero para não ficar "[AVALIACOES] alunos"
bodyContent = bodyContent.replace('Até {{AVALIACOES}} alunos por sala', 'Até 8 alunos por sala');

// 5. Marcação do Hero para vídeos e correção da tag <section>
bodyContent = bodyContent.replace(
  '<section class="relative isolate overflow-hidden bg-navy-950 text-white">',
  '<section class="relative isolate overflow-hidden bg-navy-950 text-white" data-video="hero">'
);
bodyContent = bodyContent.replace(
  'class="mt-10 flex flex-wrap gap-3"',
  'class="mt-10 flex flex-wrap gap-3" data-video="cta"'
);

// 6. Substitui a moldura interna da foto do Hero mantendo a moldura externa em arco
const archOuterStart = bodyContent.indexOf('<div class="relative rounded-t-[999px]');
if (archOuterStart !== -1) {
  const archInnerStart = bodyContent.indexOf('<div role="img"', archOuterStart);
  const badgeStart = bodyContent.indexOf('<div class="absolute -left-4', archOuterStart);
  if (archInnerStart !== -1 && badgeStart !== -1) {
    const toReplace = bodyContent.substring(archInnerStart, badgeStart);
    bodyContent = bodyContent.replace(toReplace, '{{FOTO_HERO_CONTEUDO}}</div>');
  }
}

// 7. Substitui a seção de Depoimentos por {{SECAO_DEPOIMENTOS_HTML}}
const depStart = bodyContent.indexOf('aria-labelledby="depoimentos"');
if (depStart !== -1) {
  const secStart = bodyContent.lastIndexOf('<section', depStart);
  const secEnd = bodyContent.indexOf('</section>', depStart) + 10;
  const depSection = bodyContent.substring(secStart, secEnd);
  bodyContent = bodyContent.replace(depSection, '{{SECAO_DEPOIMENTOS_HTML}}');
}

// 8. Substitui a seção de Galeria por {{SECAO_GALERIA_HTML}}
const galStart = bodyContent.indexOf('aria-labelledby="galeria"');
if (galStart !== -1) {
  const secStart = bodyContent.lastIndexOf('<section', galStart);
  const secEnd = bodyContent.indexOf('</section>', galStart) + 10;
  const galSection = bodyContent.substring(secStart, secEnd);
  bodyContent = bodyContent.replace(galSection, '{{SECAO_GALERIA_HTML}}');
}

// 9. Substitui o placeholder de mapa por iframe com {{MAPA_EMBED}}
const searchMap = '<div class="relative overflow-hidden rounded-2.5xl border border-slate-200 bg-white shadow-card h-[420px]">';
const mapIdx = bodyContent.indexOf(searchMap);
if (mapIdx !== -1) {
  const innerStart = bodyContent.indexOf('<div class="bg-grain flex h-full', mapIdx);
  const innerEnd = bodyContent.indexOf('</div><div class="absolute inset-x-3', innerStart);
  if (innerStart !== -1 && innerEnd !== -1) {
    const innerHtml = bodyContent.substring(innerStart, innerEnd + 6);
    bodyContent = bodyContent.replace(innerHtml, '<iframe src="{{MAPA_EMBED}}" class="h-full w-full border-0" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>');
  }
}

// 10. Substitui dados do footer
bodyContent = bodyContent.replace(/\[RUA E NÚMERO\]/g, '{{ENDERECO}}');
bodyContent = bodyContent.replace(/\[E-MAIL\]/g, 'contato@{{SLUG}}.com.br');
bodyContent = bodyContent.replace(/\[HORÁRIO\]/g, '{{HORARIO}}');
bodyContent = bodyContent.replace(/\[ANO\]/g, '{{ANO}}');

// Adiciona o menu mobile logo após o </header>
const mobileMenuHtml = `
<div id="mobileMenu" class="hidden xl:hidden fixed inset-x-0 top-[var(--header-h)] z-40 bg-navy-950/95 border-b border-white/10 px-6 py-6 backdrop-blur-xl shadow-2xl">
  <nav class="flex flex-col gap-4 text-base font-semibold text-white/90">
    <a href="#grade" class="py-1 hover:text-crimson-400">Cursos &amp; Turmas</a>
    <a href="#porque" class="py-1 hover:text-crimson-400">Diferenciais</a>
    <a href="#depoimentos" class="py-1 hover:text-crimson-400">Depoimentos</a>
    <a href="#galeria" class="py-1 hover:text-crimson-400">Estrutura</a>
    <a href="#faq" class="py-1 hover:text-crimson-400">Dúvidas</a>
    <a href="#cta-final" class="py-1 hover:text-crimson-400">Localização</a>
    <div class="pt-4 border-t border-white/10">
      <a href="{{LINK_WHATSAPP}}" data-action="whatsapp" target="_blank" rel="noopener noreferrer" class="inline-flex w-full items-center justify-center gap-2 rounded-full bg-crimson-500 px-5 py-3 font-bold text-white shadow-lift hover:bg-crimson-600">
        Agendar aula experimental
      </a>
    </div>
  </nav>
</div>
`;
bodyContent = bodyContent.replace('</header>', '</header>' + mobileMenuHtml);

// 11. Monta o HTML final com as tags <head> corretas
const finalHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>{{NOME_CLINICA}} | Escola de Idiomas em {{CIDADE}}</title>
  <meta name="description" content="{{SUBTITULO}}"/>
  <meta name="robots" content="noindex, nofollow"/>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css"/>
</head>
<body class="bg-paper font-sans text-ink antialiased">
${bodyContent}
  <script src="js/main.js"></script>
</body>
</html>`;

const outPath = 'templates/idiomas/oficial/index.html';
fs.writeFileSync(outPath, finalHtml, 'utf8');
console.log('✅ Template gravado em:', outPath, 'Tamanho:', finalHtml.length);
