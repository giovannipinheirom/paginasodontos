# Guia de Templates: Nicho de Escolas de Idiomas

Este diretório contém os templates HTML/CSS para as páginas de prévia das escolas de idiomas.

Atualmente, o template ativo padrão é o `provisorio` (`templates/idiomas/provisorio/`), utilizado até a criação dos templates definitivos.

---

## 📁 Estrutura de Diretórios de um Template

Cada modelo de template deve residir em sua própria subpasta:

```text
templates/idiomas/<nome-do-template>/
├── index.html        (Página principal com placeholders)
├── css/
│   └── style.css     (Folhas de estilo dedicadas)
└── js/
    └── main.js       (Comportamentos e interatividades)
```

---

## 🏷️ Variáveis e Placeholders Suportados

O compilador injeta os dados de cada escola substituindo os marcadores no padrão `{{CAMPO}}`:

| Placeholder | Conteúdo Injetado | Exemplo |
| :--- | :--- | :--- |
| `{{NOME_CLINICA}}` | Nome da escola de idiomas | `Intellecti Idiomas` |
| `{{BAIRRO}}` | Bairro em São Paulo | `Jardim São Saverio` |
| `{{TITULO}}` | Título da chamada principal | `Aulas de Inglês em Jardim São Saverio.` |
| `{{SUBTITULO}}` | Subtítulo explicativo | `Metodologia personalizada para crianças e adultos.` |
| `{{SERVICO_1}}` | Curso principal | `Inglês para Iniciantes` |
| `{{SERVICO_2}}` | Segundo curso / modalidade | `Conversação em Inglês` |
| `{{SERVICO_3}}` | Terceiro curso / modalidade | `Aulas Particulares e em Turmas` |
| `{{NOTA}}` | Nota média no Google Maps | `4,9` ou `5,0` |
| `{{AVALIACOES}}` | Quantidade de avaliações | `79` |
| `{{TELEFONE}}` | Telefone formatado | `11 95253-1035` |
| `{{LINK_TELEFONE}}` | Link de discagem | `tel:+5511952531035` |
| `{{LINK_WHATSAPP}}` | Link direto da conversa | `https://wa.me/5511952531035` |
| `{{TEXTO_BOTAO}}` | Rótulo do botão de ação | `Falar com a escola no WhatsApp` |
| `{{ENDERECO}}` | Endereço completo verificado | `Rua Exemplo, 123 - Bairro, São Paulo - SP` |
| `{{HORARIO}}` | Horários de atendimento | `Seg a sex, 8h às 20h` |
| `{{MAPA_EMBED}}` | URL do Google Maps Embed | `https://maps.google.com/maps?...` |
| `{{SELO}}` | Texto de prova social | `4,9 no Google · 79 avaliações` |

---

## 🎬 Requisitos para Gravação do Vídeo Raio-x

Os robôs de gravação de vídeo (`gerar-raiox.mjs` e `gerar-videos.mjs`) usam atributos `data-video` para navegar e simular o clique do cursor com precisão. **Todo novo template deve conter as seguintes marcações:**

1. `data-video="hero"`: No container de abertura / cabeçalho principal.
2. `data-video="servicos"`: Na seção de cursos ou diferenciais.
3. `data-video="sobre"`: Na seção sobre a escola e estrutura.
4. `data-video="cta"`: No bloco da chamada final para ação.
5. `data-video="whatsapp"`: **Obrigatório no link/botão do WhatsApp**. O robô moverá o cursor e acionará o clique exatamente neste elemento.
6. `.reveal-on-scroll`: Classes de animação suave para garantir que o Playwright ative os elementos visíveis na rolagem.

---

## 🚀 Como Adicionar um Novo Template e Torná-lo Padrão

1. Crie a pasta do novo template, por exemplo: `templates/idiomas/moderno/`.
2. Adicione os arquivos `index.html`, `css/style.css` e `js/main.js` seguindo os requisitos acima.
3. Abra `nichos.config.js` e altere a chave `templatePadrao` do nicho `idiomas`:
   ```javascript
   // nichos.config.js
   idiomas: {
     ...
     templatePadrao: 'moderno', // alterado de 'provisorio' para 'moderno'
     ...
   }
   ```
4. Pronto! O comando `node gerar-previa.js <id>` passará a usar automaticamente o novo template para todas as escolas.
