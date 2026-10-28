// Template Oficial de Idiomas - Interações Vanilla JS
(function() {
  'use strict';

  // 1. Header Scrolled state
  const header = document.querySelector('header');
  const brandName = document.getElementById('headerBrandName');
  const navLinks = header ? header.querySelectorAll('nav a') : [];
  const shieldPath = header ? header.querySelector('svg path[fill]') : null;
  const monogram = header ? header.querySelector('span.font-display.text-\\[13px\\]') : null;

  function updateHeader() {
    if (!header) return;
    if (window.scrollY > 24) {
      header.classList.add('bg-white/95', 'shadow-sm', 'backdrop-blur-md', 'border-slate-200/70');
      header.classList.remove('bg-transparent', 'border-transparent');
      if (brandName) {
        brandName.classList.add('text-navy-900');
        brandName.classList.remove('text-white');
      }
      if (monogram) {
        monogram.classList.add('text-white');
        monogram.classList.remove('text-navy-900');
      }
      if (shieldPath) {
        shieldPath.setAttribute('fill', '#0B1F4B');
      }
      navLinks.forEach(function(a) {
        a.classList.add('text-slate-600', 'hover:text-navy-900');
        a.classList.remove('text-white/75', 'hover:text-white');
      });
    } else {
      header.classList.remove('bg-white/95', 'shadow-sm', 'backdrop-blur-md', 'border-slate-200/70');
      header.classList.add('bg-transparent', 'border-transparent');
      if (brandName) {
        brandName.classList.add('text-white');
        brandName.classList.remove('text-navy-900');
      }
      if (monogram) {
        monogram.classList.add('text-navy-900');
        monogram.classList.remove('text-white');
      }
      if (shieldPath) {
        shieldPath.setAttribute('fill', '#fff');
      }
      navLinks.forEach(function(a) {
        a.classList.remove('text-slate-600', 'hover:text-navy-900');
        a.classList.add('text-white/75', 'hover:text-white');
      });
    }
  }

  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  // 2. Menu Mobile Toggle
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', function() {
      const isHidden = mobileMenu.classList.contains('hidden');
      if (isHidden) {
        mobileMenu.classList.remove('hidden');
        mobileToggle.setAttribute('aria-expanded', 'true');
      } else {
        mobileMenu.classList.add('hidden');
        mobileToggle.setAttribute('aria-expanded', 'false');
      }
    });

    mobileMenu.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', function() {
        mobileMenu.classList.add('hidden');
        mobileToggle.setAttribute('aria-expanded', 'false');
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
      const isOpen = content && !content.classList.contains('hidden');

      document.querySelectorAll('[data-accordion-item]').forEach(function(item) {
        if (item !== parent) {
          const c = item.querySelector('[data-accordion-content]');
          const ic = item.querySelector('[data-accordion-icon]');
          if (c) c.classList.add('hidden');
          if (ic) ic.style.transform = 'rotate(0deg)';
        }
      });

      if (isOpen) {
        if (content) content.classList.add('hidden');
        if (icon) icon.style.transform = 'rotate(0deg)';
      } else {
        if (content) content.classList.remove('hidden');
        if (icon) icon.style.transform = 'rotate(180deg)';
      }
    });
  });

  // 4. Seletor de Perfis (Tabs)
  const tabKids = document.getElementById('tab-kids');
  const tabMe = document.getElementById('tab-me');
  const tabCompany = document.getElementById('tab-company');
  const tabs = [tabKids, tabMe, tabCompany].filter(Boolean);

  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      tabs.forEach(function(t) {
        t.setAttribute('aria-selected', 'false');
        t.classList.remove('border-navy-900', 'bg-white', 'shadow-lift');
        t.classList.add('border-transparent', 'bg-white/60');
      });
      tab.setAttribute('aria-selected', 'true');
      tab.classList.add('border-navy-900', 'bg-white', 'shadow-lift');
      tab.classList.remove('border-transparent', 'bg-white/60');
    });
  });

  // 5. Smooth scroll para âncoras internas
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || !targetId) return;
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

})();
