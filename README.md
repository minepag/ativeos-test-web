# ativeos-test-web

Painel de pedidos em React usado para testar os agentes do AtiveOS (Forge e QA, incluindo o QA visual) num projeto
front-end. Consome a API de testes ([minepag/ativeos-test-api](https://github.com/minepag/ativeos-test-api)) ou, sem
ela, uma API falsa em memória com os mesmos status e transições.

## O que tem

- Resumo dos pedidos por status (quantidade e valor).
- Filtro por status e lista do pedido mais novo ao mais antigo.
- Formulário de novo pedido (cliente e valor em reais, validados).
- Painel do pedido com as transições permitidas: pendente → pago ou cancelado, pago → enviado ou cancelado,
  enviado → entregue.

## Rodar

```sh
npm ci
npm run dev        # http://localhost:4173, com a API falsa
```

Com a API de testes rodando, defina `VITE_API_URL` (veja `.env.example`), por exemplo
`VITE_API_URL=http://localhost:3000 npm run dev`.

## Verificações

```sh
npm run lint       # Biome
npm run typecheck  # TypeScript
npm test           # Vitest + Testing Library (jsdom)
npm run build      # Vite
```

A CI (`.github/workflows/ci.yml`) roda as quatro em cada PR.

## Estrutura

- `src/orders/status.ts`: status, transições, formatação e leitura de valores.
- `src/api/orders.ts`: a API HTTP e a API falsa em memória (datas fixas, para screenshots estáveis).
- `src/App.tsx`: a tela.
- `test/`: testes da tela e da API HTTP.
