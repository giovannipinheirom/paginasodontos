# Instruções para o Claude: print do Google e vídeo Raio-x por clínica

Use este roteiro sempre que o Giovanni pedir **o vídeo de uma ou mais clínicas** (ex.: "gera o vídeo da WG Dentista", "vídeo das clínicas 12, 15 e 40").
Rode tudo dentro da pasta `paginasodontos-main`.

O vídeo Raio-x tem **20 s, 720p e menos de 10 MB** (cabe no WhatsApp):

| Tempo | Cena | De onde vem |
|---|---|---|
| 0–5 s | **Hoje** | Print do perfil da clínica no Google Maps (`prints/<id>.png`) |
| 5–17 s | **Como poderia aparecer** | Prévia `previews/<id>/index.html` rolando do topo até a chamada final |
| 17–20 s | **O clique** | Cursor clica no botão da chamada final e fecha com o cartão "Um clique para o WhatsApp da recepção" (ou "para ligar") |

---

## Regras

- **Não publicar e não commitar** nada sem o ok do Giovanni.
- **Nunca resolver ou contornar CAPTCHA** nem verificação do Google. Se aparecer, pare e peça o print manual (passo 3).
- **Nunca usar um print falso ou de outra clínica.** O print precisa mostrar a clínica certa.
- **Não alterar dados da clínica** (`clinicas-import.json`) por conta própria. Se o Google mostrar algo diferente dos dados, avise o Giovanni.
- **Não apagar vídeos nem prints** existentes. Para refazer, use `--force` no comando.

---

## Passo 1: identificar a clínica (id)

O id é o `SLUG`, o mesmo nome da pasta da prévia (`previews/<id>/`). O Giovanni pode pedir pelo nome, pelo bairro ou pelo ranking. Para achar:

```bash
node -e "const q=process.argv[1].toLowerCase();require('./clinicas-import.json').filter(c=>[c.SLUG,c.NOME_CLINICA,c.NOME_GOOGLE,c.BAIRRO,String(c.RANKING)].some(v=>String(v).toLowerCase().includes(q))).forEach(c=>console.log(c.RANKING,c.SLUG,'|',c.NOME_CLINICA,'|',c.BAIRRO))" "wg dentista"
```

- **Um resultado:** siga com esse id.
- **Vários resultados** (ex.: duas "Belo Sorriso"): mostre a lista ao Giovanni e pergunte qual é. Não escolha sozinho.
- **Nenhum resultado:** avise que a clínica não está na base.

## Passo 2: conferir se a prévia existe

```bash
ls previews/<id>/index.html
```

Se não existir, gere a prévia:

```bash
node gerar-previa.js <id>
```

## Passo 3: tirar o print do Google Maps

```bash
npm run print -- --only <id>
```

Para várias clínicas, separe os ids por vírgula: `--only id-1,id-2,id-3`. Para refazer um print, acrescente `--force`.

O script abre o link do Maps da clínica (`LINK_MAPS`), recusa os cookies não essenciais, espera o perfil carregar e salva o painel do perfil com parte do mapa em `prints/<id>.png`.

**Confira o print abrindo a imagem** (ferramenta Read em `prints/<id>.png`). Ele está bom quando:
- o nome no topo do painel é o da clínica pedida (a saída do script mostra ✔; um ⚠️ indica que o nome não bateu);
- o endereço bate com o bairro da clínica;
- nenhum aviso de cookies, login ou janela cobre o perfil.

Se o print não estiver bom:
1. Tente de novo com `--force`.
2. Se continuar errado, tente com o navegador visível: `npm run print -- --only <id> --force --ver`.
3. Se o Google pedir CAPTCHA ou verificação, **pare** e peça ao Giovanni:
   > "O Google pediu verificação. Pode abrir a clínica no Google Maps, tirar o print com Win+Shift+S e salvar como `prints/<id>.png`?"
   Espere ele confirmar que salvou antes de seguir.

**Anote as diferenças** entre o print e os dados da prévia e avise o Giovanni no final, sem corrigir sozinho. Exemplos:
- a nota no Google é outra (ex.: 4,9 no Google e 5,0 na prévia);
- o perfil mostra WhatsApp ou um link `wa.me`, mas a prévia usa só o telefone;
- o telefone ou o endereço mudaram;
- o perfil já tem site próprio, o que muda a abordagem.

## Passo 4: gerar o vídeo

```bash
node gerar-raiox.mjs --only <id>
```

- **Versão vertical (9:16) também**, se o Giovanni pedir: acrescente `--vertical`.
- **Várias clínicas:** `--only id-1,id-2`.
- Com `--only`, o vídeo é **regravado** mesmo que já exista.

O comando leva uns 35 s por vídeo. Uma linha como esta indica sucesso:

```
✔ [1/1] <id>-raiox.mp4 · 5.8 MB · botão: whatsapp · 34s
```

`botão:` mostra para onde o botão principal leva: `whatsapp`, `telefone` ou `google` (quando a clínica não tem telefone nem WhatsApp).

## Passo 5: conferir o vídeo

1. **Tamanho:** precisa estar abaixo de 10 MB (o script já recomprime quando passa).
2. **Duração e resolução:** precisa dar `00:00:20` e `1280x720` (ou `720x1280` na versão vertical).
   ```bash
   node_modules/ffmpeg-static/ffmpeg.exe -i videos/<id>-raiox.mp4 2>&1 | grep -E "Duration|Video:"
   ```
3. **Visual:** tire 3 quadros e abra as imagens para conferir o print (2 s), a prévia no meio da rolagem (10 s) e o clique no botão (18,5 s).
   ```bash
   mkdir -p videos/conferencia
   for t in 2 10 18.5; do node_modules/ffmpeg-static/ffmpeg.exe -loglevel error -y -ss $t -i videos/<id>-raiox.mp4 -frames:v 1 videos/conferencia/<id>-$t.jpg; done
   ```
   Quando terminar a conferência, apague a pasta `videos/conferencia` (ela só serve para a revisão).

## Passo 6: avisar o Giovanni

Responda em português, em poucas linhas:
- o caminho do vídeo (`videos/<id>-raiox.mp4`, e o vertical se tiver), o tamanho e o tipo de botão;
- as diferenças que você anotou no passo 3;
- que o Hub já mostra o vídeo: basta dar F5 no painel e clicar para assistir ou baixar. O `js/videos-list.js` é atualizado sozinho.

Envie o arquivo do vídeo para ele assistir, se a ferramenta permitir.

---

## Lote do dia (várias clínicas de uma vez)

Quando o Giovanni já tiver salvo vários prints em `prints/`:

```bash
npm run raiox
```

O comando gera o vídeo de todas as clínicas que têm print e ainda não têm vídeo. No final, lista as que estão sem print; a lista completa fica em `videos/faltam-prints.txt`.

Para simular sem gravar nada: `npm run raiox:simular`.

## Problemas comuns

| Sintoma | O que fazer |
|---|---|
| `Faltam prévias` | Rodar `node gerar-previa.js <id>` e gerar o vídeo de novo |
| `Clínica não encontrada` | Conferir o id no passo 1 |
| Print com ⚠️ ou da clínica errada | Refazer com `--force`; se persistir, pedir o print manual |
| `o Google pediu verificação (CAPTCHA)` | Pedir o print manual ao Giovanni. Não contornar |
| Vídeo acima de 10 MB | Raro: o script recomprime sozinho. Se ainda passar, avisar o Giovanni |
| `Executable doesn't exist` (Playwright) | Rodar `npx playwright install chromium` uma vez |

## Arquivos envolvidos

- `tirar-print.mjs`: print do Google Maps (`npm run print`)
- `gerar-raiox.mjs`: vídeo Raio-x (`npm run raiox`)
- `gerar-previa.js`: prévias no template Moderno
- `videos-sync.mjs`: atualiza a lista de vídeos que o Hub lê
- `clinicas-import.json`: dados das clínicas (`SLUG`, `LINK_MAPS`, `NOME_GOOGLE`…)
