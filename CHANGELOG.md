# CHANGELOG - Expansão Multinichel (Odonto + Escolas de Idiomas)

Todas as alterações deste projeto visam manter 100% da estabilidade do nicho odontológico existente enquanto adicionam suporte nativo a escolas de idiomas e novos nichos.

---

## [2.2.0] - 28/10/2026

### Adicionado
- **Template Oficial de Idiomas (`templates/idiomas/oficial/`)**:
  - Implementado o modelo definitivo baseado no design de `C:\Users\administrator.INOVACOMVALOR\Desktop\site-escola-de-ingles`.
  - Design premium com paleta Navy & Crimson, fontes Google (Inter, Plus Jakarta Sans e Instrument Serif), brasão heráldico com monograma tipográfico dinâmico (ex: `II`, `SP`, `FL`), e marquee banner na base do Hero.
  - Componentes completos: Header com badge Google, Hero com moldura em arco para foto real da escola, Barra de Estatísticas (StatsBar), Jornadas Personalizadas (tabs interativas), Grade Curricular e Níveis (A1 a C1), Diferenciais pedagógicos ("Por que a Escola"), Seção de Depoimentos Reais do Google Maps, Galeria de Fotos, FAQ Accordion interativo, CTA Final com agendamento de aula experimental no WhatsApp e Iframe de mapa.
  - Botão flutuante do WhatsApp com beacon pulsante.
  - Definido como `templatePadrao: 'oficial'` em `nichos.config.js`.
- **Suporte Nativo a Cidades da Grande SP (São Bernardo do Campo / SBC)**:
  - Detecção dinâmica de município: escolas de SBC exibem explicitamente "São Bernardo do Campo" no Hero, títulos, endereços, rodapé e cards do Hub.
  - Todas as 36 escolas (São Paulo capital + São Bernardo do Campo) regeradas com o template oficial.
  - Regravação dos vídeos Raio-X com o novo design para as principais escolas de SP e SBC (`intellecti`, `spedine`).

---

## [2.1.0] - 28/10/2026

### Adicionado
- **Integração de Avaliações Reais do Google para Escolas**:
  - `importar-apify.mjs` agora extrai automaticamente a lista completa de avaliações reais (`reviews`) trazidas pelo Apify.
  - Salva em `escolas-import.json`, `js/escolas-data.js` e `js/escolas-extra.js` até 3 avaliações com texto completo, nome do autor, foto de perfil do Google, pontuação em estrelas e data relativa.
  - Seção `#avaliacoes` elegante em `templates/idiomas/provisorio/` com cartões de depoimentos reais, avatares e selo verificado do Google.
  - Regra de ouro: se uma escola não possuir avaliações em texto, a seção é ocultada automaticamente, sem inventar nenhum dado.
- **Integração de Fotos Reais do Google Places**:
  - Extração de `imageUrl` (foto da fachada/ambiente) e `imageUrls` (galeria complementar).
  - O template de idiomas exibe a foto real da escola na coluna visual da seção "Sobre a Escola", ao lado do mapa interativo.
- **Vídeo Raio-X com Rolagem de Prova Social Real**:
  - A rolagem nos vídeos de 20s (`gerar-raiox.mjs`) agora captura a foto real da escola e os depoimentos autênticos dos alunos antes do clique no WhatsApp.
- **Badges de Prova Social no Hub**:
  - Os cards da lista e do Kanban no Hub agora indicam com badge verde quando a escola possui fotos e depoimentos reais carregados.

---

## [2.0.0] - 28/10/2026

### Adicionado
- **Configuração Centralizada (`nichos.config.js`)**:
  - Arquivo único de configuração de nichos compatível tanto com Node.js (via `globalThis`) quanto com o navegador/Hub (via `<script>`).
  - Mapeamento completo dos nichos `odonto` e `idiomas` (termos, caminhos de dados, templates padrão, regras de publicidade e cartões finais de vídeo).
- **Importador do Apify (`importar-apify.mjs`)**:
  - Leitor com detecção dinâmica de colunas para planilhas e datasets JSON/CSV do Google Maps Scraper do Apify.
  - Filtros automáticos: São Paulo, estabelecimentos abertos, sem website, com telefone, nota mínima de 4,5 e pelo menos 5 avaliações.
  - Exclusão configurável de franquias/redes conhecidas (Wizard, CNA, Fisk, etc.).
  - Algoritmo de ranqueamento ponderado (+3 nota >= 4,9; +3 avaliações 10–150; +2 celular/WhatsApp; +1 fotos >= 5; +1 nome de escola pequena).
  - Algoritmo anti-colisão de SLUG: garante que nenhuma escola de idiomas sobrescreva slugs existentes de clínicas ou outras escolas.
  - Geração automática de `escolas-import.json`, `js/escolas-data.js` (`ESCOLAS_DATA`) e `js/escolas-extra.js` (`ESCOLAS_EXTRA`).
- **Template Provisório de Idiomas (`templates/idiomas/provisorio/`)**:
  - Layout limpo, responsivo, mobile-first e neutro (`index.html`, `css/style.css`, `js/main.js`).
  - Marcações estruturais para robôs de vídeo: `data-video="hero"`, `data-video="servicos"`, `data-video="sobre"`, `data-video="cta"` e `data-video="whatsapp"`.
  - Conformidade estrita: sem promessas absurdas de fluência, tag `noindex, nofollow`, botões dinâmicos de WhatsApp direto.
- **Documentação de Novos Templates (`templates/idiomas/README.md`)**:
  - Manual para criação e homologação de novos templates de idiomas no futuro.
- **Seletor de Nicho Ativo no Hub (`index.html` e `js/dashboard.js`)**:
  - Alternador visual no topo: `[ 🦷 Odonto | 🎓 Idiomas | 🌐 Todos ]`.
  - Persistência da seleção em `localStorage` na chave `hub_nicho_ativo` (padrão: `odonto`).
  - Badges visuais em todos os cards da lista e colunas do Kanban (`🦷 Odonto` / `🎓 Idiomas`).
  - Cockpit de abordagem com cópias sob medida para escolas (sem termos de CFO/odonto, sem emojis, foco em pesquisa local no bairro).
- **Suporte Multinichel nos Scripts de Vídeo e Print**:
  - `tirar-print.mjs`: suporte a `--nicho` e busca unificada de IDs.
  - `gerar-raiox.mjs`: legendas da cena 1 e cartão final dinâmicos por nicho ("WhatsApp da recepção" vs "WhatsApp da escola").
  - `videos-sync.mjs`: sincronização unificada de vídeos de clínicas e escolas.

### Modificado
- `gerar-previa.js`:
  - Identifica automaticamente se o ID informado pertence a uma clínica ou escola.
  - Adicionado comando `--all-escolas` para geração em lote de todas as prévias de escolas.
- `js/dashboard.js`:
  - Funções de busca e contadores agora consultam dinamicamente `getFullDataset()` e `findEntityById()`.
  - Preserva 100% dos estágios do Kanban existentes (`odonto_kanban_stages`).
- `INSTRUCOES-CLAUDE-VIDEOS.md`:
  - Atualizado com o passo a passo completo para os dois nichos.
