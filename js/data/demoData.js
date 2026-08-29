import { uid, randomInt } from '../utils.js';

const SP_CENTER = { lat: -23.5505, lng: -46.6333 };

function jitter(base, spread = 0.06) {
  return base + (Math.random() - 0.5) * spread;
}

function daysAgoIso(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

const LEAD_SEEDS = [
  { empresa: 'Barbearia Prime', tipo: 'Barbearia', bairro: 'Pinheiros', status: 'ativos', score: 94, site: null, instagram: '@barbeariaprime', temWhatsapp: true },
  { empresa: 'Auto Center Brasil', tipo: 'Oficina Mecânica', bairro: 'Vila Mariana', status: 'ativos', score: 78, site: 'autocenterbrasil.com.br', instagram: null, temWhatsapp: true },
  { empresa: 'Mercado Central', tipo: 'Mercado', bairro: 'Tatuapé', status: 'qualificados', score: 65, site: 'mercadocentral.com.br', instagram: '@mercadocentralsp', temWhatsapp: false },
  { empresa: 'Studio Fit', tipo: 'Academia', bairro: 'Moema', status: 'em-contato', score: 88, site: null, instagram: '@studiofitmoema', temWhatsapp: true },
  { empresa: 'Clínica Sorriso', tipo: 'Clínica', bairro: 'Itaim Bibi', status: 'qualificados', score: 91, site: 'clinicasorriso.com.br', instagram: '@clinicasorrisosp', temWhatsapp: true },
  { empresa: 'Restaurante Sabor', tipo: 'Restaurante', bairro: 'Vila Madalena', status: 'ativos', score: 57, site: null, instagram: '@restaurantesabor', temWhatsapp: true },
  { empresa: 'Sorriso Odonto', tipo: 'Dentista', bairro: 'Perdizes', status: 'em-contato', score: 82, site: 'sorrisodonto.com.br', instagram: null, temWhatsapp: true },
  { empresa: 'Bella Salão', tipo: 'Salão de Beleza', bairro: 'Santana', status: 'arquivados', score: 41, site: null, instagram: '@bellasalaosp', temWhatsapp: false },
  { empresa: 'Pet Amigo', tipo: 'Pet Shop', bairro: 'Lapa', status: 'arquivados', score: 36, site: null, instagram: '@petamigosp', temWhatsapp: true },
  { empresa: 'Imob Prime Imóveis', tipo: 'Imobiliária', bairro: 'Brooklin', status: 'ativos', score: 73, site: 'imobprime.com.br', instagram: null, temWhatsapp: false },
];

export function generateDemoLeads() {
  return LEAD_SEEDS.map((s, i) => ({
    id: uid('lead'),
    empresa: s.empresa,
    tipo: s.tipo,
    telefone: `(11) 9${randomInt(6000, 9999)}-${randomInt(1000, 9999)}`,
    temWhatsapp: s.temWhatsapp,
    cidade: 'São Paulo',
    bairro: s.bairro,
    endereco: `Rua ${s.bairro}, ${randomInt(100, 999)}`,
    site: s.site,
    instagram: s.instagram,
    googleMapsUrl: `https://www.google.com/maps/search/${encodeURIComponent(s.empresa + ' ' + s.bairro + ' São Paulo')}`,
    score: s.score,
    status: s.status,
    createdAt: daysAgoIso(randomInt(1, 30)),
    lat: jitter(SP_CENTER.lat),
    lng: jitter(SP_CENTER.lng),
    siteAnalysis: null,
  }));
}

export function generateDemoAutomations() {
  return [
    {
      id: uid('auto'),
      nome: 'Barbearias São Paulo',
      fonte: 'google-maps',
      nichos: ['Barbearia', 'Salão de Beleza'],
      lat: jitter(SP_CENTER.lat),
      lng: jitter(SP_CENTER.lng),
      localizacaoLabel: 'São Paulo - SP',
      maxLeadsPorNicho: 50,
      mensagem: 'Olá, {{nome}}! Tudo bem? Ajudamos negócios como o seu em {{bairro}} a conseguir mais clientes. Podemos conversar?',
      intervaloMin: 35,
      intervaloMax: 60,
      dias: [0, 1, 2, 3, 4],
      horarios: ['09:00'],
      status: 'ativa',
      createdAt: daysAgoIso(6),
    },
    {
      id: uid('auto'),
      nome: 'Dentistas Centro',
      fonte: 'google-maps',
      nichos: ['Dentista', 'Clínica'],
      lat: jitter(SP_CENTER.lat),
      lng: jitter(SP_CENTER.lng),
      localizacaoLabel: 'São Paulo - SP',
      maxLeadsPorNicho: 100,
      mensagem: 'Olá {{nome}}, tudo bem? Vi que sua clínica fica em {{bairro}} e gostaria de apresentar uma solução para atrair mais pacientes.',
      intervaloMin: 40,
      intervaloMax: 90,
      dias: [1, 3],
      horarios: ['09:30', '15:00'],
      status: 'pausada',
      createdAt: daysAgoIso(3),
    },
    {
      id: uid('auto'),
      nome: 'Academias Zona Oeste',
      fonte: 'foursquare',
      nichos: ['Academia'],
      lat: jitter(SP_CENTER.lat),
      lng: jitter(SP_CENTER.lng),
      localizacaoLabel: 'São Paulo - SP',
      maxLeadsPorNicho: 25,
      mensagem: 'Oi {{nome}}! Podemos ajudar sua academia em {{bairro}} a captar mais alunos. Vamos conversar?',
      intervaloMin: 30,
      intervaloMax: 50,
      dias: [0, 2, 4],
      horarios: ['07:00'],
      status: 'concluida',
      createdAt: daysAgoIso(10),
    },
  ];
}

export function generateDemoScripts() {
  return [
    {
      id: uid('script'),
      nome: 'Primeiro contato',
      mensagem: 'Olá {{nome}}! Vi que sua empresa em {{bairro}}, {{cidade}} atua com {{categoria}}. Trabalho ajudando negócios como o seu a conseguir mais clientes. Posso te apresentar uma ideia rápida?',
      createdAt: daysAgoIso(12),
    },
    {
      id: uid('script'),
      nome: 'Follow-up 48h',
      mensagem: 'Oi {{nome}}, tudo bem? Passando aqui pra saber se conseguiu ver minha mensagem anterior sobre {{categoria}} em {{bairro}}. Fico à disposição!',
      createdAt: daysAgoIso(4),
    },
  ];
}

export function generateDemoCampaigns(leads) {
  const withWhatsapp = leads.filter(l => l.temWhatsapp);
  return [
    {
      id: uid('camp'),
      nome: 'Campanha Barbearias SP',
      tipoLead: 'todos',
      segmento: 'Barbearia',
      cidade: 'São Paulo',
      bairro: '',
      limite: 50,
      mensagem: 'Olá {{nome}}! Podemos ajudar sua barbearia em {{bairro}} a atrair mais clientes. Vamos conversar?',
      status: 'enviada',
      enviados: Math.min(3, withWhatsapp.length),
      createdAt: daysAgoIso(6),
    },
  ];
}

export function generateDemoConversations(leads) {
  const targets = leads.filter(l => l.temWhatsapp).slice(0, 3);
  return targets.map((l, i) => ({
    id: uid('conv'),
    leadId: l.id,
    contactName: l.empresa,
    messages: i === 0 ? [
      { from: 'me', text: `Olá ${l.empresa}! Podemos ajudar a atrair mais clientes em ${l.bairro}. Vamos conversar?`, time: daysAgoIso(2) },
      { from: 'them', text: 'Oi, tudo bem? Pode me falar mais sobre como funciona?', time: daysAgoIso(2) },
      { from: 'me', text: 'Claro! Fazemos a captação e organização de leads qualificados pra você focar só em fechar negócio.', time: daysAgoIso(1) },
    ] : [
      { from: 'me', text: `Olá ${l.empresa}, tudo bem? Vi seu negócio em ${l.bairro} e gostaria de apresentar uma solução.`, time: daysAgoIso(1) },
    ],
  }));
}
