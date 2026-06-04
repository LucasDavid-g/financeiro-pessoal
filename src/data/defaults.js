export const DEFAULT_STATE = {
  lancamentos: [],
  fixos: [
    { id: 1, desc: 'Aluguel',         valor: 960.20, cat: 'moradia',    ativo: true, contaId: null },
    { id: 2, desc: 'Seguro Itaú',     valor: 8.93,   cat: 'outro',      ativo: true, contaId: null },
    { id: 3, desc: 'Claro Flex',      valor: 39.99,  cat: 'assinatura', ativo: true, contaId: null },
    { id: 4, desc: 'Gympass',         valor: 85.90,  cat: 'lazer',      ativo: true, contaId: null },
    { id: 5, desc: 'Plano de Saúde',  valor: 174.85, cat: 'saúde',      ativo: true, contaId: null },
  ],
  parcelas: [
    { id: 1, desc: 'Amazon Prime',        valor: 9.95,   cartao: 'Nubank', atual: 1, total: 999 },
    { id: 2, desc: 'Clube iFood',         valor: 2.98,   cartao: 'Nubank', atual: 1, total: 999 },
    { id: 3, desc: 'Churrasqueira',       valor: 27.49,  cartao: 'Nubank', atual: 3, total: 6   },
    { id: 4, desc: 'Ração Gatos',         valor: 55.36,  cartao: 'Nubank', atual: 2, total: 999 },
    { id: 5, desc: 'Ração Linda',         valor: 129.00, cartao: 'Nubank', atual: 1, total: 999 },
    { id: 6, desc: 'Cadeira PC',          valor: 58.49,  cartao: 'Nubank', atual: 3, total: 10  },
    { id: 7, desc: 'Headset',             valor: 29.70,  cartao: 'Nubank', atual: 3, total: 10  },
  ],
  contas: [
    { id: 1, nome: 'Nubank',        tipo: 'digital',  saldo: 2500,  cor: '#7F77DD' },
    { id: 2, nome: 'Inter',         tipo: 'corrente', saldo: 1800,  cor: '#E24B4A' },
    { id: 3, nome: 'Nubank Cartão', tipo: 'cartao',   saldo: -450,  cor: '#D4537E' },
  ],
  transferencias: [],
  metas: [],
  reserva: 12000,
  investType: 'CDI (cofrinho)',
  orcamento: null,
  nextId: 100,
};

export const CAT_CONFIG = {
  moradia:     { color: '#378ADD', bg: '#E6F1FB', icon: 'ti-home'         },
  alimentação: { color: '#1D9E75', bg: '#E1F5EE', icon: 'ti-salad'        },
  transporte:  { color: '#BA7517', bg: '#FAEEDA', icon: 'ti-car'          },
  saúde:       { color: '#D4537E', bg: '#FBEAF0', icon: 'ti-heart'        },
  lazer:       { color: '#7F77DD', bg: '#EEEDFE', icon: 'ti-music'        },
  pets:        { color: '#EF9F27', bg: '#FAEEDA', icon: 'ti-paw'          },
  assinatura:  { color: '#639922', bg: '#EAF3DE', icon: 'ti-refresh'      },
  cartão:      { color: '#E24B4A', bg: '#FCEBEB', icon: 'ti-credit-card'  },
  outro:       { color: '#888780', bg: '#F1EFE8', icon: 'ti-dots'         },
  receita:     { color: '#1D9E75', bg: '#E1F5EE', icon: 'ti-arrow-down-left' },
  investimento:{ color: '#085041', bg: '#E1F5EE', icon: 'ti-trending-up'  },
};

export const ACCOUNT_COLORS = [
  '#1D9E75', '#378ADD', '#7F77DD', '#D4537E',
  '#BA7517', '#E24B4A', '#639922', '#085041',
];

export const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
export const MONTHS_FULL  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export const CATEGORIES = ['alimentação','moradia','transporte','saúde','lazer','pets','assinatura','cartão','outro'];
export const TIPO_LABEL  = { corrente: 'Conta corrente', poupanca: 'Poupança', investimento: 'Investimento', cartao: 'Cartão de crédito', digital: 'Conta digital' };
