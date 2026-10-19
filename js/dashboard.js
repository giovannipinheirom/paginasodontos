/**
 * OdontoWebsites Hub - Sistema Integrado de Gestão de Vendas & CRM
 * Pipeline de 30 Dias para Clínicas Odontológicas em São Paulo
 * Meta: R$ 20.000 em Caixa + R$ 6.940 em MRR (21 dias úteis · 26 abordagens/dia)
 */

const MASTER_PIN = "odonto2026"; // Senha mestra de acesso restrito

// Vídeos desktop 1920x1080 gerados (carregados dinamicamente de js/videos-list.js com fallback)
const VIDEOS_GERADOS_INICIAIS = (typeof window !== "undefined" && Array.isArray(window.VIDEOS_GERADOS))
  ? window.VIDEOS_GERADOS
  : [
      "belo-sorriso-odontologia-vila-albano",
      "sq-mais-odontologia-e-vila-cordeiro",
      "m-v-odontologia-e-estetica-jardim-reimberg"
    ];

// As 9 etapas oficiais do funil de abordagem odontológico (Seção 6)
const KANBAN_STAGES = [
  { key: "novo", title: "📋 A Contatar", color: "#64748b" },
  { key: "recepcao_contatada", title: "📞 Recepção Contatada", color: "#f59e0b" },
  { key: "falando_dentista", title: "💬 Falando com Dentista", color: "#38bdf8" },
  { key: "pergunta_enviada", title: "❓ Pergunta Enviada", color: "#818cf8" },
  { key: "video_oferecido", title: "🎬 Vídeo Oferecido", color: "#a855f7" },
  { key: "previa_enviada", title: "🚀 Prévia Enviada", color: "#fb923c" },
  { key: "ligacao_marcada", title: "📅 Ligação Marcada", color: "#c084fc" },
  { key: "fechado", title: "🟢 Fechado", color: "#10b981" },
  { key: "encerrado", title: "⚪ Encerrado", color: "#475569" }
];

let currentFilteredList = [];
let displayedCount = 24;
const PAGE_SIZE = 24;
let currentFilter = "todos";
let searchQuery = "";
let currentActiveView = "list"; // 'list' ou 'kanban'
let currentDrawerClinicId = null;
let currentCustomClinicId = null;
let draggedClinicId = null;

// --- INICIALIZAÇÃO DO SISTEMA ---
document.addEventListener("DOMContentLoaded", () => {
  initAuth();
  syncGeneratedState();
  initSavedStages();
  renderKPIs();
  updateTodayPriorityWidget();
  applyFilters();
  setupFilters();
  setupSearch();
  restoreSavedView();
});

// Sincroniza status das prévias (todas as 500 clínicas dos 3 templates liberadas)
function syncGeneratedState() {
  CLINICAS_DATA.forEach(c => {
    c.status = "pronta";
  });
}

// Helper para detecção dinâmica de vídeos gerados
function getGeneratedVideosList() {
  const manifest = (typeof window !== "undefined" && Array.isArray(window.VIDEOS_GERADOS)) 
    ? window.VIDEOS_GERADOS 
    : [];
  return Array.from(new Set([...VIDEOS_GERADOS_INICIAIS, ...manifest]));
}

function hasClinicVideo(clinicId) {
  return getGeneratedVideosList().includes(clinicId);
}

// Inicializa estágios do Kanban salvos no localStorage
function initSavedStages() {
  const stages = JSON.parse(localStorage.getItem("odonto_kanban_stages") || "{}");
  CLINICAS_DATA.forEach(c => {
    if (!stages[c.id]) {
      if (typeof ApproachEngine !== "undefined") {
        const appData = ApproachEngine.getClinicApproachData(c.id, c);
        stages[c.id] = appData.etapa || (hasClinicVideo(c.id) ? "previa_enviada" : "novo");
      } else {
        stages[c.id] = hasClinicVideo(c.id) ? "previa_enviada" : "novo";
      }
    }
  });
  localStorage.setItem("odonto_kanban_stages", JSON.stringify(stages));
}

function getClinicStage(clinicId) {
  if (typeof ApproachEngine !== "undefined") {
    const appData = ApproachEngine.getClinicApproachData(clinicId);
    if (appData && appData.etapa) {
      return appData.etapa;
    }
  }
  const stages = JSON.parse(localStorage.getItem("odonto_kanban_stages") || "{}");
  const raw = stages[clinicId] || "novo";
  if (raw === "backlog") return "novo";
  if (raw === "recepcao") return "recepcao_contatada";
  if (raw === "decisor") return "falando_dentista";
  if (raw === "enviada" || raw === "followup") return "previa_enviada";
  if (raw === "reuniao") return "ligacao_marcada";
  if (raw.startsWith("fechado")) return "fechado";
  if (raw === "arquivado") return "encerrado";
  return raw;
}

function setClinicStage(clinicId, newStage, silent = false) {
  if (typeof ApproachEngine !== "undefined") {
    ApproachEngine.saveClinicApproachData(clinicId, { etapa: newStage });
  }
  const stages = JSON.parse(localStorage.getItem("odonto_kanban_stages") || "{}");
  const oldStage = stages[clinicId] || "novo";
  stages[clinicId] = newStage;
  localStorage.setItem("odonto_kanban_stages", JSON.stringify(stages));

  // Se passou de novo/backlog para qualquer estágio ativo e não registrou abordagem hoje, incrementa
  if ((oldStage === "novo" || oldStage === "backlog") && newStage !== "novo" && newStage !== "backlog" && newStage !== "encerrado" && newStage !== "arquivado") {
    incrementTodayContact(true);
  }

  renderKPIs();
  updateTodayPriorityWidget();
  if (currentActiveView === "kanban") {
    renderKanban();
  } else {
    renderClinics();
  }

  if (!silent) {
    const stageObj = KANBAN_STAGES.find(s => s.key === newStage);
    const stageName = stageObj ? stageObj.title : newStage;
    showToast(`📌 Etapa alterada para: ${stageName}`);
  }
}

// --- AUTENTICAÇÃO POR PIN / SENHA ---
function initAuth() {
  const lockOverlay = document.getElementById("lockOverlay");
  const pinInput = document.getElementById("pinInput");
  const pinBtn = document.getElementById("pinBtn");
  const lockError = document.getElementById("lockError");
  const rememberCheckbox = document.getElementById("rememberPin");
  const logoutBtn = document.getElementById("logoutBtn");

  const isAuthenticated = localStorage.getItem("odonto_authenticated") === "true";
  if (isAuthenticated) {
    lockOverlay.classList.add("hidden");
  } else {
    lockOverlay.classList.remove("hidden");
    pinInput.focus();
  }

  function handleUnlock() {
    const inputVal = pinInput.value.trim();
    if (inputVal === MASTER_PIN) {
      lockOverlay.classList.add("hidden");
      lockError.style.display = "none";
      if (rememberCheckbox.checked) {
        localStorage.setItem("odonto_authenticated", "true");
      }
      pinInput.value = "";
    } else {
      lockError.style.display = "block";
      pinInput.value = "";
      pinInput.focus();
    }
  }

  pinBtn.addEventListener("click", handleUnlock);
  pinInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleUnlock();
  });

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("odonto_authenticated");
    lockOverlay.classList.remove("hidden");
    pinInput.value = "";
    pinInput.focus();
  });
}

// --- GESTÃO DE ABORDAGENS DIÁRIAS (CONTROLE DE RITMO 26/DIA) ---
function getTodayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayContacts() {
  const allLogs = JSON.parse(localStorage.getItem("odonto_daily_contacts") || "{}");
  return allLogs[getTodayStr()] || 0;
}

function incrementTodayContact(silent = false) {
  const allLogs = JSON.parse(localStorage.getItem("odonto_daily_contacts") || "{}");
  const todayKey = getTodayStr();
  allLogs[todayKey] = (allLogs[todayKey] || 0) + 1;
  localStorage.setItem("odonto_daily_contacts", JSON.stringify(allLogs));

  renderKPIs();
  if (!silent) {
    showToast(`🎯 +1 Abordagem registrada hoje! (${allLogs[todayKey]} / 26)`);
  }
}

// --- CÁLCULO E RENDERIZAÇÃO DOS 6 INDICADORES DA META 30 DIAS ---
function renderKPIs() {
  const todayContacts = getTodayContacts();
  const todayTarget = 26;
  const stages = JSON.parse(localStorage.getItem("odonto_kanban_stages") || "{}");

  // Contadores por estágio no pipeline
  let totalAbordadas = 0;
  let totalDecisor = 0;
  let totalPositiva = 0;
  let countPL = 0;
  let countES = 0;

  CLINICAS_DATA.forEach(c => {
    const st = stages[c.id] || "backlog";
    if (st !== "backlog") totalAbordadas++;
    if (["decisor", "enviada", "followup", "reuniao", "fechado_pl", "fechado_es"].includes(st)) {
      totalDecisor++;
    }
    if (["reuniao", "fechado_pl", "fechado_es"].includes(st)) {
      totalPositiva++;
    }
    if (st === "fechado_pl") countPL++;
    if (st === "fechado_es") countES++;
  });

  const totalFechados = countPL + countES;

  // 1. Abordagens de Hoje
  const todayPct = Math.min(100, Math.round((todayContacts / todayTarget) * 100));
  const elTodayCount = document.getElementById("kpiTodayCount");
  const elContactBar = document.getElementById("kpiContactBar");
  if (elTodayCount) elTodayCount.textContent = todayContacts;
  if (elContactBar) elContactBar.style.width = `${todayPct}%`;

  // 2. Conversas com Decisor (Meta: 50% · Alerta < 30%)
  const decisionPct = totalAbordadas > 0 ? Math.round((totalDecisor / totalAbordadas) * 100) : 0;
  const elDecisionPct = document.getElementById("kpiDecisionPct");
  const elDecisionBar = document.getElementById("kpiDecisionBar");
  const elDecisionCount = document.getElementById("kpiDecisionCount");
  if (elDecisionPct) {
    elDecisionPct.textContent = `${decisionPct}%`;
    elDecisionPct.style.color = (totalAbordadas >= 5 && decisionPct < 30) ? "#ef4444" : "#38bdf8";
  }
  if (elDecisionBar) elDecisionBar.style.width = `${Math.min(100, decisionPct * 2)}%`;
  if (elDecisionCount) elDecisionCount.textContent = `${totalDecisor} de ${totalAbordadas} abordagens`;

  // 3. Taxa de Resposta Positiva (Meta: 20% · Alerta < 15%)
  const positivePct = totalDecisor > 0 ? Math.round((totalPositiva / totalDecisor) * 100) : 0;
  const elPositivePct = document.getElementById("kpiPositivePct");
  const elPositiveBar = document.getElementById("kpiPositiveBar");
  const elPositiveCount = document.getElementById("kpiPositiveCount");
  if (elPositivePct) {
    elPositivePct.textContent = `${positivePct}%`;
    elPositivePct.style.color = (totalDecisor >= 5 && positivePct < 15) ? "#ef4444" : "#c084fc";
  }
  if (elPositiveBar) elPositiveBar.style.width = `${Math.min(100, positivePct * 5)}%`;
  if (elPositiveCount) elPositiveCount.textContent = `${totalPositiva} de ${totalDecisor} decisores`;

  // 4. Mix Presença Local (Meta: 50% · Alerta < 35%)
  const mixPct = totalFechados > 0 ? Math.round((countPL / totalFechados) * 100) : 0;
  const elMixPct = document.getElementById("kpiMixPct");
  const elMixBar = document.getElementById("kpiMixBar");
  const elMixCount = document.getElementById("kpiMixCount");
  if (elMixPct) {
    elMixPct.textContent = `${mixPct}%`;
    elMixPct.style.color = (totalFechados >= 2 && mixPct < 35) ? "#ef4444" : "#34d399";
  }
  if (elMixBar) elMixBar.style.width = `${Math.min(100, mixPct * 2)}%`;
  if (elMixCount) elMixCount.textContent = `${countPL} PL / ${totalFechados} fechados`;

  // 5. Caixa Acumulado (Meta: R$ 20.000 · PL: R$ 800, ES: R$ 1.000)
  const caixa = (countPL * 800) + (countES * 1000);
  const caixaTarget = 20000;
  const caixaPct = Math.min(100, Math.round((caixa / caixaTarget) * 100));
  const elCashVal = document.getElementById("kpiCashVal");
  const elCashBar = document.getElementById("kpiCashBar");
  const elSalesTotal = document.getElementById("kpiSalesTotal");
  if (elCashVal) elCashVal.textContent = `R$ ${caixa.toLocaleString("pt-BR")}`;
  if (elCashBar) elCashBar.style.width = `${caixaPct}%`;
  if (elSalesTotal) elSalesTotal.textContent = `${totalFechados} vendas fechadas (Meta: 20)`;

  // 6. MRR Ativo (Meta: R$ 6.940/mês · PL: R$ 497, ES: R$ 197)
  const mrr = (countPL * 497) + (countES * 197);
  const mrrTarget = 6940;
  const mrrPct = Math.min(100, Math.round((mrr / mrrTarget) * 100));
  const elMrrVal = document.getElementById("kpiMrrVal");
  const elMrrBar = document.getElementById("kpiMrrBar");
  if (elMrrVal) elMrrVal.textContent = `R$ ${mrr.toLocaleString("pt-BR")}/mês`;
  if (elMrrBar) elMrrBar.style.width = `${mrrPct}%`;

  // Alerta de Contingência Dinâmico
  const elContingencyText = document.getElementById("contingencyText");
  if (elContingencyText) {
    if (todayContacts < 15) {
      elContingencyText.innerHTML = `⚠️ <strong>Ritmo de Abordagens Baixo:</strong> Você fez ${todayContacts} contatos hoje. Mantenha o ritmo de 26/dia útil para garantir a meta de 20 clientes em 30 dias.`;
    } else if (totalAbordadas >= 5 && decisionPct < 30) {
      elContingencyText.innerHTML = `⚠️ <strong>Bloqueio na Recepção (${decisionPct}%):</strong> Menos de 30% chegaram ao dentista. Contingência: peça à secretária o WhatsApp do RT usando a técnica "A/C Dr(a) - prévia com vídeo de 10s pronta".`;
    } else if (totalDecisor >= 5 && positivePct < 15) {
      elContingencyText.innerHTML = `⚠️ <strong>Baixa Resposta Positiva (${positivePct}%):</strong> Contingência: envie diretamente o vídeo desktop de 10s sem link externo, seguido da mensagem curta no WhatsApp.`;
    } else if (totalFechados >= 2 && mixPct < 35) {
      elContingencyText.innerHTML = `⚠️ <strong>Mix Presença Local Abaixo de 35% (${mixPct}%):</strong> Apresente o Presença Local (R$ 800 + R$ 497/mês) como opção padrão e mantenha o Essencial apenas como contingência de entrada.`;
    } else {
      elContingencyText.innerHTML = `✅ <strong>Operação nos Trilhos:</strong> Pipeline ativo. Mantenha o foco nas 26 abordagens diárias e revisões de sexta (16/10, 23/10, 30/10 e 06/11).`;
    }
  }
}

// --- ALTERNADOR DE VISUALIZAÇÃO (LISTA vs KANBAN) ---
function switchView(viewMode) {
  currentActiveView = viewMode;
  localStorage.setItem("odonto_active_view", viewMode);

  const btnList = document.getElementById("btnViewList");
  const btnKanban = document.getElementById("btnViewKanban");
  const listView = document.getElementById("listView");
  const kanbanView = document.getElementById("kanbanView");

  if (viewMode === "kanban") {
    btnKanban.classList.add("active");
    btnList.classList.remove("active");
    listView.style.display = "none";
    kanbanView.classList.add("active");
    renderKanban();
  } else {
    btnList.classList.add("active");
    btnKanban.classList.remove("active");
    listView.style.display = "block";
    kanbanView.classList.remove("active");
    renderClinics();
  }
}

function restoreSavedView() {
  const saved = localStorage.getItem("odonto_active_view") || "list";
  switchView(saved);
}

// Verifica se uma clínica já tem personalização salva
function hasCustomPreview(clinicId) {
  return !!localStorage.getItem("odonto_custom_" + clinicId);
}

// --- VISUALIZAÇÃO 1: RENDERIZAÇÃO DA LISTA DE CARDS ---
function renderClinics() {
  const container = document.getElementById("clinicsGrid");
  const loadMoreWrap = document.getElementById("loadMoreWrap");
  if (!container) return;
  container.innerHTML = "";

  if (currentFilteredList.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; color: var(--text-secondary);">
        <p style="font-size: 1.1rem; margin-bottom: 8px;">Nenhuma clínica encontrada para esse filtro.</p>
        <span style="font-size: 0.85rem;">Tente buscar por outro termo ou limpar os filtros.</span>
      </div>
    `;
    if (loadMoreWrap) loadMoreWrap.style.display = "none";
    return;
  }

  const itemsToRender = currentFilteredList.slice(0, displayedCount);

  itemsToRender.forEach(c => {
    const card = document.createElement("article");
    card.className = "clinic-card";

    const isReady = c.status === "pronta";
    const statusClass = isReady ? "pronta" : "pendente";
    const statusText = isReady ? "Prévia Pronta" : "Aguardando Geração";
    const hasVideo = hasClinicVideo(c.id);
    const isCustomized = hasCustomPreview(c.id);
    const templateClass = c.template.toLowerCase();
    const currentStageKey = getClinicStage(c.id);

    // Abordagem Dinâmica (Novo Padrão)
    const approachRes = (typeof ApproachEngine !== "undefined")
      ? ApproachEngine.generateApproachActions(c)
      : null;

    const recommendedAction = approachRes ? approachRes.recommendedAction : null;
    const isFixedPhone = approachRes ? !approachRes.temWhatsapp : false;

    // Botão Principal Dinâmico
    let primaryActionBtn = "";
    if (isFixedPhone) {
      primaryActionBtn = `
        <button class="btn-action" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3);" onclick="openApproachModal('${c.id}', 'A')" title="Telefone fixo: ligue primeiro e peça o WhatsApp do(a) dentista">
          <span>📞 Roteiro de Ligação</span>
        </button>
      `;
    } else if (recommendedAction) {
      const isDue = recommendedAction.isDue;
      const dueClass = isDue ? "due-highlight" : "";
      primaryActionBtn = `
        <button class="btn-action ${dueClass}" style="background: rgba(37, 211, 102, 0.15); color: #25d366; border: 1px solid rgba(37, 211, 102, 0.3);" onclick="openApproachModal('${c.id}', '${recommendedAction.id}')" title="${recommendedAction.label}">
          <span>${recommendedAction.icon} [${recommendedAction.id}] ${recommendedAction.label}</span>
        </button>
      `;
    } else {
      primaryActionBtn = `
        <button class="btn-action" style="background: rgba(37, 211, 102, 0.15); color: #25d366; border: 1px solid rgba(37, 211, 102, 0.3);" onclick="openApproachModal('${c.id}')">
          <span>💬 Abordagem</span>
        </button>
      `;
    }

    const hubBtn = `
      <button class="btn-action btn-action-hub" onclick="openApproachModal('${c.id}')" title="Abrir cockpit completo de abordagem e mensagens">
        <span>⚡ Abordagem</span>
      </button>
    `;

    // Ações do Card
    let actionButtons = "";
    if (isReady) {
      const videoBtn = hasVideo 
        ? `<button class="btn-action" style="grid-column: span 2; background: #9333ea; color: #fff;" onclick="openVideoModal('${c.id}')">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
             <span>Assistir Vídeo Desktop (10s)</span>
           </button>`
        : `<button class="btn-action" style="grid-column: span 2; background: var(--bg-surface-alt); color: #d8b4fe; border: 1px dashed #a855f7;" onclick="copyVideoCommand('${c.id}')">
             <span>🎥 Gravar Vídeo Desktop (Copiar Comando)</span>
           </button>`;

      actionButtons = `
        <a href="${c.caminhoLocal}" target="_blank" rel="noopener noreferrer" class="btn-action btn-action-preview">
          <span>Ver Prévia</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
          </svg>
        </a>

        ${primaryActionBtn}

        ${hubBtn}

        <button class="btn-action" style="background: var(--bg-surface-alt); color: var(--text-secondary);" onclick="openBriefingModal('${c.id}')" title="Ver briefing completo">
          <span>📋 Briefing</span>
        </button>

        ${videoBtn}
      `;
    } else {
      actionButtons = `
        <button class="btn-action btn-action-generate" onclick="handleGeneratePreview('${c.id}')">
          <span>⚡ Gerar Prévia</span>
        </button>
        ${hubBtn}
      `;
    }

    const videoBadgeHtml = hasVideo 
      ? `<span class="status-badge" style="background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); margin-left: 6px;">🎬 Vídeo 1080p Pronto</span>`
      : "";

    const customBadgeHtml = isCustomized
      ? `<span class="status-badge" style="background: rgba(234, 179, 8, 0.15); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.3); margin-left: 6px;">✨ Fotos & Avaliações Editadas</span>`
      : "";

    // Opções de estágio do Kanban
    let stageOptions = KANBAN_STAGES.map(s => 
      `<option value="${s.key}" ${s.key === currentStageKey ? 'selected' : ''}>${s.title}</option>`
    ).join("");

    card.innerHTML = `
      <div class="clinic-top-row">
        <div>
          <div style="font-size: 0.72rem; color: var(--color-gold); font-weight: 700; margin-bottom: 2px;">
            RANKING #${c.ranking} · CAMADA ${c.camada}
          </div>
          <h3 class="clinic-name">${c.nome}</h3>
          <div class="clinic-location">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>${c.bairro}</span>
          </div>
        </div>
        <span class="badge-template ${templateClass}">${c.template}</span>
      </div>

      <div style="margin-bottom: 12px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
        <span class="status-badge ${statusClass}">● ${statusText}</span>
        ${videoBadgeHtml}
        ${customBadgeHtml}
      </div>

      <!-- Caixa do Subdomínio Oficial -->
      <div class="subdomain-box" title="Clique no ícone para copiar">
        <span class="subdomain-url">https://${c.subdominio}</span>
        <button class="btn-copy-icon" onclick="copyToClipboard('https://${c.subdominio}')" title="Copiar link da prévia">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
      </div>

      <div class="clinic-google-stat">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
        <span>Nota <strong>${c.nota}</strong> (${c.avaliacoes} avaliações no Google)</span>
      </div>

      <!-- Estágio do Funil / Kanban -->
      <div style="margin-bottom: 14px;">
        <label style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
          Estágio no Funil:
        </label>
        <select class="kanban-select-stage" onchange="setClinicStage('${c.id}', this.value)">
          ${stageOptions}
        </select>
      </div>

      <div class="card-actions">
        ${actionButtons}
        
        <!-- Botão de Personalização de Fotos & Avaliações Reais -->
        <button class="btn-action" style="grid-column: span 2; background: #0f172a; border: 1px solid var(--color-gold); color: var(--color-gold-light);" onclick="openCustomizeModal('${c.id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          <span>✏️ Mudar Fotos & 3 Avaliações Reais</span>
        </button>

        <button class="btn-action btn-action-briefing" onclick="openBriefingModal('${c.id}')">
          <span>Gaveta de Vendas (Scripts & Objeções)</span>
        </button>
      </div>
    `;

    container.appendChild(card);
  });

  if (loadMoreWrap) {
    if (displayedCount < currentFilteredList.length) {
      loadMoreWrap.style.display = "block";
      document.getElementById("btnLoadMore").textContent = `Carregar Mais Clínicas (Restam ${currentFilteredList.length - displayedCount})`;
    } else {
      loadMoreWrap.style.display = "none";
    }
  }
}

function loadMoreClinics() {
  displayedCount += PAGE_SIZE;
  renderClinics();
}

// --- VISUALIZAÇÃO 2: QUADRO KANBAN COM DRAG-AND-DROP NATIVO ---
function renderKanban() {
  const board = document.getElementById("kanbanBoard");
  if (!board) return;
  board.innerHTML = "";

  const stages = JSON.parse(localStorage.getItem("odonto_kanban_stages") || "{}");

  KANBAN_STAGES.forEach(stage => {
    const col = document.createElement("div");
    col.className = "kanban-col";

    // Filtra clínicas que estão nesta coluna e respeitam os filtros ativos
    const clinicsInStage = currentFilteredList.filter(c => (stages[c.id] || "backlog") === stage.key);

    col.innerHTML = `
      <div class="kanban-col-header" style="border-top: 3px solid ${stage.color};">
        <span class="kanban-col-title">
          <span>${stage.title}</span>
        </span>
        <span class="kanban-col-count" id="count_${stage.key}">${clinicsInStage.length}</span>
      </div>
      <div class="kanban-col-cards" id="cards_${stage.key}"
           ondragover="handleDragOver(event)"
           ondragleave="handleDragLeave(event)"
           ondrop="handleDrop(event, '${stage.key}')">
      </div>
    `;

    const cardsContainer = col.querySelector(`#cards_${stage.key}`);

    clinicsInStage.forEach(c => {
      const card = document.createElement("div");
      card.className = "kanban-card";
      card.draggable = true;
      card.ondragstart = (e) => handleDragStart(e, c.id);

      const isReady = c.status === "pronta";
      const hasVideo = hasClinicVideo(c.id);
      const isCustomized = hasCustomPreview(c.id);
      const isFixo = (typeof CLINICAS_EXTRA !== "undefined" && CLINICAS_EXTRA[c.id] && CLINICAS_EXTRA[c.id].tw === "não");
      const approachBtn = isFixo
        ? `<button class="btn-kanban-sm" style="color: #f87171; font-weight: 700;" onclick="openApproachModal('${c.id}', 'A')" title="Telefone fixo: ligar primeiro">📞 Roteiro</button>`
        : `<button class="btn-kanban-sm" style="color: #25d366; font-weight: 700;" onclick="openApproachModal('${c.id}')" title="Abrir painel de abordagem e mensagens">⚡ Abordagem</button>`;

      let stageOptions = KANBAN_STAGES.map(s => 
        `<option value="${s.key}" ${s.key === stage.key ? 'selected' : ''}>${s.title}</option>`
      ).join("");

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-size: 0.68rem; font-weight: 800; color: var(--color-gold);">#${c.ranking} · ${c.camada}</span>
          <span class="kanban-tag" style="background: rgba(197, 168, 128, 0.15); color: var(--color-gold); border: 1px solid rgba(197, 168, 128, 0.3);">
            ${c.template}
          </span>
        </div>

        <div class="kanban-card-title">${c.nome}</div>
        <div class="kanban-card-meta">
          <span>📍 ${c.bairro}</span>
          <span>⭐ ${c.nota} (${c.avaliacoes})</span>
        </div>

        <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px;">
          ${hasVideo ? '<span style="font-size: 0.65rem; color: #c084fc; font-weight: 700;">🎬 Vídeo Pronto</span>' : ''}
          ${isReady ? '<span style="font-size: 0.65rem; color: #34d399; font-weight: 700;">● Prévia Pronta</span>' : ''}
          ${isCustomized ? '<span style="font-size: 0.65rem; color: #facc15; font-weight: 700;">✨ Fotos/Reviews Editadas</span>' : ''}
        </div>

        <div class="kanban-card-actions">
          ${approachBtn}
          ${isReady 
            ? `<a href="${c.caminhoLocal}" target="_blank" rel="noopener noreferrer" class="btn-kanban-sm" title="Ver prévia online">Prévia</a>`
            : `<button class="btn-kanban-sm" onclick="handleGeneratePreview('${c.id}')" title="Gerar prévia">⚡ Gerar</button>`}
          <button class="btn-kanban-sm" style="color: var(--color-gold);" onclick="openCustomizeModal('${c.id}')" title="Mudar fotos e 3 avaliações">✏️ Fotos</button>
          <button class="btn-kanban-sm" onclick="openBriefingModal('${c.id}')" title="Abrir gaveta de vendas">Scripts</button>
        </div>

        <select class="kanban-select-stage" onchange="setClinicStage('${c.id}', this.value)">
          ${stageOptions}
        </select>
      `;

      cardsContainer.appendChild(card);
    });

    board.appendChild(col);
  });
}

// --- EVENTOS DE DRAG AND DROP NATIVO DO KANBAN ---
function handleDragStart(e, clinicId) {
  draggedClinicId = clinicId;
  e.dataTransfer.setData("text/plain", clinicId);
  e.dataTransfer.effectAllowed = "move";
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  e.currentTarget.classList.add("drag-over");
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove("drag-over");
}

function handleDrop(e, targetStageKey) {
  e.preventDefault();
  e.currentTarget.classList.remove("drag-over");
  const clinicId = e.dataTransfer.getData("text/plain") || draggedClinicId;
  if (!clinicId) return;

  setClinicStage(clinicId, targetStageKey);
  draggedClinicId = null;
}

// --- GERAÇÃO DE PRÉVIA EM 1 CLIQUE (TODOS OS 3 TEMPLATES LIBERADOS) ---
function handleGeneratePreview(clinicId) {
  const clinic = CLINICAS_DATA.find(c => c.id === clinicId);
  if (!clinic) return;

  clinic.status = "pronta";

  // Salva no localStorage para persistência
  const saved = JSON.parse(localStorage.getItem("odonto_geradas") || "[]");
  if (!saved.includes(clinic.id)) {
    saved.push(clinic.id);
    localStorage.setItem("odonto_geradas", JSON.stringify(saved));
  }

  // Se a clínica ainda estava em backlog, move para "enviada"
  const currentStage = getClinicStage(clinic.id);
  if (currentStage === "backlog") {
    setClinicStage(clinic.id, "enviada", true);
  }

  showToast(`✨ Prévia gerada com sucesso para ${clinic.nome}!`);
  renderKPIs();
  if (currentActiveView === "kanban") {
    renderKanban();
  } else {
    renderClinics();
  }

  // Abre a prévia em nova aba
  window.open(clinic.caminhoLocal, "_blank");
}

// --- BUSCA E FILTROS ---
function applyFilters() {
  let filtered = CLINICAS_DATA;

  if (currentFilter === "moderno") {
    filtered = filtered.filter(c => c.template.toLowerCase() === "moderno");
  } else if (currentFilter === "profissional") {
    filtered = filtered.filter(c => c.template.toLowerCase() === "profissional");
  } else if (currentFilter === "amigavel") {
    filtered = filtered.filter(c => c.template.toLowerCase() === "amigavel");
  } else if (currentFilter === "prontas") {
    filtered = filtered.filter(c => c.status === "pronta");
  } else if (currentFilter === "camada_a") {
    filtered = filtered.filter(c => c.camada === "A");
  }

  if (searchQuery.trim() !== "") {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(c => 
      c.nome.toLowerCase().includes(q) ||
      c.bairro.toLowerCase().includes(q) ||
      c.subdominio.toLowerCase().includes(q) ||
      c.ranking.toString() === q ||
      c.telefone.includes(q)
    );
  }

  // Filtros do Widget "Hoje"
  if (currentApproachFilter && typeof ApproachEngine !== "undefined") {
    filtered = filtered.filter(c => {
      const appData = ApproachEngine.getClinicApproachData(c.id, c);
      const etapa = appData.etapa || "novo";
      const dias = ApproachEngine.getDaysSinceContact(appData.dataUltimoContato);

      if (currentApproachFilter === "d4") {
        return etapa === "previa_enviada" && dias !== null && dias >= 4 && dias < 11;
      }
      if (currentApproachFilter === "d11") {
        return etapa === "previa_enviada" && dias !== null && dias >= 11;
      }
      if (currentApproachFilter === "call") {
        return etapa === "ligacao_marcada";
      }
      if (currentApproachFilter === "waiting") {
        return ["pergunta_enviada", "video_oferecido"].includes(etapa);
      }
      if (currentApproachFilter === "hoje") {
        const isD4 = etapa === "previa_enviada" && dias !== null && dias >= 4;
        const isCall = etapa === "ligacao_marcada";
        const isWaiting = ["pergunta_enviada", "video_oferecido"].includes(etapa);
        return isD4 || isCall || isWaiting;
      }
      return true;
    });
  }

  currentFilteredList = filtered;
  displayedCount = PAGE_SIZE;

  if (currentActiveView === "kanban") {
    renderKanban();
  } else {
    renderClinics();
  }
}

function setupFilters() {
  document.querySelectorAll(".filter-pill").forEach(pill => {
    pill.addEventListener("click", function() {
      document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
      this.classList.add("active");
      currentFilter = this.getAttribute("data-filter");
      applyFilters();
    });
  });
}

function setupSearch() {
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      applyFilters();
    });
  }
}

// --- GAVETA DE VENDAS (MODAL DE BRIEFING COM 4 ABAS) ---
function openBriefingModal(clinicId) {
  const clinic = CLINICAS_DATA.find(c => c.id === clinicId);
  if (!clinic) return;

  currentDrawerClinicId = clinicId;
  const modal = document.getElementById("briefingModal");

  // Dados de cabeçalho
  document.getElementById("modalClinicName").textContent = `${clinic.nome} (Ranking #${clinic.ranking} · Camada ${clinic.camada})`;
  document.getElementById("modalSubdomain").textContent = `https://${clinic.subdominio}`;

  // Aba 1: Briefing
  document.getElementById("modalDiagnosis").textContent = clinic.diagnostico || "Sem diagnóstico prévio.";
  document.getElementById("modalTitle").textContent = clinic.titulo || "—";
  document.getElementById("modalSubtitle").textContent = clinic.subtitulo || "—";
  document.getElementById("modalServices").textContent = clinic.servicos.length ? clinic.servicos.join(" · ") : "—";
  document.getElementById("modalHighlight").textContent = clinic.briefing || clinic.destaque || "—";
  document.getElementById("modalAddress").textContent = clinic.endereco || "—";
  document.getElementById("modalHours").textContent = clinic.horario || "—";
  document.getElementById("modalBestTime").textContent = clinic.melhorHorario || "Horário comercial";

  // Aba 2: Scripts personalizados com o nome da clínica
  const prevUrl = `https://${clinic.subdominio}`;
  document.getElementById("scriptRecepcaoText").textContent = 
    `"Olá, tudo bem? Meu nome é [Seu Nome]. Preparei uma prévia visual exclusiva da nova página online da ${clinic.nome} com vídeo interativo para os pacientes de ${clinic.bairro}. Com quem falo na equipe do Dr(a) para encaminhar a prévia de 10 segundos?"`;

  document.getElementById("scriptDecisorText").textContent = 
    `"Olá Dr(a), tudo bem? Notei que a ${clinic.nome} tem uma excelente reputação no Google em ${clinic.bairro} (${clinic.avaliacoes} avaliações), mas ainda não tem uma página moderna com foco em agendamentos particulares no WhatsApp. Montei uma prévia completa sem compromisso para você ver como ficaria: ${prevUrl}. O que achou?"`;

  document.getElementById("scriptFollowup4Text").textContent = 
    `"Dr(a), tudo bem? Sei da correria dos atendimentos no consultório da ${clinic.nome}. Gravamos um vídeo de 10 segundos da sua prévia para facilitar a visualização sem precisar abrir links. Conseguiu dar uma olhada?"`;

  document.getElementById("scriptFollowup11Text").textContent = 
    `"Olá Dr(a)! Como não tivemos retorno, nosso servidor de testes irá desativar a prévia da ${clinic.nome} nesta sexta-feira para liberar espaço para outros consultórios de ${clinic.bairro}. Se tiver interesse em manter no ar ou personalizar, me avise hoje até às 18h!"`;

  // Reseta para a primeira aba
  switchDrawerTab("tabBriefing");
  modal.classList.add("active");
}

function closeBriefingModal() {
  const modal = document.getElementById("briefingModal");
  if (modal) modal.classList.remove("active");
}

function switchDrawerTab(tabId) {
  // Esconde todos os conteúdos
  document.querySelectorAll(".drawer-tab-content").forEach(el => el.classList.remove("active"));
  // Remove ativo dos botões
  document.querySelectorAll(".drawer-tab-btn").forEach(el => el.classList.remove("active"));

  // Ativa selecionado
  const content = document.getElementById(tabId);
  if (content) content.classList.add("active");

  const btnMap = {
    tabBriefing: "tabBtnBriefing",
    tabScripts: "tabBtnScripts",
    tabObjections: "tabBtnObjections",
    tabClosing: "tabBtnClosing"
  };
  const activeBtn = document.getElementById(btnMap[tabId]);
  if (activeBtn) activeBtn.classList.add("active");
}

// Cópia de Scripts da Gaveta
function copyContactScript(scriptType) {
  const idMap = {
    recepcao: "scriptRecepcaoText",
    decisor: "scriptDecisorText",
    followup4: "scriptFollowup4Text",
    followup11: "scriptFollowup11Text"
  };
  const targetId = idMap[scriptType];
  const el = document.getElementById(targetId);
  if (!el) return;

  copyToClipboard(el.textContent.trim().replace(/^"|"$/g, ""));
  showToast("💬 Script de contato copiado para a área de transferência!");
}

function copyObjection(objKey) {
  const el = document.getElementById(`objAnswer_${objKey}`);
  if (!el) return;

  const clinic = CLINICAS_DATA.find(c => c.id === currentDrawerClinicId);
  let text = el.textContent.trim().replace(/^"|"$/g, "");
  if (clinic) {
    text = text.replace(/\[Bairro\]/g, clinic.bairro);
    text = text.replace(/\[Nome da Clínica\]/g, clinic.nome);
  }

  copyToClipboard(text);
  showToast("🛡️ Resposta à objeção copiada com sucesso!");
}

function copyClosingScript() {
  const el = document.getElementById("closingScriptText");
  if (!el) return;
  const clinic = CLINICAS_DATA.find(c => c.id === currentDrawerClinicId);
  let text = el.innerText || el.textContent;
  if (clinic) {
    text = text.replace(/\[Nome da Clínica\]/g, clinic.nome);
  }
  copyToClipboard(text.trim().replace(/^"|"$/g, ""));
  showToast("💰 Proposta e dados PIX copiados!");
}

// ==========================================================================
// --- MÓDULO DE PERSONALIZAÇÃO DE PRÉVIA (AVALIAÇÕES & FOTOS) ---
// ==========================================================================

function openCustomizeModal(clinicId) {
  const clinic = CLINICAS_DATA.find(c => c.id === clinicId);
  if (!clinic) return;

  currentCustomClinicId = clinicId;
  const modal = document.getElementById("customizeModal");
  document.getElementById("custClinicTitle").textContent = `Personalizar: ${clinic.nome}`;
  document.getElementById("custClinicSub").textContent = `Subdomínio: https://${clinic.subdominio} · Bairro: ${clinic.bairro}`;

  // Tenta carregar dados já personalizados salvos
  const savedRaw = localStorage.getItem("odonto_custom_" + clinicId);
  let custom = null;
  if (savedRaw) {
    try { custom = JSON.parse(savedRaw); } catch(e) {}
  }

  // Preenche Avaliações (se houver salvas, usa as salvas; senão, sugere defaults com nome da clínica e bairro)
  const defaultReviews = [
    {
      name: "Mariana Silva",
      stars: "5",
      text: `Atendimento impecável desde a recepção até o consultório em ${clinic.bairro}. O cuidado e a explicação clara de cada etapa me deixaram muito segura!`
    },
    {
      name: "Rodrigo Ferreira",
      stars: "5",
      text: `Ambiente super moderno, pontualidade exemplar e equipe atenciosa. O resultado do tratamento na ${clinic.nome} superou minhas expectativas.`
    },
    {
      name: "Camila Pereira",
      stars: "5",
      text: `Excelente estrutura e profissionais extremamente cuidadosos e humanos. Recomendo para toda a família em ${clinic.bairro}!`
    }
  ];

  const reviewsToLoad = (custom && custom.reviews && custom.reviews.length === 3) 
    ? custom.reviews 
    : defaultReviews;

  reviewsToLoad.forEach((rev, idx) => {
    const num = idx + 1;
    document.getElementById(`custRevName${num}`).value = rev.name || "";
    document.getElementById(`custRevStars${num}`).value = rev.stars || "5";
    document.getElementById(`custRevText${num}`).value = rev.text || "";
  });

  // Preenche Fotos (se houver salvas, usa as salvas; senão, se clinic tem fotoPrincipal, sugere no Hero)
  const defaultHero = (custom && custom.fotoHero) 
    ? custom.fotoHero 
    : (clinic.fotoPrincipal || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=80");
  const defaultSobre = (custom && custom.fotoSobre) 
    ? custom.fotoSobre 
    : "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=800&q=80";
  const defaultTech = (custom && custom.fotoTech) 
    ? custom.fotoTech 
    : "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80";

  document.getElementById("custHeroUrl").value = defaultHero;
  document.getElementById("custSobreUrl").value = defaultSobre;
  document.getElementById("custTechUrl").value = defaultTech;

  updateThumb("custHeroUrl", "custHeroThumb");
  updateThumb("custSobreUrl", "custSobreThumb");
  updateThumb("custTechUrl", "custTechThumb");

  modal.classList.add("active");
}

function closeCustomizeModal() {
  const modal = document.getElementById("customizeModal");
  if (modal) modal.classList.remove("active");
}

// Manipulação de Upload de Imagem do PC para DataURL
function handleImageUpload(e, inputTargetId, thumbTargetId) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 3 * 1024 * 1024) {
    alert("Para melhor desempenho, selecione uma foto de até 3MB.");
  }

  const reader = new FileReader();
  reader.onload = function(evt) {
    const dataUrl = evt.target.result;
    document.getElementById(inputTargetId).value = dataUrl;
    updateThumb(inputTargetId, thumbTargetId);
    showToast("📷 Foto carregada do dispositivo!");
  };
  reader.readAsDataURL(file);
}

function updateThumb(inputTargetId, thumbTargetId) {
  const inputEl = document.getElementById(inputTargetId);
  const thumbEl = document.getElementById(thumbTargetId);
  if (!inputEl || !thumbEl) return;
  const val = inputEl.value.trim();
  if (val) {
    thumbEl.src = val;
    thumbEl.style.display = "block";
  } else {
    thumbEl.style.display = "none";
  }
}

// Salvar personalizações e emitir / abrir a prévia
function saveAndRegeneratePreview() {
  const clinic = CLINICAS_DATA.find(c => c.id === currentCustomClinicId);
  if (!clinic) return;

  const reviews = [
    {
      name: document.getElementById("custRevName1").value.trim() || "Mariana Silva",
      stars: document.getElementById("custRevStars1").value,
      text: document.getElementById("custRevText1").value.trim()
    },
    {
      name: document.getElementById("custRevName2").value.trim() || "Rodrigo Ferreira",
      stars: document.getElementById("custRevStars2").value,
      text: document.getElementById("custRevText2").value.trim()
    },
    {
      name: document.getElementById("custRevName3").value.trim() || "Camila Pereira",
      stars: document.getElementById("custRevStars3").value,
      text: document.getElementById("custRevText3").value.trim()
    }
  ];

  const fotoHero = document.getElementById("custHeroUrl").value.trim();
  const fotoSobre = document.getElementById("custSobreUrl").value.trim();
  const fotoTech = document.getElementById("custTechUrl").value.trim();

  const customData = {
    clinicId: clinic.id,
    updatedAt: new Date().toISOString(),
    reviews,
    fotoHero,
    fotoSobre,
    fotoTech
  };

  // Salva no localStorage compartilhado
  localStorage.setItem("odonto_custom_" + clinic.id, JSON.stringify(customData));

  // Marca status da clínica como pronta
  clinic.status = "pronta";
  const savedGeradas = JSON.parse(localStorage.getItem("odonto_geradas") || "[]");
  if (!savedGeradas.includes(clinic.id)) {
    savedGeradas.push(clinic.id);
    localStorage.setItem("odonto_geradas", JSON.stringify(savedGeradas));
  }

  // Se estava em backlog, move para "enviada"
  const currentStage = getClinicStage(clinic.id);
  if (currentStage === "backlog") {
    setClinicStage(clinic.id, "enviada", true);
  }

  closeCustomizeModal();
  showToast(`⚡ Prévia de ${clinic.nome} regerada com fotos e 3 avaliações reais!`);

  renderKPIs();
  if (currentActiveView === "kanban") {
    renderKanban();
  } else {
    renderClinics();
  }

  // Abre a prévia atualizada em nova aba
  window.open(clinic.caminhoLocal, "_blank");
}

function resetCustomPreview() {
  if (!currentCustomClinicId) return;
  if (confirm("Deseja restaurar as avaliações e fotos para o modelo padrão?")) {
    localStorage.removeItem("odonto_custom_" + currentCustomClinicId);
    showToast("🔄 Padrões restaurados.");
    openCustomizeModal(currentCustomClinicId); // Recarrega
    renderClinics();
    if (currentActiveView === "kanban") renderKanban();
  }
}

// --- MODAL DE REVISÃO DE SEXTA (30 MINUTOS) ---
function openReviewModal() {
  const modal = document.getElementById("reviewModal");
  if (modal) modal.classList.add("active");
}

function closeReviewModal() {
  const modal = document.getElementById("reviewModal");
  if (modal) modal.classList.remove("active");
}

// --- MODAL DE BACKUP & SINCRONIZAÇÃO DE DADOS ---
function openBackupModal() {
  const modal = document.getElementById("backupModal");
  const area = document.getElementById("backupDataArea");

  // Coleta todas as personalizações salvas de fotos e avaliações
  const customPreviews = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("odonto_custom_")) {
      customPreviews[key] = localStorage.getItem(key);
    }
  }

  const bundle = {
    exportDate: new Date().toISOString(),
    stages: JSON.parse(localStorage.getItem("odonto_kanban_stages") || "{}"),
    geradas: JSON.parse(localStorage.getItem("odonto_geradas") || "[]"),
    dailyContacts: JSON.parse(localStorage.getItem("odonto_daily_contacts") || "{}"),
    customPreviews
  };

  area.value = JSON.stringify(bundle, null, 2);
  modal.classList.add("active");
}

function closeBackupModal() {
  const modal = document.getElementById("backupModal");
  if (modal) modal.classList.remove("active");
}

function copyBackupJson() {
  const area = document.getElementById("backupDataArea");
  copyToClipboard(area.value);
  showToast("📋 JSON de backup copiado para a área de transferência!");
}

function exportDataJson() {
  const area = document.getElementById("backupDataArea");
  const blob = new Blob([area.value], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `backup-odonto-${getTodayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("📥 Arquivo de backup baixado com sucesso!");
}

function importDataJson() {
  const area = document.getElementById("backupDataArea");
  try {
    const data = JSON.parse(area.value);
    if (!data.stages && !data.dailyContacts) {
      alert("Formato de backup inválido.");
      return;
    }
    if (data.stages) localStorage.setItem("odonto_kanban_stages", JSON.stringify(data.stages));
    if (data.geradas) localStorage.setItem("odonto_geradas", JSON.stringify(data.geradas));
    if (data.dailyContacts) localStorage.setItem("odonto_daily_contacts", JSON.stringify(data.dailyContacts));

    // Restaura personalizações de fotos e avaliações
    if (data.customPreviews) {
      Object.keys(data.customPreviews).forEach(k => {
        localStorage.setItem(k, data.customPreviews[k]);
      });
    }

    syncGeneratedState();
    renderKPIs();
    if (currentActiveView === "kanban") {
      renderKanban();
    } else {
      renderClinics();
    }

    closeBackupModal();
    showToast("✅ Dados do backup restaurados com sucesso!");
  } catch (err) {
    alert("Erro ao importar JSON. Verifique se o texto colado é um JSON válido.");
  }
}

function resetAllProgress() {
  if (confirm("ATENÇÃO: Deseja realmente resetar todo o progresso do funil, contatos diários e prévias para o estado inicial?")) {
    localStorage.removeItem("odonto_kanban_stages");
    localStorage.removeItem("odonto_daily_contacts");
    localStorage.removeItem("odonto_geradas");
    location.reload();
  }
}

// --- MODAL DE ALERTA DE ERRO DE TEMPLATE ---
function openAlertModal(title, message) {
  const modal = document.getElementById("alertModal");
  document.getElementById("alertModalTitle").innerHTML = title;
  document.getElementById("alertModalMessage").innerHTML = message;
  modal.classList.add("active");
}

function closeAlertModal() {
  document.getElementById("alertModal").classList.remove("active");
}

// --- MODAL DE VÍDEO DESKTOP (1920x1080) ---
function openVideoModal(slug) {
  const clinic = CLINICAS_DATA.find(c => c.id === slug);
  const modal = document.getElementById("videoModal");
  const player = document.getElementById("videoPlayer");
  const downloadBtn = document.getElementById("videoDownloadBtn");
  const title = document.getElementById("videoModalTitle");

  title.textContent = `Vídeo Desktop (1080p): ${clinic ? clinic.nome : slug}`;
  player.src = `videos/${slug}.mp4`;
  downloadBtn.href = `videos/${slug}.mp4`;
  downloadBtn.setAttribute("download", `${slug}.mp4`);
  modal.classList.add("active");
  player.play().catch(() => {});
}

function closeVideoModal() {
  const modal = document.getElementById("videoModal");
  const player = document.getElementById("videoPlayer");
  player.pause();
  player.src = "";
  modal.classList.remove("active");
}

function copyVideoCommand(slug) {
  const cmd = `node gerar-videos.mjs --only ${slug}`;
  copyToClipboard(cmd);
  showToast(`📋 Comando copiado! Cole no terminal para gravar.`);
}

// --- MODAL DE GRAVAÇÃO EM LOTE ---
function openBatchVideosModal() {
  const modal = document.getElementById("batchVideosModal");
  if (modal) modal.classList.add("active");
}

function closeBatchVideosModal() {
  const modal = document.getElementById("batchVideosModal");
  if (modal) modal.classList.remove("active");
}

function copyBatchCommand(cmd) {
  copyToClipboard(cmd);
  showToast(`📋 Comando copiado: ${cmd}`);
}

function copyCustomBatchCommand() {
  const qtyInput = document.getElementById("batchCustomQty");
  const parallelCheck = document.getElementById("batchCustomParallel");
  const qty = parseInt(qtyInput ? qtyInput.value : "10", 10) || 10;
  const isParallel = parallelCheck && parallelCheck.checked;
  const cmd = isParallel 
    ? `node gerar-videos.mjs --limite ${qty} --paralelo 2`
    : `node gerar-videos.mjs --limite ${qty}`;
  copyToClipboard(cmd);
  showToast(`📋 Comando copiado: ${cmd}`);
}

// --- UTILITÁRIOS: CLIPBOARD E TOAST ---
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    // ok
  }).catch(() => {
    const tempInput = document.createElement("input");
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);
  });
}

function showToast(message) {
  const toast = document.getElementById("toastNotice");
  const toastMsg = document.getElementById("toastMsg");
  if (!toast || !toastMsg) return;
  toastMsg.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

// Fechamento de modais clicando fora
window.addEventListener("click", (e) => {
  const briefingModal = document.getElementById("briefingModal");
  const customizeModal = document.getElementById("customizeModal");
  const alertModal = document.getElementById("alertModal");
  const videoModal = document.getElementById("videoModal");
  const reviewModal = document.getElementById("reviewModal");
  const backupModal = document.getElementById("backupModal");
  const batchVideosModal = document.getElementById("batchVideosModal");

  if (e.target === briefingModal) closeBriefingModal();
  if (e.target === customizeModal) closeCustomizeModal();
  if (e.target === alertModal) closeAlertModal();
  if (e.target === videoModal) closeVideoModal();
  if (e.target === reviewModal) closeReviewModal();
  if (e.target === backupModal) closeBackupModal();
  if (e.target === batchVideosModal) closeBatchVideosModal();
  const approachModal = document.getElementById("approachModal");
  if (e.target === approachModal) closeApproachModal();
});

// ============================================================================
// CONTROLADOR DO COCKPIT DE ABORDAGEM & GERAÇÃO DE MENSAGENS (NOVO PADRÃO)
// ============================================================================
let currentApproachClinic = null;
let currentApproachState = null;
let currentApproachActionId = "B";

function openApproachModal(clinicId, preselectActionId = null) {
  const c = CLINICAS_DATA.find(item => item.id === clinicId);
  if (!c) return;

  currentApproachClinic = c;
  currentApproachState = ApproachEngine.getClinicApproachData(c.id, c);

  const modal = document.getElementById("approachModal");
  if (!modal) return;

  // Atualiza cabeçalho
  const cData = ApproachEngine.resolveClinicData(c);
  document.getElementById("appModalClinicName").textContent = cData.nomeClinica;
  document.getElementById("appModalBairro").textContent = `📍 ${cData.bairro}`;
  document.getElementById("appModalNota").textContent = `⭐ ${cData.nota} (${cData.avaliacoes} avaliações)`;
  document.getElementById("appModalTelefone").textContent = `📞 ${cData.telefone}`;

  const isFixo = cData.temWhatsapp !== "sim";
  const badgeWa = document.getElementById("appModalWhatsappBadge");
  if (isFixo) {
    badgeWa.innerHTML = `<span style="background: rgba(239, 68, 68, 0.2); color: #f87171; padding: 2px 8px; border-radius: 4px; font-weight: 700;">⚠️ Telefone Fixo (Sem WhatsApp)</span>`;
  } else {
    badgeWa.innerHTML = `<span style="background: rgba(37, 211, 102, 0.2); color: #25d366; padding: 2px 8px; border-radius: 4px; font-weight: 700;">🟢 WhatsApp Ativo</span>`;
  }

  // Ações de prévia no cabeçalho
  const previaActions = document.getElementById("appModalPreviaActions");
  const isReady = c.status === "pronta";
  previaActions.innerHTML = isReady 
    ? `<a href="${c.caminhoLocal}" target="_blank" rel="noopener noreferrer" class="btn-action-sm" style="background: rgba(197, 168, 128, 0.15); color: var(--color-gold); border: 1px solid rgba(197, 168, 128, 0.3); padding: 5px 10px; border-radius: 4px; font-size: 0.78rem; text-decoration: none;">Ver Prévia ↗</a>`
    : `<button class="btn-action-sm" onclick="handleGeneratePreview('${c.id}'); setTimeout(() => openApproachModal('${c.id}'), 500);" style="background: #eab308; color: #000; padding: 5px 10px; border-radius: 4px; font-size: 0.78rem; font-weight: 700;">⚡ Gerar Prévia</button>`;

  // Popula dropdown de ângulos
  const selectAngulo = document.getElementById("appSelectAngulo");
  selectAngulo.innerHTML = Object.entries(ApproachEngine.ANGLE_TYPES).map(([k, label]) => 
    `<option value="${label}" ${label === currentApproachState.tipoAngulo ? "selected" : ""}>${label}</option>`
  ).join("");

  // Popula dropdown de etapas
  const selectEtapa = document.getElementById("appSelectEtapa");
  selectEtapa.innerHTML = ApproachEngine.APPROACH_STAGES.map(s => 
    `<option value="${s.key}" ${s.key === currentApproachState.etapa ? "selected" : ""}>${s.icon} ${s.title}</option>`
  ).join("");

  // Atualiza campos de entrada
  document.getElementById("appInputNomeDecisor").value = currentApproachState.nomeDecisor || "";
  document.getElementById("appInputTratamento").value = currentApproachState.tratamento || "doutor(a)";
  document.getElementById("appInputNomeRecepcao").value = currentApproachState.nomeRecepcao || "";
  document.getElementById("appInputRespostaDor").value = currentApproachState.respostaDor || "";
  document.getElementById("appInputObs").value = currentApproachState.obs || "";

  // Atualiza botões de falando com
  updateFalandoComButtons(currentApproachState.falandoCom);

  // Determina ação pré-selecionada
  const result = ApproachEngine.generateApproachActions(c, currentApproachState);
  currentApproachActionId = preselectActionId || result.recommendedKey || "B";

  refreshApproachModalUI();

  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeApproachModal() {
  const modal = document.getElementById("approachModal");
  if (modal) {
    modal.classList.remove("active");
  }
  document.body.style.overflow = "";
  currentApproachClinic = null;
  currentApproachState = null;
}

function updateFalandoComButtons(falandoCom) {
  const btnRecepcao = document.getElementById("btnFalandoRecepcao");
  const btnDentista = document.getElementById("btnFalandoDentista");
  if (!btnRecepcao || !btnDentista) return;

  if (falandoCom === "dentista") {
    btnDentista.style.background = "#38bdf8";
    btnDentista.style.color = "#000";
    btnDentista.style.fontWeight = "800";
    btnRecepcao.style.background = "var(--bg-surface)";
    btnRecepcao.style.color = "var(--text-secondary)";
    btnRecepcao.style.fontWeight = "normal";
  } else {
    btnRecepcao.style.background = "#f59e0b";
    btnRecepcao.style.color = "#000";
    btnRecepcao.style.fontWeight = "800";
    btnDentista.style.background = "var(--bg-surface)";
    btnDentista.style.color = "var(--text-secondary)";
    btnDentista.style.fontWeight = "normal";
  }
}

function setApproachFalandoCom(tipo) {
  if (!currentApproachState || !currentApproachClinic) return;
  currentApproachState.falandoCom = tipo;
  ApproachEngine.saveClinicApproachData(currentApproachClinic.id, { falandoCom: tipo });
  updateFalandoComButtons(tipo);
  
  // Recomenda ação de acordo com quem está falando
  if (tipo === "dentista" && currentApproachActionId === "B") {
    currentApproachActionId = "C";
  } else if (tipo === "recepção" && currentApproachActionId === "C") {
    currentApproachActionId = "B";
  }
  refreshApproachModalUI();
}

function updateApproachField(field, value) {
  if (!currentApproachState || !currentApproachClinic) return;
  currentApproachState[field] = value;
  const patch = {};
  patch[field] = value;
  ApproachEngine.saveClinicApproachData(currentApproachClinic.id, patch);
  refreshApproachModalUI();
}

function setApproachEtapa(etapaKey) {
  if (!currentApproachState || !currentApproachClinic) return;
  setClinicStage(currentApproachClinic.id, etapaKey, false);
  currentApproachState.etapa = etapaKey;
  
  // Atualiza ação recomendada para a nova etapa
  const cData = ApproachEngine.resolveClinicData(currentApproachClinic);
  const nextKey = ApproachEngine.getRecommendedActionKey(etapaKey, currentApproachState, cData);
  if (nextKey) {
    currentApproachActionId = nextKey;
  }
  refreshApproachModalUI();
}

function selectApproachAction(actionId) {
  currentApproachActionId = actionId;
  refreshApproachModalUI();
}

function refreshApproachModalUI() {
  if (!currentApproachClinic || !currentApproachState) return;

  const result = ApproachEngine.generateApproachActions(currentApproachClinic, currentApproachState);
  const actions = result.actions;
  const currentAction = actions.find(a => a.id === currentApproachActionId) || actions[0];

  // Atualiza estado visual de cada botão [A] até [K]
  actions.forEach(a => {
    const btn = document.getElementById(`btnApp_${a.id}`);
    if (btn) {
      btn.classList.toggle("active", a.id === currentApproachActionId);
      btn.classList.toggle("due-highlight", !!a.isDue);
      btn.disabled = !!a.disabled;
      if (a.disabledReason) {
        btn.title = a.disabledReason;
      } else {
        btn.title = a.label;
      }
    }
  });

  // Atualiza badge de etapa recomendada
  const stageBadge = document.getElementById("appActiveStageBadge");
  if (stageBadge) {
    const recAction = result.recommendedAction;
    stageBadge.innerHTML = recAction 
      ? `Recomendado agora: <strong>[${recAction.id}] ${recAction.label}</strong>`
      : "";
  }

  // Atualiza caixa de alerta contextual
  const contextAlert = document.getElementById("appContextAlert");
  if (result.temWhatsapp === false) {
    contextAlert.style.display = "block";
    contextAlert.style.background = "rgba(239, 68, 68, 0.15)";
    contextAlert.style.border = "1px solid rgba(239, 68, 68, 0.4)";
    contextAlert.style.color = "#fca5a5";
    contextAlert.innerHTML = `⚠️ <strong>Telefone fixo detectado:</strong> Ligue primeiro usando o roteiro [A] e peça o WhatsApp direto do(a) dentista.`;
  } else if (currentAction.id === "G") {
    contextAlert.style.display = "block";
    contextAlert.style.background = "rgba(168, 85, 247, 0.15)";
    contextAlert.style.border = "1px solid rgba(168, 85, 247, 0.4)";
    contextAlert.style.color = "#d8b4fe";
    contextAlert.innerHTML = `🎬 <strong>Lembrete importante:</strong> Anexe o vídeo de 10 segundos no WhatsApp antes de enviar o link da prévia.`;
  } else if (currentAction.id === "H" && currentAction.objecaoPreco) {
    contextAlert.style.display = "block";
    contextAlert.style.background = "rgba(56, 189, 248, 0.15)";
    contextAlert.style.border = "1px solid rgba(56, 189, 248, 0.4)";
    contextAlert.style.color = "#7dd3fc";
    contextAlert.innerHTML = `🛡️ <strong>Se perguntar o preço por mensagem:</strong> <em>"${currentAction.objecaoPreco}"</em>`;
  } else {
    contextAlert.style.display = "none";
  }

  // Atualiza textarea de prévia da mensagem
  const textarea = document.getElementById("appMessagePreview");
  textarea.value = currentAction.text;

  // Atualiza contador de palavras
  const words = currentAction.text.trim().split(/\s+/).filter(Boolean).length;
  document.getElementById("appWordCount").textContent = `${words} palavras`;

  // Atualiza botão de WhatsApp
  const btnWa = document.getElementById("btnAppWhatsapp");
  const isWhatsApp = currentAction.isWhatsApp && !currentAction.disabled;
  if (isWhatsApp && result.temWhatsapp) {
    btnWa.style.display = "inline-flex";
    btnWa.href = `https://wa.me/${result.clinic.telefoneFormatado}?text=${encodeURIComponent(currentAction.text)}`;
  } else {
    btnWa.style.display = "none";
  }

  // Atualiza data do último contato
  const lastContactInfo = document.getElementById("appLastContactInfo");
  if (currentApproachState.dataUltimoContato) {
    const d = new Date(currentApproachState.dataUltimoContato);
    lastContactInfo.textContent = `Último contato: ${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    lastContactInfo.textContent = "Último contato: Nunca";
  }
}

function copyApproachMessage() {
  const textarea = document.getElementById("appMessagePreview");
  if (!textarea) return;

  const textToCopy = textarea.value;
  navigator.clipboard.writeText(textToCopy).then(() => {
    showToast("📋 Mensagem copiada para a área de transferência!");
    recordApproachDispatch();
  }).catch(() => {
    textarea.select();
    document.execCommand("copy");
    showToast("📋 Mensagem copiada!");
    recordApproachDispatch();
  });
}

function handleApproachWhatsappClick(e) {
  const textarea = document.getElementById("appMessagePreview");
  if (textarea && currentApproachClinic) {
    const cData = ApproachEngine.resolveClinicData(currentApproachClinic);
    const textEncoded = encodeURIComponent(textarea.value);
    const link = `https://wa.me/${cData.telefoneFormatado}?text=${textEncoded}`;
    e.currentTarget.href = link;
  }
  recordApproachDispatch();
}

function recordApproachDispatch() {
  if (!currentApproachClinic || !currentApproachState) return;

  const nowIso = new Date().toISOString();
  currentApproachState.dataUltimoContato = nowIso;

  const result = ApproachEngine.generateApproachActions(currentApproachClinic, currentApproachState);
  const currentAction = result.actions.find(a => a.id === currentApproachActionId);

  const patch = { dataUltimoContato: nowIso };

  // Se a ação tiver nextStage sugerida, avança
  if (currentAction && currentAction.nextStage) {
    patch.etapa = currentAction.nextStage;
    currentApproachState.etapa = currentAction.nextStage;
    setClinicStage(currentApproachClinic.id, currentAction.nextStage, true);
  } else {
    ApproachEngine.saveClinicApproachData(currentApproachClinic.id, patch);
  }

  showToast(`⚡ Ação [${currentApproachActionId}] registrada com sucesso!`);
  refreshApproachModalUI();
  updateTodayPriorityWidget();
}

// ============================================================================
// CONTROLLER DO WIDGET "HOJE" & PRIORIDADES
// ============================================================================
let currentApproachFilter = null;

function updateTodayPriorityWidget() {
  if (typeof ApproachEngine === "undefined" || !CLINICAS_DATA) return;

  let countD4 = 0;
  let countD11 = 0;
  let countCalls = 0;
  let countWaiting = 0;
  const priorityClinics = [];

  CLINICAS_DATA.forEach(c => {
    const appData = ApproachEngine.getClinicApproachData(c.id, c);
    const etapa = appData.etapa || "novo";
    const dias = ApproachEngine.getDaysSinceContact(appData.dataUltimoContato);

    let isPriority = false;
    let badgeType = "";

    if (etapa === "previa_enviada" && dias !== null && dias >= 11) {
      countD11++;
      isPriority = true;
      badgeType = "d11";
    } else if (etapa === "previa_enviada" && dias !== null && dias >= 4) {
      countD4++;
      isPriority = true;
      badgeType = "d4";
    } else if (etapa === "ligacao_marcada") {
      countCalls++;
      isPriority = true;
      badgeType = "call";
    } else if (["pergunta_enviada", "video_oferecido"].includes(etapa)) {
      countWaiting++;
      isPriority = true;
      badgeType = "waiting";
    }

    if (isPriority) {
      priorityClinics.push({ clinic: c, badgeType, appData });
    }
  });

  const elD4 = document.getElementById("countD4");
  const elD11 = document.getElementById("countD11");
  const elCalls = document.getElementById("countCalls");
  const elWaiting = document.getElementById("countWaiting");
  const elTotal = document.getElementById("todayTotalBadge");
  const listContainer = document.getElementById("todayPriorityList");

  if (elD4) elD4.textContent = countD4;
  if (elD11) elD11.textContent = countD11;
  if (elCalls) elCalls.textContent = countCalls;
  if (elWaiting) elWaiting.textContent = countWaiting;

  const total = countD4 + countD11 + countCalls + countWaiting;
  if (elTotal) elTotal.textContent = `${total} prioridades`;

  if (listContainer) {
    if (priorityClinics.length === 0) {
      listContainer.innerHTML = `<span style="padding: 4px 8px; color: var(--text-muted);">Nenhuma pendência prioritária hoje. Você está em dia!</span>`;
    } else {
      listContainer.innerHTML = priorityClinics.slice(0, 10).map(item => {
        let tagColor = "#38bdf8";
        let tagText = "Aguardando";
        if (item.badgeType === "d4") { tagColor = "#fb923c"; tagText = "D+4 Vencido"; }
        if (item.badgeType === "d11") { tagColor = "#ef4444"; tagText = "D+11 Despedida"; }
        if (item.badgeType === "call") { tagColor = "#c084fc"; tagText = "Ligação Marcada"; }

        return `
          <div onclick="openApproachModal('${item.clinic.id}')" style="cursor: pointer; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 6px; padding: 4px 10px; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; flex-shrink: 0;">
            <span style="color: ${tagColor}; font-weight: 700; font-size: 0.72rem;">${tagText}</span>
            <span style="color: #fff; font-weight: 600;">${item.clinic.nome}</span>
            <span style="color: var(--text-muted); font-size: 0.7rem;">(${item.clinic.bairro})</span>
          </div>
        `;
      }).join("");
    }
  }
}

function setApproachFilter(filterType) {
  currentApproachFilter = (currentApproachFilter === filterType) ? null : filterType;
  
  // Atualiza botões
  const btnHoje = document.getElementById("btnFilterHoje");
  const btnD4 = document.getElementById("btnFilterFollowup4");
  const btnD11 = document.getElementById("btnFilterFollowup11");
  const btnCalls = document.getElementById("btnFilterCalls");
  const btnWaiting = document.getElementById("btnFilterWaiting");

  [btnHoje, btnD4, btnD11, btnCalls, btnWaiting].forEach(btn => {
    if (btn) btn.classList.remove("active");
  });

  if (currentApproachFilter === "hoje" && btnHoje) btnHoje.classList.add("active");
  if (currentApproachFilter === "d4" && btnD4) btnD4.classList.add("active");
  if (currentApproachFilter === "d11" && btnD11) btnD11.classList.add("active");
  if (currentApproachFilter === "call" && btnCalls) btnCalls.classList.add("active");
  if (currentApproachFilter === "waiting" && btnWaiting) btnWaiting.classList.add("active");

  applyFilters();
}

