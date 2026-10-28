/**
 * Template Provisório - Escolas de Idiomas
 */
document.addEventListener('DOMContentLoaded', () => {
  // Efeito suave de revelação em rolagem
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal-active');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.curso-card, .sobre-text, .mapa-wrapper, .cta-box').forEach(el => {
    el.classList.add('reveal-on-scroll');
    observer.observe(el);
  });
});
