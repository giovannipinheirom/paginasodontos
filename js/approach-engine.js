/**
 * OdontoWebsites - Motor de Abordagem & Geração de Mensagens
 * Implementação das 5 etapas de prospecção, banco de dor por ângulo,
 * cálculo de fuso horário de São Paulo, regras estritas de copy e gestão de CRM.
 */

(function(root) {

  const SEU_NOME_DEFAULT = "Giovanni";

  // 11 Categorias Oficiais do Banco de Perguntas de Dor (Seção 5)
  const ANGLE_TYPES = {
    URGENCIA_24H: "Urgência 24h",
    HORARIO_ESTENDIDO: "Horário estendido / Sábado / Domingo",
    PERFIL_SEM_DONO: "Perfil sem dono / Presença",
    REPUTACAO: "Reputação / Volume de avaliações",
    FOTOS_PRONTAS: "Fotos prontas / Visual",
    CONCORRENCIA: "Concorrência / Dominar o bairro",
    TICKET_ALTO: "Ticket alto / Especialização",
    MARCA_PESSOAL: "Marca pessoal",
    TUDO_NUM_LUGAR: "Tudo num lugar",
    ACESSIBILIDADE: "Acessibilidade",
    RESERVA: "RESERVA (Padrão)"
  };

  // Etapas do Funil de Abordagem (Seção 6)
  const APPROACH_STAGES = [
    { key: "novo", title: "Novo / A Contatar", icon: "📋", defaultAction: "B" },
    { key: "recepcao_contatada", title: "Recepção Contatada", icon: "📞", defaultAction: "C2" },
    { key: "falando_dentista", title: "Falando com Dentista", icon: "💬", defaultAction: "C" },
    { key: "pergunta_enviada", title: "Pergunta Enviada", icon: "❓", defaultAction: "D" },
    { key: "video_oferecido", title: "Vídeo Oferecido", icon: "🎬", defaultAction: "G" },
    { key: "previa_enviada", title: "Prévia Enviada", icon: "🚀", defaultAction: "H" },
    { key: "ligacao_marcada", title: "Ligação Marcada", icon: "📅", defaultAction: "I" },
    { key: "fechado", title: "Fechado", icon: "🟢", defaultAction: null },
    { key: "encerrado", title: "Encerrado", icon: "⚪", defaultAction: null }
  ];

  /**
   * Obtém a saudação conforme horário em São Paulo (America/Sao_Paulo)
   * Antes de 12h: "Bom dia"
   * De 12h a 18h: "Boa tarde"
   * Depois de 18h: "Boa noite"
   */
  function getSaudacao(targetDate = null) {
    const d = targetDate ? new Date(targetDate) : new Date();
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: 'numeric',
      hour12: false
    });
    const hour = parseInt(formatter.format(d), 10);
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  /**
   * Formata o tratamento do decisor.
   * Se houver NOME_DECISOR, usar "Dr. Nome" ou "Dra. Nome".
   * Sem nome, "doutor(a)". Nunca deixar "[nome]" no texto final.
   */
  function formatTratamentoNome(nomeDecisor, tratamento = "doutor(a)") {
    const nome = (nomeDecisor || "").trim();
    if (!nome || nome === "[nome]" || nome.toLowerCase() === "doutor(a)") {
      return "doutor(a)";
    }
    const trat = (tratamento || "").trim();
    if (trat === "Dr." || trat === "Dra.") {
      return `${trat} ${nome}`;
    }
    return `Dr(a). ${nome}`;
  }

  /**
   * Resolve e normaliza os dados da clínica combinando CLINICAS_DATA e CLINICAS_EXTRA
   */
  function resolveClinicData(c) {
    if (!c) return {};
    const slug = c.id || c.slug || c.SLUG || "";
    const extra = (typeof CLINICAS_EXTRA !== "undefined" && CLINICAS_EXTRA[slug]) ? CLINICAS_EXTRA[slug] : {};

    // Prioriza nome do Google para coincidir com o perfil real
    const nomeClinica = (extra.nomeGoogle || c.nomeGoogle || c.nome || c.NOME_CLINICA || "").trim();
    const bairro = (c.bairro || c.BAIRRO || "").trim();
    const nota = (c.nota || c.NOTA || "").trim();
    const avaliacoes = (c.avaliacoes || c.AVALIACOES || "").trim();
    const horario = (c.horario || c.HORARIO || "").trim();
    const fotosNoGoogle = extra.fotos !== undefined ? extra.fotos : parseInt(c.fotosNoGoogle || c.FOTOS_NO_GOOGLE || "0", 10);
    
    // Tratamento de WhatsApp: sim / não
    let temWhatsapp = "sim";
    if (extra.tw) {
      temWhatsapp = extra.tw;
    } else if (c.temWhatsapp) {
      temWhatsapp = c.temWhatsapp;
    } else if (c.TEM_WHATSAPP) {
      temWhatsapp = c.TEM_WHATSAPP;
    } else if (c.linkWhatsapp && c.linkWhatsapp.startsWith("tel:")) {
      temWhatsapp = "não";
    }

    const servico1 = extra.s1 || c.servico1 || c.SERVICO_1 || (c.servicos && c.servicos[0]) || "tratamentos odontológicos";
    const servico2 = extra.s2 || c.servico2 || c.SERVICO_2 || (c.servicos && c.servicos[1]) || "";
    const servico3 = extra.s3 || c.servico3 || c.SERVICO_3 || (c.servicos && c.servicos[2]) || "";

    const melhorHorario = extra.melhorHorario || c.melhorHorario || c.MELHOR_HORARIO_LIGAR || "9h às 11h";
    const telefone = c.telefone || c.TELEFONE || "";
    const telefoneFormatado = c.telefoneFormatado || (telefone ? "55" + telefone.replace(/\D/g, "") : "");
    const linkTelefone = c.linkTelefone || c.LINK_TELEFONE || `tel:+${telefoneFormatado}`;
    const linkWhatsapp = c.linkWhatsapp || c.LINK_WHATSAPP || `https://wa.me/${telefoneFormatado}`;

    const anguloStr = c.angulo || c.ANGULO || "";
    const prefix = anguloStr.split(":")[0].trim();

    return {
      slug,
      nomeClinica,
      bairro,
      nota,
      avaliacoes,
      horario,
      fotosNoGoogle,
      temWhatsapp,
      servico1,
      servico2,
      servico3,
      melhorHorario,
      telefone,
      telefoneFormatado,
      linkTelefone,
      linkWhatsapp,
      rawAngulo: anguloStr,
      detectedAnglePrefix: prefix
    };
  }

  /**
   * Mapeia o prefixo textual do ângulo para uma das 11 categorias
   */
  function detectAngleCategory(prefix) {
    const p = (prefix || "").toLowerCase();
    if (p.includes("24h") || p.includes("urgência")) return ANGLE_TYPES.URGENCIA_24H;
    if (p.includes("horário") || p.includes("cedo") || p.includes("domingo") || p.includes("sábado")) return ANGLE_TYPES.HORARIO_ESTENDIDO;
    if (p.includes("perfil") || p.includes("presença") || p.includes("crescer")) return ANGLE_TYPES.PERFIL_SEM_DONO;
    if (p.includes("reputação") || p.includes("zero") || p.includes("nota") || p.includes("volume")) return ANGLE_TYPES.REPUTACAO;
    if (p.includes("foto") || p.includes("visual") || p.includes("material")) return ANGLE_TYPES.FOTOS_PRONTAS;
    if (p.includes("concorrência") || p.includes("dominar")) return ANGLE_TYPES.CONCORRENCIA;
    if (p.includes("ticket") || p.includes("especialização") || p.includes("nicho")) return ANGLE_TYPES.TICKET_ALTO;
    if (p.includes("marca")) return ANGLE_TYPES.MARCA_PESSOAL;
    if (p.includes("tudo num lugar")) return ANGLE_TYPES.TUDO_NUM_LUGAR;
    if (p.includes("acessibilidade")) return ANGLE_TYPES.ACESSIBILIDADE;
    return ANGLE_TYPES.RESERVA;
  }

  /**
   * Gera observação, dor e consequência da Seção 5 aplicando regras de dados
   */
  function getAngleContent(angleType, cData) {
    const { nomeClinica, bairro, nota, avaliacoes, horario, fotosNoGoogle, servico1, servico2, servico3 } = cData;

    const temAvaliacoes = nota && avaliacoes;
    const textoAvaliacoes = temAvaliacoes ? `nota ${nota}, com ${avaliacoes} avaliações` : (nota ? `nota ${nota}` : "");

    // Regras estritas de dados:
    if (angleType === ANGLE_TYPES.FOTOS_PRONTAS && fotosNoGoogle < 5) {
      angleType = ANGLE_TYPES.RESERVA;
    }
    if (angleType === ANGLE_TYPES.HORARIO_ESTENDIDO && (!horario || horario.toLowerCase().includes("não informado"))) {
      angleType = ANGLE_TYPES.RESERVA;
    }
    if (angleType === ANGLE_TYPES.REPUTACAO && !temAvaliacoes) {
      angleType = ANGLE_TYPES.RESERVA;
    }
    if (angleType === ANGLE_TYPES.TUDO_NUM_LUGAR && (!servico1 || !servico2)) {
      angleType = ANGLE_TYPES.RESERVA;
    }

    switch (angleType) {
      case ANGLE_TYPES.URGENCIA_24H:
        return {
          tipo: ANGLE_TYPES.URGENCIA_24H,
          observacao: textoAvaliacoes
            ? `Vi a ${nomeClinica} no Google: ${textoAvaliacoes}. E lá aparece que vocês atendem 24 horas.`
            : `Vi a ${nomeClinica} no Google e lá aparece que vocês atendem 24 horas.`,
          perguntaDor: `É isso mesmo?`,
          consequencia: `Quem está com dor à noite no ${bairro} pesquisa no Google e liga para o primeiro que mostra telefone e horário. Hoje vocês aparecem só no mapa, sem uma página que deixe isso claro.`
        };

      case ANGLE_TYPES.HORARIO_ESTENDIDO:
        return {
          tipo: ANGLE_TYPES.HORARIO_ESTENDIDO,
          observacao: `Vi no Google que vocês atendem ${horario}, o que ajuda muito quem trabalha.`,
          perguntaDor: `Esses pacientes que precisam desse horário chegam mais por indicação ou pesquisando no Google?`,
          consequencia: `Quem trabalha o dia todo pesquisa dentista no celular e escolhe quem mostra o horário logo de cara. Hoje esse diferencial de vocês fica escondido no mapa.`
        };

      case ANGLE_TYPES.PERFIL_SEM_DONO:
        return {
          tipo: ANGLE_TYPES.PERFIL_SEM_DONO,
          observacao: nota
            ? `Vi a ${nomeClinica} no Google, com nota ${nota}, mas sem um site ligado ao perfil.`
            : `Vi a ${nomeClinica} no Google, mas sem um site ligado ao perfil.`,
          perguntaDor: `Hoje alguém da clínica cuida desse perfil do Google?`,
          consequencia: `O perfil é a primeira coisa que o paciente novo vê. Sem site, ele não encontra tratamentos, fotos nem um botão para chamar, e acaba ligando para a clínica do lado.`
        };

      case ANGLE_TYPES.REPUTACAO:
        return {
          tipo: ANGLE_TYPES.REPUTACAO,
          observacao: `Vi que a ${nomeClinica} tem nota ${nota} no Google, com ${avaliacoes} avaliações. Isso é raro.`,
          perguntaDor: `Quando alguém vê essa nota e quer saber mais sobre os tratamentos, para onde ele vai hoje?`,
          consequencia: `Essa reputação é o que convence o paciente, mas hoje ela fica só no mapa. Uma página mostra a nota, os tratamentos e o botão de WhatsApp no mesmo lugar, e o paciente decide ali.`
        };

      case ANGLE_TYPES.FOTOS_PRONTAS:
        return {
          tipo: ANGLE_TYPES.FOTOS_PRONTAS,
          observacao: `Vi que vocês têm ${fotosNoGoogle} fotos da clínica no Google, muito bem cuidadas.`,
          perguntaDor: `Hoje essas fotos aparecem em algum lugar além do mapa?`,
          consequencia: `O paciente decide muito pelo ambiente antes de marcar. Essas fotos já estão prontas e poderiam estar trabalhando por vocês numa página.`
        };

      case ANGLE_TYPES.CONCORRENCIA:
        return {
          tipo: ANGLE_TYPES.CONCORRENCIA,
          observacao: `Pesquisei dentista no ${bairro} e aparecem várias clínicas perto de vocês no Google.`,
          perguntaDor: `Hoje o paciente novo chega mais por indicação ou pela pesquisa?`,
          consequencia: `Quando o paciente compara clínicas no mapa, quem tem site passa mais confiança e recebe a ligação. Hoje vocês competem só com o mapa.`
        };

      case ANGLE_TYPES.TICKET_ALTO:
        return {
          tipo: ANGLE_TYPES.TICKET_ALTO,
          observacao: `Vi que vocês fazem ${servico1}.`,
          perguntaDor: `Quem procura esse tratamento costuma comparar várias clínicas antes de marcar a avaliação, né?`,
          consequencia: `Num tratamento desse valor, o paciente pesquisa bastante e escolhe quem explica melhor. Hoje ele não encontra nada da ${nomeClinica} além do mapa.`
        };

      case ANGLE_TYPES.MARCA_PESSOAL:
        return {
          tipo: ANGLE_TYPES.MARCA_PESSOAL,
          observacao: `Vi que a clínica leva o nome do(a) doutor(a), e as avaliações falam muito do seu atendimento.`,
          perguntaDor: `Quem chega por indicação costuma pesquisar seu nome antes de ligar?`,
          consequencia: `Quando a pessoa pesquisa o seu nome, hoje encontra só o mapa. Uma página com a sua história e o botão de WhatsApp transforma essa indicação em consulta marcada.`
        };

      case ANGLE_TYPES.TUDO_NUM_LUGAR:
        const servicosTexto = servico3 ? `${servico1}, ${servico2} e ${servico3}` : `${servico1} e ${servico2}`;
        return {
          tipo: ANGLE_TYPES.TUDO_NUM_LUGAR,
          observacao: `Vi que vocês fazem ${servicosTexto}.`,
          perguntaDor: `O paciente sabe que encontra tudo isso aí ou muita gente acha que vocês fazem só clínica geral?`,
          consequencia: `Se o paciente não sabe o que vocês fazem, ele procura outra clínica para o tratamento que precisa. A página mostra tudo de uma vez.`
        };

      case ANGLE_TYPES.ACESSIBILIDADE:
        return {
          tipo: ANGLE_TYPES.ACESSIBILIDADE,
          observacao: `Vi no Google que a clínica tem acesso facilitado.`,
          perguntaDor: `Vocês atendem muitos pacientes que precisam disso?`,
          consequencia: `Quem precisa de acessibilidade pesquisa antes de sair de casa e escolhe quem deixa isso claro. Hoje essa informação fica escondida.`
        };

      case ANGLE_TYPES.RESERVA:
      default:
        return {
          tipo: ANGLE_TYPES.RESERVA,
          observacao: nota 
            ? `Vi a ${nomeClinica} no Google, com nota ${nota}.`
            : `Vi a ${nomeClinica} no Google.`,
          perguntaDor: `Hoje o paciente novo chega mais por indicação ou pelo Google?`,
          consequencia: `Mesmo quem chega por indicação pesquisa o nome da clínica antes de ligar, e hoje encontra só o mapa. Uma página faz essa pessoa marcar.`
        };
    }
  }

  /**
   * Gerenciamento de Persistência no LocalStorage
   */
  function getStorageKey(clinicId) {
    return `odonto_approach_${clinicId}`;
  }

  function getClinicApproachData(clinicId, clinicObj = null) {
    let data = {};
    if (typeof localStorage !== "undefined") {
      try {
        const raw = localStorage.getItem(getStorageKey(clinicId));
        if (raw) data = JSON.parse(raw);
      } catch (e) {
        console.error("Erro ao ler abordagem do localStorage:", e);
      }
    }

    const cData = clinicObj ? resolveClinicData(clinicObj) : { slug: clinicId };

    // Valores padrão
    const defaults = {
      nomeDecisor: "",
      tratamento: "doutor(a)",
      nomeRecepcao: "",
      falandoCom: "recepção",
      etapa: "novo",
      dataUltimoContato: null,
      respostaDor: "",
      linkPrevia: (clinicObj && clinicObj.status === "pronta") 
        ? `https://www.odontowebsites.com.br/previews/${cData.slug}/index.html` 
        : "",
      linkVideo: "",
      obs: "",
      tipoAngulo: detectAngleCategory(cData.detectedAnglePrefix),
      horarioLigacaoMarcada: ""
    };

    return Object.assign({}, defaults, data);
  }

  function saveClinicApproachData(clinicId, patch) {
    const current = getClinicApproachData(clinicId);
    const updated = Object.assign({}, current, patch);
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(getStorageKey(clinicId), JSON.stringify(updated));
      } catch (e) {
        console.error("Erro ao salvar abordagem no localStorage:", e);
      }
    }
    return updated;
  }

  /**
   * Calcula diferença em dias a partir da data ISO
   */
  function getDaysSinceContact(dateIso) {
    if (!dateIso) return null;
    const last = new Date(dateIso).getTime();
    if (isNaN(last)) return null;
    const now = Date.now();
    return Math.floor((now - last) / (1000 * 60 * 60 * 24));
  }

  /**
   * Determina qual ação aparece em destaque com base na etapa e no tempo
   */
  function getRecommendedActionKey(etapa, approachData, cData) {
    if (cData.temWhatsapp !== "sim") {
      return "A";
    }

    switch (etapa) {
      case "novo":
        return approachData.falandoCom === "dentista" ? "C" : "B";
      case "recepcao_contatada":
        return "C2";
      case "falando_dentista":
        return "C";
      case "pergunta_enviada":
        return "D";
      case "video_oferecido":
        return "G";
      case "previa_enviada":
        const dias = getDaysSinceContact(approachData.dataUltimoContato);
        if (dias !== null && dias >= 11) return "K";
        if (dias !== null && dias >= 4) return "J";
        return "H";
      case "ligacao_marcada":
        return "I";
      case "fechado":
      case "encerrado":
        return null;
      default:
        return "B";
    }
  }

  /**
   * Gera todas as ações [A] até [K] para uma clínica
   */
  function generateApproachActions(clinic, approachData = null, options = {}) {
    const cData = resolveClinicData(clinic);
    const appData = approachData || getClinicApproachData(cData.slug, clinic);

    const targetDate = options.simulatedDate ? new Date(options.simulatedDate) : new Date();
    const saudacao = getSaudacao(targetDate);
    const seuNome = options.seuNome || (typeof localStorage !== "undefined" && localStorage.getItem("odonto_user_name")) || SEU_NOME_DEFAULT;

    const nomeDecisor = (appData.nomeDecisor || "").trim();
    const tratamento = appData.tratamento || "doutor(a)";
    const tratamentoNome = formatTratamentoNome(nomeDecisor, tratamento);

    const selectedAngle = appData.tipoAngulo || detectAngleCategory(cData.detectedAnglePrefix);
    const angleContent = getAngleContent(selectedAngle, cData);

    const temWhatsapp = cData.temWhatsapp === "sim";

    // Link de prévia publicado (vazio até a prévia existir)
    let linkPrevia = appData.linkPrevia || "";
    if (!linkPrevia && clinic && clinic.status === "pronta") {
      linkPrevia = `https://www.odontowebsites.com.br/previews/${cData.slug}/index.html`;
    }

    // [A] Roteiro de ligação
    const scriptA = {
      id: "A",
      key: "roteiro_ligacao",
      label: "Roteiro de Ligação",
      icon: "📞",
      isPhone: true,
      melhorHorario: cData.melhorHorario,
      linkTelefone: cData.linkTelefone,
      telefone: cData.telefone,
      text: `RECEPÇÃO:
1. ${saudacao}, tudo bem? Aqui é o ${seuNome}. É da ${cData.nomeClinica}?
2. Vi a nota ${cData.nota} de vocês no Google, com ${cData.avaliacoes} avaliações. Parabéns!
3. Vocês recebem muita ligação perguntando endereço, horário ou se fazem ${cData.servico1}?
4. Eu ajudo clínicas a deixar isso pronto para o paciente. Quem decide sobre a divulgação, o(a) doutor(a)? Qual o melhor jeito de falar com ele(a): WhatsApp ou um horário para eu ligar?

DENTISTA:
1. Apresentação em uma frase e pedido de 1 minuto.
2. ${angleContent.observacao} ${angleContent.perguntaDor} (Ficar em silêncio e ouvir a resposta)
3. ${angleContent.consequencia}
4. Montei uma prévia com os dados reais de vocês. Posso te mandar agora pelo WhatsApp e a gente olha junto?`,
      nextStage: "recepcao_contatada"
    };

    // [B] Mensagem para a recepção
    const scriptB = {
      id: "B",
      key: "msg_recepcao",
      label: "Mensagem p/ Recepção",
      icon: "💬",
      isWhatsApp: true,
      text: `${saudacao}! Aqui é o ${seuNome}. Falo com a recepção da ${cData.nomeClinica}? Vi que vocês têm nota ${cData.nota} no Google, com ${cData.avaliacoes} avaliações, parabéns pelo atendimento. Uma pergunta rápida: hoje vocês recebem muita mensagem perguntando endereço, horário e se fazem ${cData.servico1}?`,
      nextStage: "recepcao_contatada"
    };

    // [C] Pergunta de dor para o(a) dentista
    const scriptC = {
      id: "C",
      key: "pergunta_dor",
      label: "Pergunta de Dor (Dentista)",
      icon: "❓",
      isWhatsApp: true,
      text: `${saudacao}, ${tratamentoNome}! Me chamo ${seuNome}, vou ser rápido. ${angleContent.observacao} ${angleContent.perguntaDor}`,
      nextStage: "pergunta_enviada"
    };

    // [C2] Pedir o contato do(a) dentista (resposta da recepção)
    const scriptC2 = {
      id: "C2",
      key: "pedir_contato",
      label: "Pedir Contato do Dentista",
      icon: "📱",
      isWhatsApp: true,
      text: `Imaginei! É exatamente isso que eu ajudo a resolver: deixar essas respostas prontas no Google para o paciente já chegar sabendo tudo e sobrar mais tempo para vocês. Quem decide essas coisas é o(a) doutor(a)? Você me passa o WhatsApp dele(a) ou prefere levar o assunto e eu te mando um vídeo curtinho para mostrar?`,
      nextStage: "falando_dentista"
    };

    // [D] Resposta: confirmou a dor
    const scriptD = {
      id: "D",
      key: "confirmou_dor",
      label: "Confirmou a Dor (Vídeo 10s)",
      icon: "🎯",
      isWhatsApp: true,
      text: `${angleContent.consequencia} Pensando nisso, montei uma prévia de como ficaria a página da ${cData.nomeClinica}, com os dados reais de vocês. Posso te mandar um vídeo de 10 segundos?`,
      nextStage: "video_oferecido"
    };

    // [E] Resposta: dado do Google está errado
    const scriptE = {
      id: "E",
      key: "dado_errado",
      label: "Dado do Google Errado",
      icon: "⚠️",
      isWhatsApp: true,
      text: `Então vale corrigir logo, porque tem paciente chegando com a informação errada. Isso eu resolvo junto com a página, e a informação certa fica em destaque. Posso te mandar um vídeo de 10 segundos de como ficaria?`,
      nextStage: "video_oferecido"
    };

    // [F] Resposta: "chega tudo por indicação" ou "não preciso"
    const scriptF = {
      id: "F",
      key: "so_indicacao",
      label: "\"Só Indicação\" / \"Não Preciso\"",
      icon: "🤝",
      isWhatsApp: true,
      text: `Faz sentido, indicação é o melhor paciente. Só um detalhe: quem recebe uma indicação quase sempre pesquisa o nome da clínica antes de ligar, e hoje só encontra o mapa. A página serve justamente para essa pessoa. Posso te mostrar em 10 segundos como ficaria?`,
      nextStage: "video_oferecido"
    };

    // [G] Enviar vídeo e prévia
    const temPreviaValida = !!linkPrevia;
    const scriptG = {
      id: "G",
      key: "enviar_previa",
      label: "Enviar Vídeo e Prévia",
      icon: "🎬",
      isWhatsApp: true,
      disabled: !temPreviaValida,
      disabledReason: temPreviaValida ? null : "Gerar a prévia antes",
      screenReminder: "Lembrete: anexe o vídeo de 10 segundos antes de enviar no WhatsApp.",
      text: temPreviaValida
        ? `Aqui está: ${linkPrevia}\n\nUsei a nota, o endereço, o horário e os serviços que já estão no Google de vocês. Tudo pode ser ajustado. O que achou?`
        : `Gerar a prévia antes`,
      nextStage: "previa_enviada"
    };

    // [H] Pedir a ligação de 10 minutos
    const scriptH = {
      id: "H",
      key: "pedir_call",
      label: "Pedir Call de 10 min",
      icon: "⏱️",
      isWhatsApp: true,
      text: `Que bom que gostou! Posso te ligar 10 minutinhos para mostrar como funciona e o que dá para ajustar? Qual o melhor horário para você, hoje ou amanhã?`,
      objecaoPreco: `Depende de como vocês querem usar a página, por isso prefiro te mostrar rapidinho. Em 10 minutos você já sai com o valor certinho. Que horário fica bom?`,
      nextStage: "ligacao_marcada"
    };

    // [I] Mensagem pós-ligação
    const scriptI = {
      id: "I",
      key: "pos_ligacao",
      label: "Pós-Ligação",
      icon: "🤝",
      isWhatsApp: true,
      text: `${tratamentoNome}, aqui é o ${seuNome}, da ligação de agora. Obrigado pelo tempo. Como combinamos, aqui está a prévia da ${cData.nomeClinica}: ${linkPrevia || '[Link da Prévia]'}\n\nFico no aguardo do que você achar.`,
      nextStage: "previa_enviada"
    };

    // [J] Follow-up D+4
    const diasSemResposta = getDaysSinceContact(appData.dataUltimoContato);
    const scriptJ = {
      id: "J",
      key: "followup_4",
      label: "Follow-up D+4",
      icon: "⏳",
      isWhatsApp: true,
      isDue: diasSemResposta !== null && diasSemResposta >= 4,
      diasPassados: diasSemResposta,
      text: `Oi, ${tratamentoNome}! Passando só para saber se conseguiu ver a prévia da ${cData.nomeClinica}. Se quiser, ajusto alguma coisa antes de você decidir. Faz sentido para vocês?`,
      nextStage: "previa_enviada"
    };

    // [K] Follow-up D+11 (último)
    const scriptK = {
      id: "K",
      key: "followup_11",
      label: "Follow-up D+11 (Despedida)",
      icon: "👋",
      isWhatsApp: true,
      isDue: diasSemResposta !== null && diasSemResposta >= 11,
      diasPassados: diasSemResposta,
      text: `${tratamentoNome}, vou encerrar por aqui para não incomodar. A prévia da ${cData.nomeClinica} fica no ar mais alguns dias, caso queira retomar. Obrigado pela atenção e sucesso para vocês!`,
      nextStage: "encerrado"
    };

    const actions = [scriptA, scriptB, scriptC, scriptC2, scriptD, scriptE, scriptF, scriptG, scriptH, scriptI, scriptJ, scriptK];

    // Regra estrita de Telefone Fixo (TEM_WHATSAPP = "não")
    if (!temWhatsapp) {
      actions.forEach(act => {
        if (act.isWhatsApp) {
          act.disabled = true;
          act.disabledReason = "Telefone fixo: ligue primeiro e peça o WhatsApp do(a) dentista";
        }
      });
    }

    const recommendedKey = getRecommendedActionKey(appData.etapa || "novo", appData, cData);
    const recommendedAction = actions.find(a => a.id === recommendedKey) || actions[0];

    return {
      clinic: cData,
      approachData: appData,
      actions,
      recommendedKey,
      recommendedAction,
      selectedAngle,
      angleContent,
      temWhatsapp
    };
  }

  // Exportação UMD / Global
  const ApproachEngine = {
    SEU_NOME_DEFAULT,
    ANGLE_TYPES,
    APPROACH_STAGES,
    getSaudacao,
    formatTratamentoNome,
    resolveClinicData,
    detectAngleCategory,
    getAngleContent,
    getClinicApproachData,
    saveClinicApproachData,
    getDaysSinceContact,
    getRecommendedActionKey,
    generateApproachActions
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = ApproachEngine;
  }
  if (root) {
    root.ApproachEngine = ApproachEngine;
  }

})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));

