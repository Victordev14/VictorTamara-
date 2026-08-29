import { renderBuscarLeads } from './views/buscarLeads.js';
import { renderLeads } from './views/leads.js';
import { renderAutomacao } from './views/automacao.js';
import { renderVictorzap } from './views/victorzap.js';
import { renderConfiguracoes } from './views/configuracoes.js';
import { renderSidebar } from './components/sidebar.js';
import { closeModal } from './utils.js';

const routes = {
  'buscar-leads': renderBuscarLeads,
  'leads': renderLeads,
  'automacao': renderAutomacao,
  'victorzap': renderVictorzap,
  'configuracoes': renderConfiguracoes,
};

export function navigate(path) {
  window.location.hash = path;
}

function currentRoute() {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const [top, ...rest] = hash.split('/');
  return { top: top || 'buscar-leads', rest };
}

function render() {
  closeModal();
  const { top, rest } = currentRoute();
  const container = document.getElementById('viewRoot');
  const fn = routes[top] || routes['buscar-leads'];
  container.innerHTML = '';
  fn(container, rest);
  renderSidebar(top);
  window.scrollTo(0, 0);
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarScrim')?.classList.remove('open');
}

export function rerender() {
  render();
}

export function initRouter() {
  window.addEventListener('hashchange', render);
  render();
}
