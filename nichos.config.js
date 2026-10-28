/**
 * nichos.config.js - Configuração Central dos Nichos do Hub
 * Usado tanto pelos scripts Node.js quanto pelo Hub (index.html).
 */
(function(root) {
  const NICHOS_CONFIG = {
    odonto: {
      id: 'odonto',
      rotulo: 'Clínicas odontológicas',
      icone: '🦷',
      arquivoImport: 'clinicas-import.json',
      arquivoDadosJs: 'js/clinicas-data.js',
      arquivoExtraJs: 'js/clinicas-extra.js',
      pastaTemplates: 'templates/',
      templatePadrao: 'moderno',
      termos: {
        cliente: 'paciente',
        quemAtende: 'recepção',
        profissional: 'Dr(a).'
      },
      cartaoFinalVideo: 'Um clique para o WhatsApp da recepção',
      regrasPublicidade: 'CFO (Código de Ética Odontológica)',
      buscaGoogle: 'dentista em [bairro]',
      legendaGoogleHoje: 'Como a clínica aparece hoje no Google'
    },
    idiomas: {
      id: 'idiomas',
      rotulo: 'Escolas de idiomas',
      icone: '🎓',
      arquivoImport: 'escolas-import.json',
      arquivoDadosJs: 'js/escolas-data.js',
      arquivoExtraJs: 'js/escolas-extra.js',
      pastaTemplates: 'templates/idiomas/',
      templatePadrao: 'oficial',
      termos: {
        cliente: 'aluno',
        quemAtende: 'secretaria',
        profissional: 'professor(a) / coordenação'
      },
      cartaoFinalVideo: 'Um clique para o WhatsApp da escola',
      regrasPublicidade: 'nenhuma regra de conselho, mas nada de promessa de resultado ("fluente em 3 meses")',
      buscaGoogle: 'escola de inglês em [bairro]',
      legendaGoogleHoje: 'Como a escola aparece hoje no Google'
    }
  };

  function getNicho(idOrNicho) {
    if (!idOrNicho) return NICHOS_CONFIG.odonto;
    const key = String(idOrNicho).toLowerCase().trim();
    if (key === 'idioma' || key === 'idiomas' || key === 'escola' || key === 'escolas') {
      return NICHOS_CONFIG.idiomas;
    }
    return NICHOS_CONFIG.odonto;
  }

  function listarNichos() {
    return [NICHOS_CONFIG.odonto, NICHOS_CONFIG.idiomas];
  }

  // Exportação para Navegador (window) e Node.js (globalThis)
  root.NICHOS_CONFIG = NICHOS_CONFIG;
  root.getNicho = getNicho;
  root.listarNichos = listarNichos;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NICHOS_CONFIG, getNicho, listarNichos };
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
