# Mapa do Bolso

Controle financeiro pessoal — React + Vite + localStorage.

## Pré-requisitos
- Node.js 18+
- npm ou yarn

## Instalação

```bash
npm install
npm run dev
```

Acesse em: http://localhost:5173

## Estrutura

```
src/
├── components/
│   ├── layout/       # Topbar, Nav
│   ├── ui/           # MetricCard, Card, Button, Modal, Alert, Badge, ProgressBar, FormGroup, EmptyState
│   └── sections/     # Dashboard, Insights, Contas, Lancamentos, Extrato, Fixos, Metas
├── context/
│   └── AppContext.jsx # Estado global + dispatch
├── hooks/
│   ├── useMonthNav.js # Navegação por mês
│   ├── useModal.js    # Controle de modais
│   └── useTheme.js    # Dark/light mode
├── utils/
│   ├── formatters.js  # fmt, monthLabel, getMonthKey, getPastMonths
│   ├── calculators.js # getMesData, getContaSaldo, getTaxaPoupanca, etc
│   └── csv.js         # exportToCSV
├── data/
│   └── defaults.js    # Estado inicial, constantes, categorias
└── styles/
    ├── globals.css
    └── variables.css
```

## Próximos passos
- [ ] Integração Google Sheets API
- [ ] Google OAuth (autenticação real)
- [ ] Deploy Netlify
- [ ] PWA / service worker
