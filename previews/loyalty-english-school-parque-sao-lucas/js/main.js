// Template Oficial de Idiomas - Interações Vanilla JS
(function() {
  'use strict';

  // 1. Header Scrolled state
  const header = document.querySelector('header');
  if (header) {
    window.addEventListener('scroll', function() {
      if (window.scrollY > 24) {
        header.classList.add('bg-white/95', 'shadow-sm', 'backdrop-blur-md');
        header.classList.remove('bg-transparent');
      } else {
        header.classList.remove('bg-white/95', 'shadow-sm', 'backdrop-blur-md');
        header.classList.add('bg-transparent');
      }
    }, { passive: true });
  }

  // 2. Menu Mobile Toggle
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', function() {
      const isHidden = mobileMenu.classList.contains('hidden');
      if (isHidden) {
        mobileMenu.classList.remove('hidden');
      } else {
        mobileMenu.classList.add('hidden');
      }
    });

    mobileMenu.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', function() {
        mobileMenu.classList.add('hidden');
      });
    });
  }

  // 3. Accordion FAQ
  document.querySelectorAll('[data-accordion-trigger]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const parent = btn.closest('[data-accordion-item]');
      if (!parent) return;
      const content = parent.querySelector('[data-accordion-content]');
      const icon = parent.querySelector('[data-accordion-icon]');
      const isOpen = !content.classList.contains('hidden');

      // Fecha outros itens do accordion
      document.querySelectorAll('[data-accordion-item]').forEach(function(item) {
        if (item !== parent) {
          const c = item.querySelector('[data-accordion-content]');
          const ic = item.querySelector('[data-accordion-icon]');
          if (c) c.classList.add('hidden');
          if (ic) ic.style.transform = 'rotate(0deg)';
        }
      });

      if (isOpen) {
        content.classList.add('hidden');
        if (icon) icon.style.transform = 'rotate(0deg)';
      } else {
        content.classList.remove('hidden');
        if (icon) icon.style.transform = 'rotate(180deg)';
      }
    });
  });

  // 4. Seletor de Perfis (Jornadas Personalizadas)
  const profileBtns = document.querySelectorAll('[data-profile-btn]');
  const profileCards = document.querySelectorAll('[data-profile-card]');
  if (profileBtns.length > 0 && profileCards.length > 0) {
    profileBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        const targetId = btn.getAttribute('data-profile-btn');

        // Atualiza estilo dos botões
        profileBtns.forEach(function(b) {
          b.classList.remove('bg-navy-900', 'text-white', 'shadow-md');
          b.classList.add('bg-white', 'text-slate-700', 'hover:bg-slate-50');
        });
        btn.classList.add('bg-navy-900', 'text-white', 'shadow-md');
        btn.classList.remove('bg-white', 'text-slate-700', 'hover:bg-slate-50');

        // Mostra o card correto
        profileCards.forEach(function(card) {
          if (card.getAttribute('data-profile-card') === targetId) {
            card.classList.remove('hidden');
          } else {
            card.classList.add('hidden');
          }
        });
      });
    });
  }

  // 5. Smooth scroll para âncoras internas
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || !targetId) return;
      const targetElem = document.querySelector(targetId);
      if (targetElem) {
        e.preventDefault();
        targetElem.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
})();
