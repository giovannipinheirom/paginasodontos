# Instruções para o Claude: Print do Google e Vídeo Raio-x por Clínica ou Escola

Use este roteiro sempre que o Giovanni pedir **o vídeo de uma ou mais clínicas odontológicas ou escolas de idiomas** (ex.: "gera o vídeo da WG Dentista", "vídeo da escola Intellecti Idiomas", "vídeo das escolas 1, 2 e 5").
Rode tudo dentro da pasta `paginasodontos-main`.

O vídeo Raio-x tem **20 s, 720p e menos de 10 MB** (cabe perfeitamente no WhatsApp):

| Tempo | Cena | De onde vem |
|---|---|---|
| 0–5 s | **Hoje** | Print do perfil no Google Maps (`prints/<id>.png`) com legenda dinâmica |
| 5–17 s | **Como poderia aparecer** | Prévia `previews/<id>/index.html` rolando do topo até a chamada final |
| 17–20 s | **O clique** | Cursor clica no botão da chamada final e fecha com o cartão configurado: "Um clique para o WhatsApp da recepção" (clínicas) ou "Um clique para o WhatsApp da escola" (escolas) |

---

## Regras Obrigatórias

- **Não publicar e não commitar** nada sem o ok do Giovanni.
- **Nunca resolver ou contornar CAPTCHA** nem verificação do Google. Se aparecer, pare e peça o print manual (passo 3).
- **Nunca usar um print falso ou de outra instituição.** O print precisa mostrar o perfil verificado correto.
- **Não alterar dados cadastrais** (`clinicas-import.json` ou `escolas-import.json`) por conta própria. Se o Google mostrar algo diferente dos dados, avise o Giovanni.
- **Não apagar vídeos nem prints** existentes. Para refazer, use `--force` no comando.
- **Sem falsas promessas:** para escolas, nunca usar termos médicos/CFO e nunca prometer fluência mágica em prazos falsos.

---

## Passo 0: Importação de Nova Planilha do Apify (Quando Necessário)

Sempre que o Giovanni fornecer um novo dataset exportado do Apify (Google Maps Scraper):

```bash
node importar-apify.mjs --nicho idiomas --arquivo "<caminho-do-arquivo.json ou .csv>"
```

O script detecta as colunas automaticamente, aplica os filtros de São Paulo, exclui franquias, remove duplicidades, calcula a pontuação e atualiza `escolas-import.json`, `js/escolas-data.js` e `js/escolas-extra.js`.

---

## Passo 1: Identificar o ID (SLUG) da Clínica ou Escola

O id é o `SLUG`, o mesmo nome da pasta da prévia (`previews/<id>/`). O Giovanni pode pedir pelo nome, pelo bairro ou pelo ranking.

### Para Clínicas Odontológicas:
```bash
node -e "const q=process.argv[1].toLowerCase();require('./clinicas-import.json').filter(c=>[c.SLUG,c.NOME_CLINICA,c.NOME_GOOGLE,c.BAIRRO,String(c.RANKING)].some(v=>String(v).toLowerCase().includes(q))).forEach(c=>console.log(c.RANKING,c.SLUG,'|',c.NOME_CLINICA,'|',c.BAIRRO))" "wg dentista"
```

### Para Escolas de Idiomas:
```bash
node -e "const q=process.argv[1].toLowerCase();require('./escolas-import.json').filter(c=>[c.SLUG,c.NOME_CLINICA,c.NOME_GOOGLE,c.BAIRRO,String(c.RANKING)].some(v=>String(v).toLowerCase().includes(q))).forEach(c=>console.log(c.RANKING,c.SLUG,'|',c.NOME_CLINICA,'|',c.BAIRRO))" "intellecti"
```

- **Um resultado:** siga com esse id.
- **Vários resultados:** mostre a lista ao Giovanni e pergunte qual é. Não escolha sozinho.
- **Nenhum resultado:** avise que o registro não está na base.

---

## Passo 2: Conferir se a Prévia Existe

```bash
node -e "console.log(fs.existsSync('previews/<id>/index.html') ? 'Existe' : 'Falta')"
```

Se não existir, gere a prévia (o script detecta o nicho automaticamente):

```bash
node gerar-previa.js <id>
```

- Clínicas usam o template **Moderno**.
- Escolas usam o template **Provisório de Idiomas** (`templates/idiomas/provisorio/`).
- Para gerar todas as escolas de uma vez: `node gerar-previa.js --all-escolas`.

---

## Passo 3: Tirar o Print do Google Maps

```bash
npm run print -- --only <id>
```

Para várias: `--only id-1,id-2`. Para forçar regravação: `--force`.
Para filtrar por nicho específico: `--nicho idiomas` ou `--nicho odonto`.

O script abre o link do Maps (`LINK_MAPS`), recusa cookies não essenciais, espera o perfil carregar e salva o painel em `prints/<id>.png`.

**Critérios de conferência do print:**
- O nome no topo bate com a instituição pedida (saída mostra ✔; ⚠️ indica divergência).
- O endereço bate com o bairro cadastrado.
- Nenhum aviso de cookies, banner ou janela cobre o perfil.

Se o Google pedir CAPTCHA ou verificação, **pare** e peça ao Giovanni:
> *"O Google pediu verificação. Pode abrir a instituição no Google Maps, tirar o print com Win+Shift+S e salvar como `prints/<id>.png`?"*

---

## Passo 4: Gerar o Vídeo Raio-x

```bash
node gerar-raiox.mjs --only <id>
```

- **Versão vertical (9:16) adicional:** acrescente `--vertical`.
- **Lote por nicho:** `node gerar-raiox.mjs --nicho idiomas` ou `node gerar-raiox.mjs --nicho odonto`.
- **Lote geral:** `npm run raiox` (grava tudo que tem print e não tem vídeo nos dois nichos).
- **Simular sem gravar:** `npm run raiox:simular`.

O comando leva cerca de 30–35 s por vídeo. O cartão final se adapta automaticamente ao nicho do registro ("WhatsApp da recepção" vs "WhatsApp da escola").

---

## Passo 5: Conferir o Vídeo

1. **Tamanho:** abaixo de 10 MB (o script recomprime automaticamente se ultrapassar).
2. **Duração e resolução:** `00:00:20` e `1280x720` (ou `720x1280` na versão vertical).
3. **Inspeção visual rápida de 3 quadros:**
   ```bash
   node -e "const {spawnSync}=require('child_process');const ff=require('ffmpeg-static');const fs=require('fs');fs.mkdirSync('videos/conferencia',{recursive:true});['2','10','18.5'].forEach(t=>spawnSync(ff,['-y','-ss',t,'-i','videos/<id>-raiox.mp4','-frames:v','1','videos/conferencia/<id>-'+t+'.jpg']));console.log('Frames salvos em videos/conferencia/');"
   ```
   Confira: 2s (print inicial), 10s (prévia rolando), 18.5s (cartão final e clique no botão). Após a checagem, a pasta pode ser limpa.

---

## Passo 6: Avisar o Giovanni

Responda em poucas linhas:
- O caminho do vídeo (`videos/<id>-raiox.mp4`), tamanho e tipo de botão detectado.
- Divergências notadas entre o print e o cadastro.
- Que o painel Hub (`index.html`) já atualizou e exibe o vídeo pronto com filtro por nicho (`Odonto` ou `Idiomas`).
