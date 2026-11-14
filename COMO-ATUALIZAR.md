# Como atualizar o código da loja no GitHub

Repositório: **raphaelmenossi-maker/SuaLojaOn**
Site: **https://raphaelmenossi-maker.github.io/SuaLojaOn/**

---

## Opção 1 — 1 comando (recomendado)

Se você tem **Git** instalado no computador:

```bash
bash tools/publicar-github.sh
```

Ele clona o repositório, substitui os arquivos pela versão corrigida, commita e dá push.
Na primeira vez o GitHub pede suas credenciais.

Ao final, espere ~1 minuto e o site está atualizado.

---

## Opção 2 — Pelo editor do GitHub (sem Git)

Abra o arquivo no repositório → ícone do **lápis** → altere → **Commit changes**.

### `sw.js` — 2 trocas (importante)

**Troca 1** — na linha 2, troque:

```js
const CACHE = 'catalogo-v1';
```

por:

```js
const CACHE = 'catalogo-v2';
```

**Troca 2** — na linha 42, troque:

```js
  const sempreDaRede = url.pathname.endsWith('.json') || request.mode === 'navigate' || url.pathname.endsWith('.html');
```

por:

```js
  const sempreDaRede = url.pathname.endsWith('.json') || url.pathname.endsWith('.js') || request.mode === 'navigate' || url.pathname.endsWith('.html');
```

> **Por que isso importa:** sem isso, o navegador guarda a versão antiga do `app.js`
> no cache do service worker e continua mostrando a loja antiga (ou quebrada),
> mesmo depois do commit. Com a troca, o app sempre vem da rede.

### `lib/store.js` — 1 linha (opcional, evita requisição duplicada)

Dentro do método `loadRemote`, na primeira linha, acrescente:

```js
    this.remoteLoaded = true;
```

### `dados.json` — opcional (tira o instagram de exemplo)

Apague a linha:

```json
    "instagram": "@ateliedalu",
```

### `catalogo.json` — é aqui que você trabalha

Troque os 2 produtos de exemplo pelos seus e ponha o seu Instagram:

```json
    "instagram": "@sualojaon",
```

---

## Depois de atualizar

1. Espere ~1 minuto (o GitHub reconstrói o site).
2. Abra o site com **Ctrl + Shift + R** (força a recarregar, ignorando o cache).
3. Confira a vitrine e o checkout (cadastro → Pix → WhatsApp).

---

## Depois de atualizar: mexer no catálogo é só no `catalogo.json`

É o **único** arquivo que você precisa editar para mudar produtos, preços,
categorias, estoque, Instagram, slogan, frete e chave Pix.

1. Abra `catalogo.json` no repositório → **lápis**
2. Altere o que quiser
3. **Commit changes**
4. Em ~1 minuto o site já mostra a versão nova

O `dados.json` é a "chave de entrada" do site (aponta para o `catalogo.json` e
tem as informações fixas). Só mexa nele se trocar o endereço do catálogo.

---

## Update com planilha (recomendado quando a loja física tiver tabela de preço)

Se a sua base de produtos já é uma planilha (Excel/CSV), não edite o JSON na mão:
gere o `catalogo.json` a partir da planilha.

```bash
# 1. edite sua planilha (modelo: modelo-planilha.xlsx)
# 2. gere o catálogo
python3 tools/gerar-catalogo.py minha-planilha.xlsx --saida catalogo.json
# 3. envie o catalogo.json gerado para o repositório (lápis → colar → Commit changes)
```

O script:

- aceita `.xlsx` e `.csv`, com cabeçalho em português ou inglês;
- aceita **custo + margem** e calcula o preço de venda
  (ex.: custo 55,00 e margem 65% → **R$ 90,75**) — e **o custo nunca vai para o site**;
- aceita `preco` direto (R$ 39,90), `precoAntigo` (preço riscado), `estoque`,
  `categoria`, `tags`, `emoji`, `imagem` (link da foto), `link`, `ativo` (sim/não)
  e `destaque` (sim/não);
- **preserva o bloco `config`** (nome, WhatsApp, Pix, frete) do `catalogo.json` atual —
  você não precisa mexer nisso de novo.

Planilha de exemplo pronta: **`modelo-planilha.xlsx`** (abra no Excel e copie as colunas).

Depois de gerar, é só subir o `catalogo.json` no GitHub (lápis → colar → Commit changes).

---

## Sincronizar preços com a loja física (PDV)

O site **não guarda preço próprio**: ele lê o catálogo de um arquivo (`catalogo.json`).
Então a sincronização com a loja física depende de **qual sistema guarda o preço**:

| Onde o preço mora | Como o site acompanha |
|---|---|
| **Planilha** (a mesma da loja) | você edita → `gerar-catalogo.py` → sobe o `catalogo.json` → 1 min no ar |
| **PDV com exportação CSV** | script lê a exportação e gera o `catalogo.json` sozinho (pode rodar por cron) |
| **PDV com API** | o site passa a ler a API do PDV (via um proxy pequeno) — preço em tempo real |
| **Plataforma com PDV integrado** | Nuvemshop/Shopify/RD Station cuidam da sincronização sozinhos |

Regras que evitam divergência:
1. **Uma fonte de verdade só** — se o PDV tem o preço, o site lê; não edite preço no site.
2. **Nunca publique custo** — o gerador calcula o preço de venda (custo + margem) e
   o custo **não** vai para o arquivo público.
3. **Mostre a data** — o site passa a exibir "Preços atualizados em DD/MM/AAAA"
   (campo `updatedAt` no `catalogo.json`), então cliente e lojista veem a mesma data.

Quando você souber qual é o PDV da loja física, eu monto o script de sincronização
(ou o proxy para a API) — é só me dizer o nome do sistema.

---

## Frete por CEP — o que muda em cada arquivo

| Onde | O que tem |
|---|---|
| `lib/frete.js` | cálculo do frete (base + por km) — **arquivo novo** |
| `lib/store.js` | campos `shippingBase`, `shippingPerKm`, `shippingMaxKm`, `storeCep`, `distanceTable` |
| `views/shop.js` | campo de CEP no checkout + botão *Calcular* |
| `views/admin.js` | campos de frete em Configurações → Entrega (inclui a tabela de cidades) |
| `styles.css` | layout do campo de frete + cabeçalho acima do backdrop (ícone do carrinho sempre clicável) |
| `sw.js` | cache v2 |

Para calcular o frete **por cidade** (sem backend), edite em Configurações →
Entrega → *Tabela de distância por cidade*, uma linha por cidade:

```
Ribeirão Preto=0
Franca=90
Barretos=95
```

---

## Se algo der errado

| Sintoma | O que fazer |
|---|---|
| Site em branco | Recarregue com **Ctrl + Shift + R**; se não resolver, *Settings → Pages* → *Deploy from a branch* → `main` → `/(root)` → Save |
| Vitrine vazia | O `catalogo.json` não está no repo ou o `dados.json` está sem `remoteCatalogUrl` |
|continua velho | Cache: **Ctrl + Shift + R** duas vezes, ou abrir em janela anônima, ou limpar os dados do site no navegador |
| Erro no console | Me chame que eu confiro o repositório clonado e te digo o que está errado |
