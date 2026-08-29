import { store } from '../store.js';

const ICONS = {
  search: `<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3" stroke-linecap="round"/></svg>`,
  leads: `<svg viewBox="0 0 24 24"><path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2-3-2Z"/><path d="M8 8h8M8 12h8" stroke-linecap="round"/></svg>`,
  automation: `<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  settings: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1Z"/></svg>`,
  zap: `<svg viewBox="0 0 24 24"><path d="M17 3.3a10 10 0 1 0 3.7 3.7L21 3l-4 .3Z"/><path d="M8 12.5l2.5 2.5L16 9" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

const MAIN_ITEMS = [
  { key: 'buscar-leads', label: 'Buscar Leads', icon: ICONS.search },
  { key: 'leads', label: 'Leads', icon: ICONS.leads },
  { key: 'automacao', label: 'Automação', icon: ICONS.automation },
  { key: 'configuracoes', label: 'Configurações', icon: ICONS.settings },
];

export function renderSidebar(active) {
  const nav = document.getElementById('sidebarNav');
  const navZap = document.getElementById('sidebarNavZap');
  const leads = store.getLeads();

  const order = ['buscar-leads', 'leads', 'automacao', 'configuracoes'];
  const [first, second, ...restItems] = order.map(k => MAIN_ITEMS.find(i => i.key === k));

  nav.innerHTML = [first, second].map(item => navItemHtml(item, active, leads)).join('');
  const settingsIdx = restItems.length - 1;
  navZap.innerHTML = `
    ${navItemHtml({ key: 'victorzap', label: 'VictorZap', icon: ICONS.zap }, active)}
    ${restItems.map(item => navItemHtml(item, active, leads)).join('')}
  `;

  const wa = store.getWhatsapp();
  const statusEl = document.getElementById('sidebarWaStatus');
  statusEl.innerHTML = `
    <span class="status-dot ${wa.connected ? 'on' : 'off'}"></span>
    <span>${wa.connected ? 'WhatsApp conectado' : 'WhatsApp não conectado'}</span>
  `;

  document.getElementById('mobileNavToggle').onclick = () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarScrim').classList.toggle('open');
  };
  document.getElementById('sidebarScrim').onclick = () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarScrim').classList.remove('open');
  };
}

function navItemHtml(item, active, leads) {
  const isActive = active === item.key;
  let badge = '';
  if (item.key === 'leads' && leads) {
    const activeCount = leads.filter(l => l.status === 'ativos').length;
    if (activeCount > 0) badge = `<span class="nav-badge">${activeCount}</span>`;
  }
  return `
    <a href="#/${item.key}" class="nav-item ${isActive ? 'active' : ''}">
      ${item.icon}
      <span>${item.label}</span>
      ${badge}
    </a>
  `;
}
