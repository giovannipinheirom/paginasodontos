/**
 * Template Moderno - Scripts de Interatividade e Usabilidade
 */

document.addEventListener('DOMContentLoaded', () => {
  // Atualiza o ano no rodapé automaticamente
  const yearElement = document.getElementById('current-year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // Efeito de sombra e blur na barra de navegação durante a rolagem
  const header = document.querySelector('.site-header');
  if (header) window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.style.background = 'rgba(15, 17, 19, 0.96)';
      header.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.4)';
    } else {
      header.style.background = 'rgba(15, 17, 19, 0.92)';
      header.style.boxShadow = 'none';
    }
  });

  // Rolagem suave para links internos
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId && targetId !== '#') {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();
          const offsetTop = targetElement.getBoundingClientRect().top + window.pageYOffset - 80;
          window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
          });
        }
      }
    });
  });

  // Inicializa o Efeito de Surgimento Suave (Scroll Reveal)
  initScrollReveal();

  // Aplica personalizações de avaliações reais e fotos salvas no Hub
  applyCustomPreviewData();
});

function applyCustomPreviewData() {
  // Identifica o slug da clínica a partir da URL
  let slug = '';
  const pathname = decodeURIComponent(window.location.pathname.replace(/\\/g, '/'));
  const match = pathname.match(/previews\/([^/]+)/);
  if (match) {
    slug = match[1];
  } else {
    const urlParams = new URLSearchParams(window.location.search);
    slug = urlParams.get('slug') || '';
  }

  if (!slug) return;

  const raw = localStorage.getItem('odonto_custom_' + slug);
  if (!raw) return;

  try {
    const custom = JSON.parse(raw);

    // 1. Substituição das 3 Avaliações Reais
    if (custom.reviews && Array.isArray(custom.reviews)) {
      const reviewCards = document.querySelectorAll('.reviews-grid .review-card');
      custom.reviews.forEach((rev, idx) => {
        if (!rev || !reviewCards[idx]) return;

        const card = reviewCards[idx];
        const authorEl = card.querySelector('.review-author');
        const avatarEl = card.querySelector('.review-avatar');
        const starsEl = card.querySelector('.review-stars');
        const textEl = card.querySelector('.review-text');

        if (authorEl && rev.name) {
          authorEl.textContent = rev.name;
        }
        if (avatarEl && rev.name) {
          avatarEl.textContent = rev.name.trim().charAt(0).toUpperCase();
        }
        if (starsEl && rev.stars) {
          const starCount = parseInt(rev.stars, 10) || 5;
          starsEl.textContent = '★'.repeat(starCount) + '☆'.repeat(Math.max(0, 5 - starCount));
        }
        if (textEl && rev.text) {
          textEl.textContent = `"${rev.text.replace(/^"|"$/g, '').trim()}"`;
        }
      });
    }

    // 2. Substituição das Fotos da Prévia (imgs)
    if (custom.fotoHero) {
      const heroImg = document.querySelector('.hx-arch-media img');
      if (heroImg) heroImg.src = custom.fotoHero;
    }

    if (custom.fotoSobre) {
      const sobreImg = document.querySelector('.about-photo-wrap img');
      if (sobreImg) sobreImg.src = custom.fotoSobre;
    }

    if (custom.fotoTech) {
      const techImg = document.querySelector('.tech-visual-wrap img');
      if (techImg) techImg.src = custom.fotoTech;
    }

    console.log(`✨ [OdontoWebsites] Prévia personalizada carregada com sucesso para: ${slug}`);
  } catch (e) {
    console.error('Erro ao aplicar personalizações da prévia:', e);
  }
}

/**
 * Animação de Scroll de Surgimento Suave (100% das Prévias)
 */
function initScrollReveal() {
  const elements = document.querySelectorAll(
    'section:not(.hero-section):not(.hx-hero), .service-card, .review-card, .diff-card, .diff-item, .tech-card, .step-item, .step-card, .about-grid, .location-grid'
  );
  if (!elements.length) return;

  if (!('IntersectionObserver' in window)) {
    elements.forEach(el => el.classList.add('reveal-active'));
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal-active');
        obs.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -40px 0px'
  });

  elements.forEach((el, index) => {
    el.classList.add('reveal-on-scroll');
    if (el.classList.contains('service-card') || el.classList.contains('review-card') || el.classList.contains('step-item')) {
      const delay = (index % 3) * 0.12;
      el.style.transitionDelay = `${delay}s`;
    }
    observer.observe(el);
  });
}

// Topo Moderno v2: cabeçalho translúcido ao rolar e entrada suave do hero
(function () {
  var header = document.getElementById('hxHeader');
  function onScroll() {
    if (header) header.classList.toggle('hx-scrolled', window.scrollY > 24);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var items = document.querySelectorAll('.hx-reveal');
  requestAnimationFrame(function () {
    items.forEach(function (el) { el.classList.add('hx-in'); });
  });
})();
