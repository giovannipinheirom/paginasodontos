import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('🧪 Iniciando Testes End-to-End dos 3 Templates e Hub...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASSOU: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FALHOU: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Teste do Hub (Dashboard)
    const hubUrl = 'file:///' + path.join(__dirname, 'index.html').replace(/\\/g, '/');
    await page.goto(hubUrl);

    // Login com PIN
    const pinInput = page.locator('#pinInput');
    if (await pinInput.isVisible()) {
      await pinInput.fill('odonto2026');
      await page.click('#pinBtn');
    }

    await page.waitForSelector('#clinicsGrid', { timeout: 5000 });
    const clinicCards = await page.locator('.clinic-card').count();
    assert(clinicCards > 0, `Hub carregou com sucesso exibindo ${clinicCards} clínicas.`);

    // 2. Teste do Template Profissional (Yassuda Odontologia - Ranking #1)
    const profUrl = 'file:///' + path.join(__dirname, 'previews', 'yassuda-odontologia-guaianases', 'index.html').replace(/\\/g, '/');
    await page.goto(profUrl);
    await page.waitForLoadState('domcontentloaded');

    const profTitle = await page.title();
    assert(profTitle.includes('Yassuda Odontologia'), `Profissional: Título correto ("${profTitle}")`);

    const profHeroHeading = await page.locator('.hero-title').textContent();
    assert(profHeroHeading.includes('Guaianases'), `Profissional: Heading personalizado presente ("${profHeroHeading.trim().replace(/\s+/g, ' ')}")`);

    const profChecklistCount = await page.locator('.specialist-checklist li').count();
    assert(profChecklistCount >= 4, `Profissional: Checklist do especialista tem ${profChecklistCount} itens`);

    const profSpecsCount = await page.locator('.spec-card').count();
    assert(profSpecsCount === 8, `Profissional: Grade tem exatamente 8 especialidades cirúrgicas`);

    const profReviewsCount = await page.locator('.reviews-grid .review-card').count();
    assert(profReviewsCount === 3, `Profissional: 3 avaliações Google presentes`);

    // 3. Teste do Template Amigável (Pires Odontologia Integrada - Ranking #4)
    const amiUrl = 'file:///' + path.join(__dirname, 'previews', 'pires-odontologia-integrada-sao-mateus', 'index.html').replace(/\\/g, '/');
    await page.goto(amiUrl);
    await page.waitForLoadState('domcontentloaded');

    const amiTitle = await page.title();
    assert(amiTitle.includes('Pires Odontologia Integrada'), `Amigável: Título correto ("${amiTitle}")`);

    const amiHeroHeading = await page.locator('.hero-title').textContent();
    assert(amiHeroHeading.includes('São Mateus'), `Amigável: Heading personalizado presente ("${amiHeroHeading.trim().replace(/\s+/g, ' ')}")`);

    const amiStatsCount = await page.locator('.stat-item').count();
    assert(amiStatsCount === 4, `Amigável: 4 métricas de confiança no hero`);

    const amiServicesCount = await page.locator('.service-card').count();
    assert(amiServicesCount === 6, `Amigável: 6 cards de serviços familiares`);

    // Teste de interação no FAQ Accordion
    const firstFaq = page.locator('.faq-item').first();
    const secondFaq = page.locator('.faq-item').nth(1);
    await secondFaq.locator('.faq-question').click();
    const isSecondActive = await secondFaq.evaluate(el => el.classList.contains('active'));
    assert(isSecondActive, 'Amigável: FAQ accordion abre ao clicar');

    // 4. Teste do Template Moderno (Belo Sorriso)
    const modUrl = 'file:///' + path.join(__dirname, 'previews', 'belo-sorriso-odontologia-vila-albano', 'index.html').replace(/\\/g, '/');
    await page.goto(modUrl);
    await page.waitForLoadState('domcontentloaded');

    const modTitle = await page.title();
    assert(modTitle.includes('Belo Sorriso Odontologia'), `Moderno: Título correto ("${modTitle}")`);

    // 5. Teste de Scroll Reveal Animation
    const revealElements = await page.locator('.reveal-on-scroll').count();
    assert(revealElements > 0, `Scroll Reveal: ${revealElements} elementos monitorados pelo IntersectionObserver`);

    // 6. Teste de Injeção Dinâmica de Avaliações e Fotos (Personalizador)
    await page.evaluate(() => {
      localStorage.setItem('odonto_custom_belo-sorriso-odontologia-vila-albano', JSON.stringify({
        reviews: [
          { name: 'Dr. Roberto Santos', stars: '5', text: 'Depoimento personalizado via teste automatizado E2E!' },
          { name: 'Fernanda Lima', stars: '5', text: 'Segunda avaliação personalizada!' },
          { name: 'Lucas Prado', stars: '4', text: 'Terceira avaliação personalizada!' }
        ]
      }));
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const updatedReviewAuthor = await page.locator('.review-author').first().textContent();
    assert(updatedReviewAuthor === 'Dr. Roberto Santos', `Personalizador: Nome atualizado para "${updatedReviewAuthor}"`);

    const updatedReviewText = await page.locator('.review-text').first().textContent();
    assert(updatedReviewText.includes('Depoimento personalizado via teste automatizado'), 'Personalizador: Texto da avaliação injetado com sucesso');

  } catch (err) {
    console.error('❌ Erro no teste:', err);
    failed++;
  } finally {
    await browser.close();
    console.log(`\n🏁 Resultado Final dos Testes: ${passed} passaram, ${failed} falharam.`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
