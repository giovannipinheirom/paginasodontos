import fs from 'fs';
import './js/clinicas-extra.js';

// Load clinicas-data.js into a simulated context
const clinicasDataContent = fs.readFileSync('./js/clinicas-data.js', 'utf8');
const CLINICAS_DATA = eval(`(function() { ${clinicasDataContent}; return CLINICAS_DATA; })()`);

// Load approach-engine.js
const approachEngineContent = fs.readFileSync('./js/approach-engine.js', 'utf8');
const ApproachEngine = eval(`(function() { 
  const module = { exports: {} }; 
  const root = globalThis;
  ${approachEngineContent}; 
  return module.exports; 
})()`);

console.log("=== INICIANDO TESTE DO MOTOR DE ABORDAGEM ===");

// 1. TESTE DE ACEITAÇÃO: House Dent's Odontologia e Estética
const houseDent = CLINICAS_DATA.find(c => c.id === 'house-dent-s-odontologia-e-jaragua');
if (!houseDent) {
  console.error("❌ ERRO: Clínica House Dent's não encontrada!");
  process.exit(1);
}

// Simula 21:00 em São Paulo
// ISO 2026-10-15T21:00:00-03:00 = 2026-10-16T00:00:00Z
const simulatedDate21h = new Date('2026-10-15T21:00:00-03:00');

const appDataHouse = {
  nomeDecisor: "",
  tratamento: "doutor(a)",
  falandoCom: "dentista",
  etapa: "falando_dentista"
};

const resultHouse = ApproachEngine.generateApproachActions(houseDent, appDataHouse, {
  simulatedDate: simulatedDate21h,
  seuNome: "Giovanni"
});

const actionC = resultHouse.actions.find(a => a.id === 'C');
const actionD = resultHouse.actions.find(a => a.id === 'D');

const expectedC = "Boa noite, doutor(a)! Me chamo Giovanni, vou ser rápido. Vi a House Dent's Odontologia e Estética no Google: nota 5,0, com 51 avaliações. E lá aparece que vocês atendem 24 horas. É isso mesmo?";
const expectedD = "Quem está com dor à noite no Jaraguá pesquisa no Google e liga para o primeiro que mostra telefone e horário. Hoje vocês aparecem só no mapa, sem uma página que deixe isso claro. Pensando nisso, montei uma prévia de como ficaria a página da House Dent's Odontologia e Estética, com os dados reais de vocês. Posso te mandar um vídeo de 10 segundos?";

console.log("\n--- TESTE BOTÃO C ---");
console.log("Gerado:  ", actionC.text);
console.log("Esperado:", expectedC);
if (actionC.text.trim() === expectedC.trim()) {
  console.log("✅ BOTÃO C APROVADO COM SUCESSO 100% EXATO!");
} else {
  console.error("❌ BOTÃO C DIVERGE DO ESPERADO!");
  process.exit(1);
}

console.log("\n--- TESTE BOTÃO D ---");
console.log("Gerado:  ", actionD.text);
console.log("Esperado:", expectedD);
if (actionD.text.trim() === expectedD.trim()) {
  console.log("✅ BOTÃO D APROVADO COM SUCESSO 100% EXATO!");
} else {
  console.error("❌ BOTÃO D DIVERGE DO ESPERADO!");
  process.exit(1);
}

// 2. VERIFICAÇÃO DE REGRAS ESTREITAS
console.log("\n--- TESTE DE REGRAS GERAIS ---");

// Teste em todas as mensagens do House Dent
resultHouse.actions.forEach(a => {
  if (a.text.includes("[nome]") || a.text.includes("{") || a.text.includes("}")) {
    console.error(`❌ Placeholder vazado na ação ${a.id}:`, a.text);
    process.exit(1);
  }
  if (["B", "C", "C2"].includes(a.id)) {
    if (a.text.toLowerCase().includes("fiz um site") || a.text.toLowerCase().includes("montei uma prévia")) {
      console.error(`❌ Menção proibida na primeira mensagem (${a.id}):`, a.text);
      process.exit(1);
    }
  }
  if (["C", "D", "E", "F"].includes(a.id)) {
    if (a.text.includes("http://") || a.text.includes("https://")) {
      console.error(`❌ Link não permitido na ação ${a.id}:`, a.text);
      process.exit(1);
    }
  }
});
console.log("✅ Nenhuma mensagem contém placeholders ou menções prematuras.");
console.log("✅ Botões C, D, E e F não contêm links.");

// 3. TESTE BOTÃO G DESATIVADO QUANDO SEM PRÉVIA
console.log("\n--- TESTE BOTÃO G SEM PRÉVIA ---");
const houseSemPrevia = Object.assign({}, houseDent, { status: "pendente" });
const resultSemPrevia = ApproachEngine.generateApproachActions(houseSemPrevia, { linkPrevia: "" });
const actionG = resultSemPrevia.actions.find(a => a.id === 'G');
if (actionG.disabled && actionG.disabledReason === "Gerar a prévia antes") {
  console.log("✅ Botão G corretamente desativado quando sem prévia:", actionG.disabledReason);
} else {
  console.error("❌ Falha no bloqueio do botão G sem prévia!");
  process.exit(1);
}

// 4. TESTE TELEFONE FIXO (TEM_WHATSAPP = 'não')
console.log("\n--- TESTE TELEFONE FIXO ---");
const clinicaFixo = CLINICAS_DATA.find(c => {
  const ex = globalThis.CLINICAS_EXTRA[c.id];
  return ex && ex.tw === "não";
});
if (clinicaFixo) {
  const resultFixo = ApproachEngine.generateApproachActions(clinicaFixo);
  const waActions = resultFixo.actions.filter(a => a.isWhatsApp);
  const allWaDisabled = waActions.every(a => a.disabled);
  const actionA = resultFixo.actions.find(a => a.id === 'A');
  if (allWaDisabled && !actionA.disabled) {
    console.log(`✅ Clínica com fixo (${clinicaFixo.nome}): botões WhatsApp desativados e Roteiro de Ligação ativo.`);
  } else {
    console.error("❌ Falha na regra de telefone fixo!");
    process.exit(1);
  }
}

// 5. TESTE DE 3 CLÍNICAS COM ÂNGULOS DIFERENTES
console.log("\n--- 3 CLÍNICAS COM ÂNGULOS DIFERENTES ---");
const slugs = [
  "yassuda-odontologia-guaianases", // Volume de avaliações / Reputação
  "beatriz-f-leme-jardim-ipanema-zona-oeste", // Fotos prontas
  "agm-odontologia-jardim-japao" // Concorrência ou outro
];

slugs.forEach(s => {
  const cl = CLINICAS_DATA.find(c => c.id === s);
  if (cl) {
    const res = ApproachEngine.generateApproachActions(cl, null, { simulatedDate: new Date('2026-10-15T10:00:00-03:00') });
    console.log(`\nCLÍNICA: ${cl.nome} (Bairro: ${cl.bairro})`);
    console.log(`Ângulo detectado: ${res.selectedAngle}`);
    console.log(`[C] Pergunta Dentista: ${res.actions.find(a => a.id === 'C').text}`);
    console.log(`[D] Consequência/Vídeo: ${res.actions.find(a => a.id === 'D').text}`);
  }
});

console.log("\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!");
