# Guia: como colocar a loja online de fato

O site já está no ar (link no final). O que falta para ele virar **a sua loja** é
trocar o catálogo de exemplo e decidir onde os dados ficam guardados. Este guia
explica os caminhos — do mais rápido ao mais "de verdade".

---

## Onde mexer em cada informação do site

Tudo que é "informação da loja" fica em um único lugar: o bloco `config`.
No painel é **Configurações**; no arquivo remoto é o bloco `config` do seu `catalogo.json`.

| Chave | Onde aparece na loja | Exemplo |
|---|---|---|
| `storeName` | cabeçalho, rodapé, título dos cards de divulgação | `"Ateliê da Lu"` |
| `tagline` | banner da vitrine | `"Peças artesanais feitas à mão"` |
| `city` | cidade na prévia do link (não aparece no banner) | `"Ribeirão Preto"` |
| `logo` | logo no cabeçalho (link de imagem ou vazio) | `"https://.../logo.png"` |
| `whatsapp` | botão do banner, rodapé e botão do pedido | `"5516900000000"` |
| `contactName` | nome de quem atende ("Falar com Raphael") | `"Raphael"` |
| `instagram` | rodapé e hashtag nas publicações | `"@ateliedalu"` |
| `facebook` | rodapé | `"minhaloja"` |
| `pixKey` | QR Code do Pix no checkout (CPF/CNPJ/e-mail/telefone) | `"12345678909"` |
| `pixName` | nome que aparece no app do banco | `"ATELIE DA LU"` |
| `pixCity` | cidade que aparece no app do banco | `"SAO PAULO"` |
| `paymentNote` | aviso no checkout | `"Pagamento via Pix ou combinando na entrega."` |
| `shippingFee` | taxa fixa (usada quando o CEP não é calculado) | `8` |
| `freeShippingOver` | frete grátis a partir de (0 = desativado) | `150` |
| `shippingBase` | valor fixo do frete | `5` |
| `shippingPerKm` | valor por km | `0.5` |
| `shippingMaxKm` | raio máximo de entrega (km) | `60` |
| `storeCep` | CEP da loja (origem da distância) | `"14010-000"` |
| `distanceTable` | distância por cidade (fallback sem internet) | `{"Franca": 90, ...}` |
| `updatedAt` | data da última atualização de preços | `"2026-11-12T10:30:00"` |
| `deliveryNote` | instruções de entrega | `"Entregas das 9h às 18h"` |
| `adminPin` | PIN que abre o painel | `"1234"` |
| `remoteCatalogUrl` | de onde o site busca o catálogo | `"https://raw.githubusercontent.com/..."` |

E os **produtos** ficam no array `products` do mesmo arquivo (campos na tabela do Passo 1).

> Duas regras que economizam dor:
> 1. `pixName` e `pixCity` aparecem para o **pagante** no app do banco — escreva sem acentos e em maiúsculas.
> 2. `whatsapp` precisa ser só o número, com DDD e código do país: `5516900000000`
>    (55 = Brasil, 16 = DDD, (16) 90000-0000 = exemplo).

---

## Como a compra funciona (cadastro → pedido)

O checkout tem duas etapas, com indicador de progresso:

1. **Cadastro** — nome, WhatsApp e e-mail (opcional). Fica salvo **no aparelho do cliente**,
   então nas próximas compras ele já entra direto na etapa do pedido (dá para editar pelo
   link "Editar cadastro").
2. **Entrega e pagamento** — endereço ou retirada, forma de pagamento (Pix com QR Code
   ou combinação no WhatsApp), resumo e finalização.

O pedido sai com um código (ex.: `MR-4700`), o QR Code do Pix já com o valor e a opção
de enviar tudo pelo WhatsApp.

---

## Caminho 1 — Publicar agora com os seus produtos (2 minutos)

> Escolha este caminho se quiser resultado imediato. O **Caminho 2** é o melhor para
> quem pretende atualizar o catálogo com frequência — é o que você escolheu.

Você me manda a lista dos produtos (aqui no chat) e eu publico o site com o catálogo
real em um instante. Formato mais fácil de me passar:

```
Nome | Preço | Descrição curta | Categoria | Emoji
Vaso de cerâmica | 89,90 | Feito à mão, 18cm | Decoração | 🏺
Camiseta estampada | 69,90 | Algodão, P a G | Camisetas | 👕
```

Ou, se você já tem uma planilha, envie o arquivo CSV (colunas aceitas:
`nome;preco;precoAntigo;descricao;categoria;tags;estoque;emoji;link`) e eu importo.

Depois é só abrir o painel (`/#/admin`) e ajustar o que quiser — o catálogo do site
é atualizado no mesmo lugar onde você cadastra.

---

## Caminho 2 — Catálogo remoto (atualize sozinho, sem depender de ninguém) ⭐ escolhido

É a solução para **site estático**: você publica o site uma vez e passa a controlar
o catálogo de um arquivo que fica no seu host. Editou o arquivo, o site muda.

### Passo 1 — Crie o arquivo `catalogo.json`

Copie o modelo que vem com o projeto (`modelo-catalogo.json`) e edite no Bloco de
Notas / VS Code / qualquer editor de texto. A estrutura é:

```json
{
  "config": { "storeName": "Minha Loja", "tagline": "Seu slogan", "whatsapp": "5511999999999" },
  "products": [
    { "id": "p1", "name": "Vaso de cerâmica", "price": 89.9, "oldPrice": 0, "desc": "Feito à mão",
      "category": "Decoração", "tags": ["cerâmica"], "stock": 4, "emoji": "🏺", "image": "", "active": true }
  ]
}
```

Campos que importam:

| Campo | Para que serve |
|---|---|
| `name`, `price` | nome e preço (obrigatórios) |
| `oldPrice` | preço anterior (riscado) quando está em promoção — `0` = sem promoção |
| `desc` | descrição (aparece no card e na página do produto) |
| `category` | agrupa nos filtros da vitrine |
| `tags` | etiquetas (busca e seção "em destaque") |
| `stock` | quantidade — `0` marca como *Esgotado*; sem o campo = ilimitado |
| `emoji` | ícone quando o produto não tem foto |
| `image` | link da foto (`https://.../foto.jpg`) — opcional |
| `active` | `false` esconde o produto da vitrine |
| `featured` | `true` marca como **Destaque** |

> Dica: você também pode cadastrar tudo no painel do site e clicar em
> **Baixar catalogo.json** — o arquivo sai pronto no formato certo.

### Passo 2 — Hospede o arquivo (escolha um)

| Onde | Como | Endereço do arquivo |
|---|---|---|
| **GitHub Gist** (mais rápido) | gist.github.com → *New gist* → cole o JSON → *Create* → botão *Raw* | `https://gist.githubusercontent.com/SEU-USUARIO/ID/raw/catalogo.json` |
| **GitHub (repositório)** | commit do `catalogo.json` na branch `main` | `https://raw.githubusercontent.com/SEU-USUARIO/REPO/main/catalogo.json` |
| **Netlify Drop** | app.netlify.com/drop → arraste a pasta | `https://SEU-SITE.netlify.app/catalogo.json` |
| **Seu host** | FTP/cPanel | `https://www.seusite.com.br/catalogo.json` |

Todos esses lugares liberam CORS automaticamente (o navegador consegue ler o arquivo).

### Passo 3 — Teste a URL antes de usar

```bash
python3 tools/check_cors.py "https://raw.githubusercontent.com/SEU-USUARIO/REPO/main/catalogo.json"
```

Ele diz se o arquivo está acessível, se libera CORS e se o JSON está no formato certo.

### Passo 4 — Ligue o arquivo no site publicado

O site publicado (o link que você compartilha) precisa saber **qual arquivo ler**.
Esse endereço fica no `dados.json` do site — e o site está hospedado aqui, então
**me mande a URL do seu arquivo que eu ligo em um minuto**.

Depois disso o ciclo é seu, sem depender de mim:

```
edita o catalogo.json no GitHub  →  salva  →  site atualiza (basta recarregar)
```

### Passo 5 — Publique o site no seu próprio domínio (recomendado)

> Publicando no seu host você ganha duas coisas que a hospedagem aqui não dá:
> **sem o selo "Created by MiniMax Code"** e **sem o script de estatísticas**
> que esse serviço injeta em cada página. O código já está pronto — é só enviar
> a pasta `web/`.

Se você quiser controlar também o site (e não só o catálogo), o `dados.json` do site
também passa a ser seu: suba a pasta `web/` para o seu host e mantenha o
`dados.json` com esta chave:

```json
{ "config": { "remoteCatalogUrl": "https://raw.githubusercontent.com/SEU-USUARIO/REPO/main/catalogo.json" } }
```

Aí o fluxo completo (site + catálogo + pedido) sai do seu navegador e passa a ser
todo seu, inclusive com o backend do Caminho 3.

---

## Caminho 3 — Backend: catálogo e pedidos no servidor (o mais "de verdade")

Com backend, os produtos e os **pedidos ficam num servidor** — você cadastra pelo
painel de qualquer aparelho (celular, computador) e os pedidos chegam para o painel,
não só para o navegador de quem vendeu.

### Render (o mais simples, plano grátis)

1. Suba o código para o GitHub (ou use o botão *Deploy to Render* do README).
2. No Render: *New → Blueprint* → aponte para o repositório. O `render.yaml` já
   está pronto: ele cria o serviço e gera `ADMIN_PIN` e `SECRET` sozinhos.
3. Anote o PIN exibido no painel do Render (é o que abre o painel administrativo).
4. O site e a API ficam no mesmo domínio — nada a configurar no navegador.

### Docker (qualquer servidor)

```bash
docker build -t catalogo .
docker run -d -p 8080:8080 -e ADMIN_PIN=SEU_PIN -e SECRET=$(openssl rand -hex 16) catalogo
```

### Railway / Fly.io / VPS

```bash
# Railway
railway init && railway up

# Fly.io
fly launch --now

# Ubuntu na mão
node server/server.js   # ou via systemd/pm2
```

Variáveis de ambiente: `PORT` (padrão 8080), `ADMIN_PIN`, `SECRET`.

---

## Caminho 4 — Seu próprio domínio

1. Compre o domínio (`.com.br` no Registro.br ou `.com` no Cloudflare/Namecheap).
2. Aponte um CNAME para o host do backend:

   | Host | Registro |
   |---|---|
   | Render | CNAME `meudominio.com.br` → `seu-servico.onrender.com` |
   | Cloudflare Pages | CNAME `catalog` → `seu-projeto.pages.dev` |
   | Netlify | CNAME `www` → `seu-site.netlify.app` |

3. Ative HTTPS (todos esses hosts emitem certificado automático).
4. No painel → Configurações → *PIN do painel* → defina um PIN forte.

O `og:image` / `og:url` (prévia do link nas redes) ficam em `web/index.html` —
ajuste para o seu domínio depois de publicar.

---

## Frete por CEP (R$ fixo + valor por km)

No checkout o cliente digita o **CEP** e clica em *Calcular*:

1. o app consulta o CEP (ViaCEP) e descobre a cidade;
2. a distância vem da **tabela de cidades** (`distanceTable` no `catalogo.json`) —
   funciona mesmo sem internet e é onde você mantém a tabela da região;
3. se houver **backend rodando**, o site pergunta a ele e a distância fica **precisa**
   (via `/api/frete`, que geocodifica os dois CEPs);
4. **frete = valor base + (km × valor por km)**, respeitando o raio máximo
   e o frete grátis por valor de pedido.

Ajuste tudo em **Painel → Configurações → Entrega**.

---

## Sincronizar preço e estoque pelo link do fornecedor

Cada produto da planilha tem uma coluna `link` (a página dele no fornecedor).
O script `tools/sincronizar-precos.py` visita esses links, lê o preço e o estoque,
atualiza a planilha e regenera o `catalogo.json`.

```bash
# ver o que mudaria, sem gravar
python3 tools/sincronizar-precos.py --dry-run

# gravar na planilha + catálogo e publicar no GitHub
python3 tools/sincronizar-precos.py --push
```

### O que ele faz

| | |
|---|---|
| **Preço** | procura o valor na página e atualiza a coluna `preco` |
| **Estoque** | se a página disser "esgotado" → `estoque = 0` e **`ativo = nao`** (o produto sai da vitrine) |
| **Voltou** | se a página voltar a ter o produto → `ativo = sim` e ele reaparece |
| **Publicação** | com `--push`, commita e envia para o GitHub → o site atualiza em ~1 min |

### Onde ele procura o preço (nessa ordem)

1. **JSON-LD** (schema.org Product) — o mais confiável, presente em quase toda loja;
2. **Microdata / Open Graph** (`product:price:amount`);
3. **Seletor CSS** configurado em `tools/fontes-precos.json`, por domínio;
4. **Regex genérica** (`R$ 12,34`) — último recurso, **nunca aplicada sozinha**.

### Travas de segurança (importante)

Um preço errado publicado na loja é pior do que preço nenhum. Por isso o script
**não aplica** preço que:
- veio só da regex (fonte frágil) → fica registrado como *suspeito*;
- está fora da faixa de 50%–200% do preço atual → fica como *suspeito*;
- está abaixo de R$ 0,50 → fica como *suspeito*.

Para assumir o risco de propósito: `--aceitar-suspeito`.

### Se o site não tem preço no HTML

Muitas lojas montam o preço por JavaScript (o fornecedor `indupropil` é assim).
Nesses casos, o caminho mais confiável é o **feed do fornecedor** (CSV/XML/JSON
no host dele) — nesse caso é só apontar a coluna `link` para o feed ou pedir o
feed para eu integrar.

Para saber se o seu site serve preço de forma legível, o verificador mostra o
que ele achou:

```
✓ Galão de detergente 5 litros verde preço mantido (R$ 23.90)  [JSON-LD]
! Desinfetante 2 litros PET azul  preço R$ 2.27 implausível (-82%) — NÃO aplicado
```

### Automatizar (sem depender de você)

Rode o script por cron na sua máquina ou no backend (Render):

```bash
0 */6 * * * cd /caminho/catalogo-online && python3 tools/sincronizar-precos.py --push
```

---

## Caminho 5 — Botar o link onde o tráfego já está

- **Instagram**: Configurações → cole a URL do catálogo na *bio*.
- **WhatsApp**: envie o link no status e nas conversations de clientes.
- **Cartão de visita / rótulo de embalagem**: QR Code do catálogo — o painel
  (*Divulgar → Imagens prontas*) gera um PNG com o QR do link.
- **Facebook/Instagram/Flyer**: use os *cards* em PNG que o painel gera.

---

## Checklist antes de divulgar para o público

- [ ] Trocar o catálogo de exemplo pelo seu (Caminho 1, 2 ou 3)
- [ ] Definir o **WhatsApp** que receberá os pedidos
- [ ] Definir a **chave Pix** (e conferir nome/cidade que aparecem no app do banco)
- [ ] Definir um **PIN** para o painel
- [ ] Conferir taxa de frete e frete grátis
- [ ] Fazer um pedido de teste (carrinho → checkout → WhatsApp) para ver tudo funcionando
- [ ] Baixar o `dados.json` (Caminho 2) ou o backup JSON (Caminho 3)

---

## O que cada caminho entrega

| | Caminho 1 | Caminho 2 (remoto) ⭐ | Caminho 3 (backend) |
|---|---|---|---|
| Link público | ✅ | ✅ | ✅ |
| Carrinho + Pix | ✅ | ✅ | ✅ |
| Editar produtos | pelo painel | no seu arquivo JSON | pelo painel, de qualquer device |
| Pedidos chegam ao painel | no navegador de quem vendeu | no navegador de quem vendeu | no servidor, de qualquer device |
| Precisa de conta em algum serviço | não | sim (GitHub/host) | sim (Render/Railway) |
| Esforço | 2 min | ~15 min | ~20 min |

---

## Arquivos úteis

| Arquivo | Para que serve |
|---|---|
| `modelo-catalogo.json` | modelo do arquivo para você editar e hospedar |
| `tools/check_cors.py` | confere se a URL do seu arquivo está pronta para o site ler |
| `tools/serve_cors.py` | servidor local de teste (para testar antes de subir) |
| `tools/preparar_github.py` | gera a pasta pronta para o GitHub Pages |
| `GITUB-PAGES.md` | passo a passo do GitHub Pages (site + catálogo + domínio) |
| `GUIA-PUBLICAR.md` | este guia |
