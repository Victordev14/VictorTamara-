import { store } from '../store.js';
import { escapeHtml, scoreClass, toast, uid, randomInt } from '../utils.js';
import { openLeadDetail } from './leadDetail.js';
import { scanSite } from '../siteScan.js';

const TABS = [
  { key: 'ativos', label: 'Ativos' },
  { key: 'qualificados', label: 'Qualificados' },
  { key: 'em-contato', label: 'Em Contato' },
  { key: 'arquivados', label: 'Arquivados' },
];

const STATUS_LABELS = { ativos: 'Novo', qualificados: 'Qualificado', 'em-contato': 'Em Contato', arquivados: 'Arquivado' };
const STATUS_BADGE = { ativos: 'badge-novo', qualificados: 'badge-qualificado', 'em-contato': 'badge-contato', arquivados: 'badge-arquivado' };

let state = {
  tab: 'ativos',
  query: '',
  digitalFilter: 'todos',
  openMenuId: null,
  scanningAll: false,
};

export function renderLeads(container) {
  const leads = store.getLeads();

  container.innerHTML = `
    <div class="page-head">
      <div>
        <div class="page-title">Leads</div>
        <div class="page-sub">Organize, qualifique e prospecte os leads capturados.</div>
      </div>
      <div style="display:flex;gap:10px">
        <input type="file" id="csvInput" accept=".csv" style="display:none">
        <button class="btn btn-secondary" id="importCsvBtn">
          <svg viewBox="0 0 24 24"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Importar CSV
        </button>
      </div>
    </div>

    <div class="tabs" id="leadTabs">
      ${TABS.map(t => {
        const count = leads.filter(l => l.status === t.key).length;
        return `<button class="tab-btn ${state.tab === t.key ? 'active' : ''}" data-tab="${t.key}">${t.label} <span class="tab-count">${count}</span></button>`;
      }).join('')}
    </div>

    <div class="panel" style="margin-bottom:16px">
      <div class="field-row" style="align-items:flex-end">
        <div style="flex:2;min-width:220px">
          <label class="field-label">Buscar</label>
          <div class="search-input-wrap">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3" stroke-linecap="round"/></svg>
            <input type="text" class="input" id="leadSearchInput" placeholder="Buscar por nome, categoria, telefone, cidade..." value="${escapeHtml(state.query)}">
          </div>
        </div>
        <div style="min-width:180px">
          <label class="field-label">Presença digital</label>
          <select class="select" id="digitalFilterSelect">
            <option value="todos" ${state.digitalFilter === 'todos' ? 'selected' : ''}>Todos</option>
            <option value="com-site" ${state.digitalFilter === 'com-site' ? 'selected' : ''}>Com site</option>
            <option value="sem-site" ${state.digitalFilter === 'sem-site' ? 'selected' : ''}>Sem site</option>
            <option value="nao-verificado" ${state.digitalFilter === 'nao-verificado' ? 'selected' : ''}>Não verificado</option>
          </select>
        </div>
        <button class="btn btn-secondary" id="scanAllBtn" ${state.scanningAll ? 'disabled' : ''}>
          ${state.scanningAll ? '<span class="spinner"></span> Escaneando...' : `
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3" stroke-linecap="round"/></svg>
          Escanear Sites`}
        </button>
      </div>
    </div>

    <div id="leadsTableWrap"></div>
  `;

  renderTable();
  bindTopEvents(container);
}

function getFilteredLeads() {
  const all = store.getLeads();
  const q = state.query.trim().toLowerCase();
  return all
    .filter(l => l.status === state.tab)
    .filter(l => {
      if (!q) return true;
      return [l.empresa, l.tipo, l.telefone, l.cidade, l.bairro].some(v => (v || '').toLowerCase().includes(q));
    })
    .filter(l => {
      if (state.digitalFilter === 'todos') return true;
      if (state.digitalFilter === 'nao-verificado') return !l.siteAnalysis;
      if (state.digitalFilter === 'com-site') return !!l.site;
      if (state.digitalFilter === 'sem-site') return !l.site;
      return true;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function renderTable() {
  const wrap = document.getElementById('leadsTableWrap');
  if (!wrap) return;
  const rows = getFilteredLeads();

  if (rows.length === 0) {
    wrap.innerHTML = `
      <div class="table-wrap">
        <div class="empty-state">
          <svg viewBox="0 0 24 24"><path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2-3-2Z"/></svg>
          <div class="empty-title">Nenhum lead encontrado</div>
          <div class="empty-desc">Ajuste os filtros ou busque novos leads na tela "Buscar Leads".</div>
        </div>
      </div>
    `;
    return;
  }

  wrap.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Empresa</th>
            <th>Tipo</th>
            <th>Contato</th>
            <th>Status</th>
            <th>Score</th>
            <th style="width:90px">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(rowHtml).join('')}
        </tbody>
      </table>
    </div>
  `;

  wrap.querySelectorAll('tbody tr').forEach(tr => {
    tr.addEventListener('click', (e) => {
      if (e.target.closest('[data-action-menu-btn]') || e.target.closest('.action-menu')) return;
      openLeadDetail(tr.dataset.id, () => { renderTable(); refreshTabsCounts(); });
    });
  });

  wrap.querySelectorAll('[data-action-menu-btn]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.openMenuId = state.openMenuId === btn.dataset.id ? null : btn.dataset.id;
      renderTable();
    });
  });

  wrap.querySelectorAll('[data-menu-action]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      handleRowAction(item.dataset.menuAction, item.dataset.id);
    });
  });

  document.removeEventListener('click', closeMenuOutside);
  document.addEventListener('click', closeMenuOutside);
}

function closeMenuOutside() {
  if (state.openMenuId) {
    state.openMenuId = null;
    renderTable();
  }
}

function rowHtml(l) {
  return `
    <tr data-id="${l.id}">
      <td>
        <div class="cell-company">${escapeHtml(l.empresa)}</div>
        <div class="cell-sub">${escapeHtml(l.bairro)}, ${escapeHtml(l.cidade)}</div>
      </td>
      <td>${escapeHtml(l.tipo)}</td>
      <td>
        <div class="cell-contact">
          ${l.temWhatsapp
            ? `<svg viewBox="0 0 24 24"><path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.5 8.5 0 0 1-4-1L3 20l1.1-5A8.4 8.4 0 1 1 21 11.5Z"/></svg> WhatsApp`
            : `<svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2.1L8 9.7a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2Z"/></svg> Telefone`
          }
        </div>
      </td>
      <td><span class="badge ${STATUS_BADGE[l.status]}">${STATUS_LABELS[l.status]}</span></td>
      <td>
        <span class="score-num ${scoreClass(l.score)}" title="${l.score >= 80 ? 'Alta oportunidade' : l.score >= 50 ? 'Média oportunidade' : 'Baixa oportunidade'}">${l.score}</span>
      </td>
      <td style="position:relative">
        <button class="btn btn-ghost btn-sm" data-action-menu-btn data-id="${l.id}">Ações</button>
        ${state.openMenuId === l.id ? actionMenuHtml(l) : ''}
      </td>
    </tr>
  `;
}

function actionMenuHtml(l) {
  const items = [];
  if (l.status !== 'qualificados') items.push(['qualificar', 'Qualificar']);
  if (l.status !== 'em-contato') items.push(['contato', 'Entrar em contato']);
  items.push(['whatsapp', 'Abrir WhatsApp']);
  if (l.status !== 'arquivados') items.push(['arquivar', 'Arquivar']);
  else items.push(['reativar', 'Restaurar']);

  return `
    <div class="action-menu" style="position:absolute;right:14px;top:38px;z-index:50;background:var(--bg-2);border:1px solid var(--border-strong);border-radius:var(--radius);box-shadow:var(--shadow-lg);min-width:170px;overflow:hidden">
      ${items.map(([action, label]) => `
        <div class="category-option" style="border-radius:0;padding:9px 12px" data-menu-action="${action}" data-id="${l.id}">${label}</div>
      `).join('')}
    </div>
  `;
}

function handleRowAction(action, id) {
  const leads = store.getLeads();
  const idx = leads.findIndex(l => l.id === id);
  if (idx === -1) return;
  const lead = leads[idx];

  if (action === 'qualificar') {
    leads[idx] = { ...lead, status: 'qualificados' };
    store.setLeads(leads);
    toast('Lead qualificado', 'success');
  } else if (action === 'contato') {
    leads[idx] = { ...lead, status: 'em-contato' };
    store.setLeads(leads);
    toast('Lead movido para Em Contato', 'success');
  } else if (action === 'arquivar') {
    leads[idx] = { ...lead, status: 'arquivados' };
    store.setLeads(leads);
    toast('Lead arquivado', 'info');
  } else if (action === 'reativar') {
    leads[idx] = { ...lead, status: 'ativos' };
    store.setLeads(leads);
    toast('Lead restaurado para Ativos', 'success');
  } else if (action === 'whatsapp') {
    const { ddi } = store.getSettings();
    const digits = `${ddi}${lead.telefone}`.replace(/\D/g, '');
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent('Olá ' + lead.empresa + ', tudo bem?')}`, '_blank', 'noopener');
  }
  state.openMenuId = null;
  renderTable();
  refreshTabsCounts();
}

function refreshTabsCounts() {
  const leads = store.getLeads();
  const tabsEl = document.getElementById('leadTabs');
  if (!tabsEl) return;
  tabsEl.innerHTML = TABS.map(t => {
    const count = leads.filter(l => l.status === t.key).length;
    return `<button class="tab-btn ${state.tab === t.key ? 'active' : ''}" data-tab="${t.key}">${t.label} <span class="tab-count">${count}</span></button>`;
  }).join('');
  bindTabEvents();
}

function bindTabEvents() {
  document.querySelectorAll('#leadTabs [data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.tab = btn.dataset.tab;
      state.openMenuId = null;
      refreshTabsCounts();
      renderTable();
    });
  });
}

function bindTopEvents(container) {
  bindTabEvents();

  const searchInput = document.getElementById('leadSearchInput');
  let debounceTimer;
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const val = e.target.value;
    debounceTimer = setTimeout(() => {
      state.query = val;
      renderTable();
    }, 200);
  });

  document.getElementById('digitalFilterSelect')?.addEventListener('change', (e) => {
    state.digitalFilter = e.target.value;
    renderTable();
  });

  document.getElementById('scanAllBtn')?.addEventListener('click', async () => {
    const targets = getFilteredLeads().filter(l => !l.siteAnalysis).slice(0, 20);
    if (targets.length === 0) {
      toast('Todos os leads visíveis já foram escaneados', 'info');
      return;
    }
    state.scanningAll = true;
    const btn = document.getElementById('scanAllBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Escaneando...'; }
    let done = 0;
    for (const lead of targets) {
      await scanSite(lead);
      const leads = store.getLeads();
      const idx = leads.findIndex(l => l.id === lead.id);
      if (idx !== -1) { leads[idx] = { ...leads[idx], siteAnalysis: lead.siteAnalysis, site: lead.site }; store.setLeads(leads); }
      done++;
    }
    state.scanningAll = false;
    toast(`${done} sites analisados`, 'success');
    renderTable();
  });

  document.getElementById('importCsvBtn')?.addEventListener('click', () => {
    document.getElementById('csvInput')?.click();
  });
  document.getElementById('csvInput')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const imported = parseCsvToLeads(text);
    if (imported.length === 0) {
      toast('Nenhum lead válido encontrado no arquivo', 'error');
      return;
    }
    const leads = store.getLeads();
    store.setLeads([...imported, ...leads]);
    toast(`${imported.length} leads importados`, 'success');
    e.target.value = '';
    renderTable();
    refreshTabsCounts();
  });
}

function parseCsvLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { result.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  result.push(cur);
  return result.map(s => s.trim());
}

function parseCsvToLeads(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase());
  const idx = (name) => headers.indexOf(name);

  const iEmpresa = idx('empresa') !== -1 ? idx('empresa') : idx('nome');
  const iTipo = idx('tipo') !== -1 ? idx('tipo') : idx('categoria');
  const iTelefone = idx('telefone') !== -1 ? idx('telefone') : idx('whatsapp');
  const iCidade = idx('cidade');
  const iBairro = idx('bairro');
  const iEndereco = idx('endereco') !== -1 ? idx('endereco') : idx('endereço');
  const iSite = idx('site');
  const iInstagram = idx('instagram');

  if (iEmpresa === -1) return [];

  const leads = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const empresa = cols[iEmpresa];
    if (!empresa) continue;
    leads.push({
      id: uid('lead'),
      empresa,
      tipo: iTipo !== -1 ? (cols[iTipo] || 'Outro') : 'Outro',
      telefone: iTelefone !== -1 ? (cols[iTelefone] || '') : '',
      temWhatsapp: iTelefone !== -1 && !!cols[iTelefone],
      cidade: iCidade !== -1 ? (cols[iCidade] || '') : '',
      bairro: iBairro !== -1 ? (cols[iBairro] || '') : '',
      endereco: iEndereco !== -1 ? (cols[iEndereco] || '') : '',
      site: iSite !== -1 ? (cols[iSite] || null) : null,
      instagram: iInstagram !== -1 ? (cols[iInstagram] || null) : null,
      googleMapsUrl: `https://www.google.com/maps/search/${encodeURIComponent(empresa)}`,
      score: randomInt(30, 90),
      status: 'ativos',
      createdAt: new Date().toISOString(),
      lat: null,
      lng: null,
      siteAnalysis: null,
    });
  }
  return leads;
}
