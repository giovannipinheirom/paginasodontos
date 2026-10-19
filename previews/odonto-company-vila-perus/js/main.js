/**
 * Template Amigável - Scripts de Interatividade, FAQ Accordion, Scroll Reveal & Personalização
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Atualiza o ano no rodapé automaticamente
  const yearElement = document.getElementById('current-year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // 2. Sombra e blur no cabeçalho durante a rolagem
  const header = document.querySelector('.ami-header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        header.style.backgroundColor = 'rgba(250, 247, 242, 0.98)';
        header.style.boxShadow = '0 8px 24px rgba(28, 24, 21, 0.08)';
      } else {
        header.style.backgroundColor = 'rgba(250, 247, 242, 0.95)';
        header.style.boxShadow = 'none';
      }
    });
  }

  // 3. Rolagem suave para links internos
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

  // 4. Accordion Interativo de Dúvidas Frequentes (FAQ)
  initFaqAccordion();

  // 5. Inicializa o Scroll Reveal Suave (100% das Prévias)
  initScrollReveal();

  // 6. Aplica personalizações de avaliações reais e fotos salvas no Hub
  applyCustomPreviewData();
});

/**
 * Accordion Interativo de Dúvidas Frequentes
 */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    const toggleIcon = item.querySelector('.faq-toggle-icon');
    if (!questionBtn) return;

    questionBtn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Fecha os outros itens para manter limpo
      faqItems.forEach(other => {
        if (other !== item) {
          other.classList.remove('active');
          const otherIcon = other.querySelector('.faq-toggle-icon');
          if (otherIcon) otherIcon.textContent = '+';
          const otherBtn = other.querySelector('.faq-question');
          if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
        }
      });

      // Alterna o estado do item clicado
      if (isActive) {
        item.classList.remove('active');
        if (toggleIcon) toggleIcon.textContent = '+';
        questionBtn.setAttribute('aria-expanded', 'false');
      } else {
        item.classList.add('active');
        if (toggleIcon) toggleIcon.textContent = '−';
        questionBtn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/**
 * Animação de Scroll de Surgimento Suave (IntersectionObserver)
 */
function initScrollReveal() {
  const elements = document.querySelectorAll(
    '.ami-section, .hero-content, .hero-media, .hero-stats-bar, .service-card, .review-card, .step-card, .smile-card, .space-item, .faq-item'
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
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  elements.forEach((el, index) => {
    el.classList.add('reveal-on-scroll');
    // Stagger para cards de serviços e passos
    if (el.classList.contains('service-card') || el.classList.contains('step-card') || el.classList.contains('review-card')) {
      const delay = (index % 3) * 0.12;
      el.style.transitionDelay = `${delay}s`;
    }
    observer.observe(el);
  });
}

/**
 * Injeção Dinâmica das Avaliações e Fotos Salvas pelo Usuário no Hub
 */
function applyCustomPreviewData() {
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

    // 1. Substituição das 3 Avaliações Reais do Google
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
      const heroImg = document.querySelector('.hero-arch-inner img, .custom-img-hero');
      if (heroImg) heroImg.src = custom.fotoHero;
    }

    if (custom.fotoSobre) {
      const sobreImg = document.querySelector('.about-photo-wrap img, .custom-img-sobre');
      if (sobreImg) sobreImg.src = custom.fotoSobre;
    }

    if (custom.fotoTech) {
      const techImg = document.querySelector('.tech-visual-wrap img, .custom-img-tech');
      if (techImg) techImg.src = custom.fotoTech;
    }

    console.log(`✨ [OdontoWebsites] Prévia personalizada (Amigável) carregada para: ${slug}`);
  } catch (e) {
    console.error('Erro ao aplicar personalizações da prévia:', e);
  }
}
