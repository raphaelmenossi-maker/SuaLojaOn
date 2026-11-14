# SuaLojaOn — catálogo online

Site estático do catálogo. Ele lê os produtos do arquivo **`catalogo.json`**,
neste mesmo repositório.

## Como atualizar o catálogo

1. Abra o arquivo `catalogo.json` no GitHub (botão *pencil* / editar).
2. Altere os produtos (`products`) ou as informações da loja (bloco `config`).
3. Clique em **Commit changes**.
4. Em ~1 minuto o site já mostra a versão nova:
   **https://rfm92.github.io/SuaLojaOn/**

## Onde mexer em cada informação

O bloco `config` do `catalogo.json` guarda: nome da loja (`storeName`), slogan
(`tagline`), WhatsApp (`whatsapp`), Instagram (`instagram`), chave Pix
(`pixKey`), nome/cidade no banco (`pixName`, `pixCity`), frete (`shippingFee`),
frete grátis acima de (`freeShippingOver`), logo (`logo`) e PIN do painel
(`adminPin`).

Formato de um produto:

```json
{
  "id": "p1",
  "name": "Vaso de cerâmica",
  "price": 89.9,
  "oldPrice": 0,
  "desc": "Feito à mão, 18cm",
  "category": "Decoração",
  "tags": ["cerâmica"],
  "stock": 4,
  "emoji": "🏺",
  "image": "",
  "active": true,
  "featured": false
}
```

- `oldPrice: 0` = sem promoção (com valor, aparece o preço riscado e o % OFF).
- `stock: 0` = marcado como *Esgotado*; sem o campo = estoque ilimitado.
- `image` = link da foto; sem foto, o app usa o `emoji`.
- `active: false` = esconde o produto da vitrine.

## Painel administrativo

`https://rfm92.github.io/SuaLojaOn/#/admin` — use o PIN definido em `config.adminPin`.
