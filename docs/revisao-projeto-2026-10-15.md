# Revisão do projeto: melhorias de controle, gestão e produção

Data: 15/10/2026
Base: código deste repositório (painel `index.html` + `js/dashboard.js`, `gerar-previa.js`, `gerar-videos.mjs`, `templates/moderno`, 64 prévias em `previews/`, 3 vídeos) comparado com os 3 relatórios do Cowork:

- relatório completo do projeto (plano R$ 20 mil, planilha, templates, importação, gerador de vídeos);
- relatório do roteiro de abordagens;
- relatório do template de proposta (deck de 12 slides).

As prioridades vão de P0 (resolver antes de mandar qualquer prévia nova) a P3 (depois da validação dos primeiros clientes).

---

## P0: problemas que podem queimar leads ou ferir as regras do projeto

Itens encontrados nas prévias já geradas. As regras permanentes do relatório (seção 3: "nunca inventar dados", "sem depoimentos inventados", "sem banco de imagem", "faixa de prévia de demonstração") não estão sendo cumpridas.

| # | Problema | Onde | Evidência | Correção |
|---|---|---|---|---|
| 1 | **Endereço da Belo Sorriso em todas as 64 prévias** | `gerar-previa.js` troca só o bairro, não a rua | Ex.: `previews/dom-pinheiros` mostra "R. Luísa Crapsi Orsi, 238, Pinheiros" (o endereço real da DOM é Av. Pedroso de Morais, 809) | Substituir `{ENDERECO}` com o campo `ENDERECO` do JSON e regenerar as 64 |
| 2 | **Telefone da Belo Sorriso em 3 prévias de outras clínicas** | `clinica-falco-odontologia-e-cidade-dutra`, `harmonizacao-facial-chacara-santo-antonio-zona-sul`, `shekinah-odontologia-e-estetica-itaquera` | Contém (11) 98146-4161 | Mesmo ajuste: substituir todos os campos por tag, nunca por texto da Belo Sorriso |
| 3 | **Depoimentos inventados** ("Mariana S.", "Rodrigo F.", "Camila P.") | As 64 prévias | Mesmos 3 nomes e textos em todas | Trocar por cards de espaço reservado ("Espaço para uma avaliação real do Google"), como o relatório definiu |
| 4 | **Fotos de banco de imagem (Unsplash) com dentes e sorrisos** | Template Moderno: 10 imagens | `images.unsplash.com/...` no topo, nos serviços e no blog | Usar `FOTO_PRINCIPAL` do Google (497 de 500 têm) ou espaço reservado "Foto do consultório" |
| 5 | **Serviços que a clínica pode não oferecer** | Template Moderno fixa 6 cards (implantes, alinhadores, periodontia...) | A DOM tem no JSON "Estética dental, Clínica geral, Limpeza e prevenção" | Mostrar só `SERVICO_1..3` do JSON |
| 6 | **Botões "WhatsApp" que ligam para fixo e links quebrados** | Clínicas com `TEM_WHATSAPP = não` | `tel:+551138135064?text=...` (6 links quebrados só na DOM) e o texto "Conversar no WhatsApp" num link `tel:` | Quando não há WhatsApp, rótulo "Ligar" e `tel:` sem `?text=` (regra já descrita no relatório, seção 7) |
| 7 | **Sem faixa "Prévia de demonstração" e sem `noindex`** | As 64 prévias | 0 ocorrências | Faixa fixa no topo + `<meta name="robots" content="noindex, nofollow">` até o pagamento (regra 7 do relatório) |
| 8 | **Vídeos possivelmente com dados errados** | `videos/m-v-...` e `videos/sq-mais-...` (camada A) | O vídeo rola até o rodapé, que traz o endereço da Belo Sorriso e os depoimentos falsos | Rever os dois vídeos e gerar de novo depois das correções 1 a 4 |
| 9 | **Scripts do painel diferentes do roteiro aprovado** | Abas "Scripts", "Objeções" e "Proposta & PIX" do `index.html` | Follow-up D+11 com urgência falsa ("nosso servidor de testes irá desativar o subdomínio nesta sexta"); "página publicada e indexada em menos de 24 horas" (o prazo é 5 dias úteis); Presença Local com "manutenção ilimitada" (o combinado é até 2 alterações por mês); citação de resolução do CFO que não foi verificada | Trocar pelos textos do roteiro de abordagens (ligação, WhatsApp pós-ligação, D+4 lacuna, D+11 concorrente) e da proposta |

**Até corrigir os itens 1 a 7, não mande nenhuma prévia gerada pelo painel.** As prévias feitas à mão (Yassuda, WG no Lovable, Belo Sorriso) não têm esses problemas.

---

## P1: controle e gestão (o painel não mede o que o plano manda medir)

### 1.1 Modelo de dados do lead

Hoje o painel guarda só a etapa de cada clínica (`odonto_kanban_stages`) e um contador diário. A "planilha de controle" do plano pede bem mais. Campos a adicionar por clínica:

| Grupo | Campos |
|---|---|
| Datas | primeira abordagem, data de cada mudança de etapa, prévia pedida em, prévia enviada em, próximo follow-up, reunião marcada para |
| Contato | quem atendeu (recepção ou decisor), nome do dentista, WhatsApp do decisor, tentativas de ligação (manhã/almoço), canal (ligação, WhatsApp, visita) |
| Venda | plano fechado, valor do site, mensalidade, entrada paga (data e valor), saldo pago (data e valor), data de publicação, início da mensalidade |
| Qualidade | motivo de perda ("caro", "já tem", "conhecido faz", "sem resposta"), objeções ouvidas, o que o dentista pediu para mudar na prévia, notas livres |
| Conformidade | **"Não contatar"** (opt-out, regra 9), site existente confirmado (regra 10), perfil conferido em |
| Teste | grupo de teste (50+ avaliações vs. ponto ideal), camada A/B/C, tempo gasto em cada etapa (base para a expansão internacional) |

### 1.2 Etapas do funil

O Kanban atual (9 colunas) para no "Fechado". Etapas a adicionar:

- **Prévia pedida** (entre Decisor e Prévia enviada), para medir o "prévia em menos de 24h".
- **Entrada paga → Em produção → Publicado (saldo pago) → Cliente ativo**, para separar venda de caixa.
- **Não contatar**, separada de Arquivado.
- Follow-up dividido em **D+4** e **D+11**, com a data calculada sozinha a partir do envio.

### 1.3 KPIs com cálculo errado

| KPI | Como está | Problema | Como deveria ser |
|---|---|---|---|
| Caixa acumulado | R$ 800 ou R$ 1.000 por venda fechada | Conta o site inteiro no fechamento, mas o pagamento é 50/50 | Soma das entradas e saldos realmente pagos; mostrar à parte "contratado" e "recebido" (o plano pede os dois) |
| MRR | R$ 497 ou R$ 197 por venda fechada | A mensalidade só começa com a publicação | Só clientes com status Publicado/Ativo e mensalidade em dia |
| Abordagens hoje | +1 manual e +1 automático ao sair do backlog | Conta duas vezes a mesma clínica | Uma abordagem = primeira mudança de etapa da clínica no dia; o botão manual só para contatos fora do painel |
| Conversa com decisor | Conta "Prévia enviada" como decisor | A prévia muitas vezes vai pela recepção | Campo "falou com o decisor" (sim/não) |
| Resposta positiva | Reunião + fechados ÷ decisores | O plano mede sobre abordagens | Respostas positivas ÷ abordagens |
| Fechamento sobre positivas | Não existe | É um dos 7 indicadores do plano | Fechados ÷ respostas positivas (meta 20 a 30%, alerta < 12%) |
| Prévias em menos de 24h | Não existe | Idem | % de prévias com envio até 24h depois do pedido |
| "Gerar prévia" | Move a clínica para "Prévia enviada" e conta abordagem | Gerar não é enviar | Gerar só muda o status da prévia; o envio é uma ação separada |

### 1.4 Visões de controle que faltam

- **Fila do dia**: lista ordenada com o que fazer hoje (ligações do lote pelo `MELHOR_HORARIO_LIGAR`, follow-ups vencidos, prévias pedidas há mais de 12h, reuniões do dia, cobranças).
- **Placar do dia (17h)**: abordagens, decisores, positivas, prévias, vendas; fechamento do dia com um clique.
- **Revisão de sexta automática**: gráfico realizado × cronograma semanal (90/130/120/160 abordagens; 3/5/5/7 vendas), gargalo da semana destacado e ação de contingência sugerida pela tabela do plano (hoje o modal é só texto fixo).
- **Gatilhos de contingência por data**: caixa < R$ 8 mil em 26/10 e < R$ 14 mil em 02/11, com a ação correspondente.
- **Comparação entre os grupos de teste** (50+ avaliações vs. ponto ideal) na semana 1, para decidir a prioridade da semana 2.
- **Exclusividade por região**: alerta quando uma clínica fica a menos de 1 km de um cliente fechado (as coordenadas já estão no JSON). Promessa de exclusividade só vale se o painel ajudar a cumprir.
- **Unidades da mesma marca** (ex.: Belo Sorriso Vila Albano e Vila Andrade) ligadas entre si, para não abordar duas vezes e para oferecer pacote.

### 1.5 Persistência e segurança dos dados

- Tudo está em `localStorage`: um navegador, um dispositivo, e some se o cache for limpo. O backup manual ajuda, mas depende de lembrar.
  - Opção simples: servidor local (ver P2) gravando em `dados/estado.json`, com histórico no git.
  - Opção com celular: Google Sheets como banco (o relatório da proposta já pede a planilha conectada) ou Supabase.
- A senha `odonto2026` está em texto no `dashboard.js`. Qualquer pessoa que abra o código vê. Se o repositório ou o painel forem públicos, os dados das 500 clínicas, os scripts e os preços ficam expostos. Manter o repositório privado e não publicar o painel como site aberto; se precisar de acesso remoto, usar autenticação de verdade (Cloudflare Access, Netlify password ou Vercel protection).

---

## P1: produção (fábrica de prévias)

### 2.1 Templates

- Só o **Moderno** existe. **Profissional (96 clínicas) e Amigável (340) estão bloqueados**, ou seja, 436 das 500 clínicas, incluindo Yassuda e WG (top 2). É o maior gargalo de produção.
- Construir os dois pela especificação do relatório (seção 6), já com `data-video` nas seções.

### 2.2 Gerador de prévias (`gerar-previa.js`)

- Trocar o "localizar e substituir texto da Belo Sorriso" por **tags reais** (`{NOME_CLINICA}`, `{ENDERECO}`, `{SERVICO_1}`...), como o relatório pediu. É a causa dos itens P0 1, 2 e 5.
- Aplicar a **paleta** (`COR_PRIMARIA`, `COR_FUNDO`, `COR_DESTAQUE`, `COR_TEXTO`) via variáveis CSS. Hoje todas as prévias do Moderno têm a mesma cor, e a regra "paleta diferente da vizinha a 1 km" se perde.
- Usar `SELO`, `TEXTO_BOTAO`, `BARRA_LINHA_1/2`, `MAPA_EMBED`, `FOTO_PRINCIPAL`.
- **Validação depois de gerar**: falhar se sobrar `{TAG}`, "Crapsi", "98146", "Vila Albano" (fora da própria), nomes de depoimento, `unsplash` ou `?text=` em `tel:`.
- Gravar CSS/JS uma vez só (`previews/_assets/`) em vez de 64 cópias.
- Campo `RESPONSAVEL_TECNICO`/`CRO` visível como "[a preencher]" na prévia, mas **bloquear a publicação final** sem esses dados (regra do CFO).

### 2.3 Gerador de vídeos

- O `gerar-videos.mjs` atual grava **1920x1080 horizontal** com rolagem simples. O plano e o `LEIA-ME.txt` falam em **vertical 9:16 (1080x1920)**, que é o que abre bem no celular do dentista. O LEIA-ME está desatualizado em relação ao código.
- Sugestão: opção `--formato vertical|desktop`, com vertical como padrão, voltando o roteiro de zoom e seções (`data-video`) descrito no relatório (seção 8).
- `node_modules/ffmpeg-static/ffmpeg.exe` é binário de Windows; ele não roda em Linux/Mac. Isso some quando o `node_modules` sair do git (ver P2).

### 2.4 Prints automáticos para a proposta

O deck de proposta precisa de um "print da página" por clínica. O mesmo Playwright do gerador de vídeos pode salvar `prints/<SLUG>-celular.png` e `prints/<SLUG>-desktop.png` sozinho, dispensando o envio manual.

---

## P2: automação e integração

### 3.1 Servidor local do painel (`npm run painel`)

Um servidor Node pequeno resolve vários pontos de uma vez:

- serve o painel e as prévias (o `file://` atrapalha vídeos e mapas);
- botões **Gerar prévia** e **Gerar vídeo** de verdade no card (hoje o botão só abre um arquivo que já existe e o vídeo exige copiar um comando);
- grava o estado em arquivo (substitui o `localStorage`);
- gera os prints da proposta.

### 3.2 Uma única fonte de dados

- `clinicas-import.json` (500 registros) e `js/clinicas-data.js` (1,6 MB) têm o mesmo conteúdo com nomes de campos diferentes. Gerar o `.js` a partir do JSON com um script (`npm run dados`), nunca editar à mão.
- Status da prévia: hoje o painel considera "pronta" qualquer clínica Moderno. Ler do disco (existe `previews/<SLUG>/index.html`? existe `videos/<SLUG>.mp4`?) em vez de supor.

### 3.3 Proposta preenchida a partir do painel

- Botão "Gerar proposta" no card: preenche os campos do deck (CLINICA, BAIRRO, NOTA, AVALIACOES, FOTOS, OBSERVACAO_1/2 a partir do `DIAGNOSTICO`, PROCEDIMENTOS a partir dos serviços, DATA e VALIDADE automáticas, MESES = TICKET ÷ 497) e anexa o print.
- O que ainda falta no JSON para o deck: `FOTOS_NO_GOOGLE` já existe; faltam `RESPONSAVEL` (nome do dentista), `PROCEDIMENTO_PRINCIPAL` e `TICKET` (perguntar na chamada; o painel deve ter campo para isso).

### 3.4 Mensagens com um toque

- Botão que abre `wa.me/<numero>?text=<mensagem já preenchida>` com a `MENSAGEM_POS_LIGACAO` da clínica, `{SEU_NOME}` e `{LINK_PREVIA}` trocados. É envio individual (respeita a regra contra disparo em massa) e economiza tempo em 26 abordagens por dia.
- Lembrete de reunião 1h antes e follow-ups D+4/D+11 com o texto pronto da própria clínica.

---

## P2: higiene do repositório

| Item | Situação | Ação |
|---|---|---|
| `node_modules/` versionado | Centenas de arquivos, inclui `ffmpeg.exe` | Criar `.gitignore` com `node_modules/` e tirar do git |
| Vídeos `.mp4` no git | 43 MB; `.git` já com 76 MB | Tirar do git (ou usar Git LFS); vídeos são regeneráveis |
| Prévias geradas no git | 64 pastas com CSS/JS duplicados | Opcional: ignorar `previews/` e regenerar; ou manter só as enviadas |
| `LEIA-ME.txt` | Descreve vídeo vertical e pasta do Windows | Atualizar com o fluxo real (painel, gerar prévia, gerar vídeo) |
| Dados pessoais | Telefones e endereços de 500 clínicas | Repositório privado |

---

## P3: operação depois da venda (MRR)

O plano tem regras claras para depois do fechamento, mas nada no projeto as controla ainda:

1. **Onboarding**: checklist por cliente (briefing recebido: logo, fotos, CRO; domínio registrado; entrada paga; site publicado; saldo pago; depoimento pedido; indicação pedida).
2. **Cobrança recorrente**: vencimento fixo por cliente, status (em dia / atrasado), alerta com 10 dias de atraso (regra de suspensão). Integração com Asaas, Efí ou Mercado Pago quando o volume justificar.
3. **Rotina do Presença Local**: calendário de posts semanais por cliente, banco de fotos, modelos de resposta a avaliações (todos já estão na preparação do plano e ainda abertos), registro de horas por cliente (o plano estima 2 a 3h/mês e prevê delegar acima de 25 clientes).
4. **Upsell e retenção**: lembrete no mês 2 (Essencial → Presença Local com print da busca do bairro) e no mês 3 (Presença Local → Captação com relatório do Google Meu Negócio); churn mensal medido (o plano usa 3% numa projeção e 5% na outra).
5. **Indicações**: quem indicou, quem fechou, recompensa escolhida (R$ 100 ou mês grátis) e paga.
6. **Relatório mensal ao cliente** (buscas, ligações e cliques do Google Meu Negócio), que é o argumento do upsell e da retenção.
7. **Termo de 1 página e formulário de briefing**: ainda pendentes na preparação; modelos em `docs/` e link no script de fechamento.

---

## Decisões que você precisa tomar (inconsistências entre os documentos)

O painel e o deck usam valores diferentes. Definir uma vez e atualizar painel, deck, scripts e o plano:

| Tema | Versão A | Versão B | Onde está cada uma |
|---|---|---|---|
| Site no Essencial | R$ 800 | R$ 1.000 | A: `plano-clinicas.md` e deck de 12 slides. B: plano R$ 20 mil, prompt do Gemini e painel |
| Captação | R$ 1.297 + verba | a partir de R$ 997 + verba | A: `plano-clinicas.md`. B: plano R$ 20 mil |
| Início da mensalidade | mês seguinte à publicação | mês da publicação | A: `plano-clinicas.md` e deck. B: plano R$ 20 mil |
| Meta do 1º mês | R$ 12 mil, 2 a 3% de fechamento, mix 70/30 | R$ 20 mil, 4%, mix 50/50 | A: `plano-clinicas.md`. B: plano R$ 20 mil e painel |
| Nome do plano barato | Essencial | Site + Manutenção | Roteiro de vendas do plano R$ 20 mil |
| Prévia antes do contato | só para quem respondeu | top 5 a 8 de cada lote antes da ligação | A: `plano-clinicas.md`. B: plano R$ 20 mil |
| Deck de proposta | 12 slides (Slides do claude.ai) | 6 slides (prompt do Gemini) | Dois relatórios diferentes |
| Formato do vídeo | vertical 9:16 | desktop 16:9 | A: plano e LEIA-ME. B: código atual |

---

## Ordem sugerida de execução

1. **Hoje**: corrigir o gerador (tags reais, sem depoimentos, sem banco de imagem, botão Ligar/WhatsApp, faixa de demonstração + noindex) e regenerar as 64 prévias e os 2 vídeos da camada A. Corrigir os scripts do painel.
2. **Esta semana (antes da revisão de 16/10)**: modelo de dados com datas e valores, KPIs corrigidos, fila do dia, etapas novas no Kanban, opt-out.
3. **Semana 2**: templates Profissional e Amigável (libera 436 clínicas); vídeo vertical; servidor local com botões reais.
4. **Semana 3**: proposta gerada pelo painel com print automático; mensagens com um toque.
5. **A partir do 1º cliente**: onboarding, cobrança, rotina do Presença Local, indicações.
6. **Contínuo**: `.gitignore`, sair `node_modules` e vídeos do git, LEIA-ME atualizado.
