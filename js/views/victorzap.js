import { store } from '../store.js';
import { CATEGORIES } from '../data/categories.js';
import { uid, escapeHtml, formatDate, formatDateTime, toast, randomInt, openModal, closeModal, confirmModal } from '../utils.js';

const VARIABLES = [
  { key: '{{nome}}', label: 'Nome' },
  { key: '{{cidade}}', label: 'Cidade' },
  { key: '{{categoria}}', label: 'Categoria' },
  { key: '{{bairro}}', label: 'Bairro' },
  { key: '{{telefone}}', label: 'Telefone' },
];

const REPLIES = [
  'Oi! Pode me contar mais como funciona?',
  'Legal, tenho interesse. Qual o valor?',
  'Obrigado pelo contato, vou avaliar e te retorno.',
  'Pode me mandar mais detalhes por aqui mesmo?',
  'Hoje não consigo falar, podemos conversar amanhã?',
];

let state = {
  subtab: 'painel',
  connecting: false,
  activeConversationId: null,
};

export function renderVictorzap(container, rest) {
  if (rest && rest[0]) state.subtab = rest[0];

  container.innerHTML = `
    <div class="page-head">
      <div>
        <div class="page-title">VictorZap</div>
        <div class="page-sub">WhatsApp integrado para prospecção.</div>
      </div>
    </div>
    <div class="tabs" id="zapTabs">
      ${tabBtn('painel', 'Painel')}
      ${tabBtn('whatsapp', 'WhatsApp')}
      ${tabBtn('campanhas', 'Campanhas')}
      ${tabBtn('conversas', 'Conversas')}
      ${tabBtn('scripts', 'Scripts')}
    </div>
    <div id="zapContent"></div>
  `;

  container.querySelectorAll('#zapTabs [data-subtab]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.subtab = btn.dataset.subtab;
      renderVictorzap(container);
    });
  });

  renderSubtab();
}

function tabBtn(key, label) {
  return `<button class="tab-btn ${state.subtab === key ? 'active' : ''}" data-subtab="${key}">${label}</button>`;
}

function renderSubtab() {
  const el = document.getElementById('zapContent');
  if (!el) return;
  if (state.subtab === 'painel') return renderPainel(el);
  if (state.subtab === 'whatsapp') return renderWhatsapp(el);
  if (state.subtab === 'campanhas') return renderCampanhas(el);
  if (state.subtab === 'conversas') return renderConversas(el);
  if (state.subtab === 'scripts') return renderScripts(el);
}

/* ================= PAINEL ================= */
function renderPainel(el) {
  const leads = store.getLeads();
  const campaigns = store.getCampaigns();
  const conversations = store.getConversations();
  const wa = store.getWhatsapp();
  const leadsComWhatsapp = leads.filter(l => l.temWhatsapp).length;

  el.innerHTML = `
    <div class="panel" style="margin-bottom:18px">
      <div class="sidebar-status" style="display:inline-flex;background:var(--bg-2)">
        <span class="status-dot ${wa.connected ? 'on' : 'off'}"></span>
        <span style="font-weight:700">${wa.connected ? 'WhatsApp conectado' : 'WhatsApp não conectado'}</span>
      </div>
      ${!wa.connected ? `<button class="btn btn-primary btn-sm" id="goConnectBtn" style="margin-left:12px">Conectar agora</button>` : ''}
    </div>
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Leads com WhatsApp</div>
        <div class="stat-value purple">${leadsComWhatsapp}</div>
        <div class="stat-foot">de ${leads.length} leads totais</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Campanhas enviadas</div>
        <div class="stat-value">${campaigns.length}</div>
        <div class="stat-foot">${campaigns.reduce((s, c) => s + (c.enviados || 0), 0)} mensagens enviadas</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Conversas</div>
        <div class="stat-value">${conversations.length}</div>
        <div class="stat-foot">ativas no momento</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total de Leads</div>
        <div class="stat-value">${leads.length}</div>
        <div class="stat-foot">na base atual</div>
      </div>
    </div>
  `;

  document.getElementById('goConnectBtn')?.addEventListener('click', () => {
    state.subtab = 'whatsapp';
    renderSubtab();
    document.querySelectorAll('#zapTabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.subtab === 'whatsapp'));
  });
}

/* ================= WHATSAPP ================= */
function renderWhatsapp(el) {
  const wa = store.getWhatsapp();

  if (wa.connected) {
    el.innerHTML = `
      <div class="panel" style="max-width:420px">
        <div class="section-title">Conexão WhatsApp</div>
        <div class="qr-box" style="border-style:solid;border-color:var(--border)">
          <span class="status-dot on" style="width:12px;height:12px"></span>
          <div style="font-weight:800;font-size:15px">Conectado</div>
          <div class="hint">Seu WhatsApp está integrado ao VictorZap e pronto para prospecção.</div>
          <button class="btn btn-danger btn-sm" id="disconnectBtn">Desconectar</button>
        </div>
      </div>
    `;
    document.getElementById('disconnectBtn')?.addEventListener('click', () => {
      store.setWhatsapp({ connected: false });
      toast('WhatsApp desconectado', 'info');
      renderWhatsapp(el);
    });
    return;
  }

  if (state.connecting) {
    el.innerHTML = `
      <div class="panel" style="max-width:420px">
        <div class="section-title">Conectar WhatsApp</div>
        <div class="qr-box">
          <div class="qr-canvas-wrap"><canvas id="qrCanvas" width="150" height="150"></canvas></div>
          <div style="font-weight:700;font-size:13px">Escaneie o código QR</div>
          <div class="hint">Abra o WhatsApp no celular → Aparelhos conectados → Escanear código</div>
          <div class="search-status" style="justify-content:center"><span class="spinner"></span><span>Aguardando leitura...</span></div>
        </div>
      </div>
    `;
    drawFakeQr(document.getElementById('qrCanvas'));
    setTimeout(() => {
      if (state.subtab !== 'whatsapp' || !state.connecting) return;
      store.setWhatsapp({ connected: true });
      state.connecting = false;
      toast('WhatsApp conectado com sucesso', 'success');
      renderWhatsapp(el);
      document.getElementById('sidebarWaStatus') && refreshSidebarStatus();
    }, 3600);
    return;
  }

  el.innerHTML = `
    <div class="panel" style="max-width:420px">
      <div class="section-title">Conectar WhatsApp</div>
      <div class="section-desc">Conecte seu WhatsApp para enviar campanhas e conversar com seus leads.</div>
      <div class="qr-box">
        <span class="status-dot off" style="width:12px;height:12px"></span>
        <div style="font-weight:700;font-size:13px">WhatsApp não conectado</div>
        <button class="btn btn-primary" id="connectBtn">Conectar</button>
      </div>
    </div>
  `;
  document.getElementById('connectBtn')?.addEventListener('click', () => {
    state.connecting = true;
    renderWhatsapp(el);
  });
}

function refreshSidebarStatus() {
  const wa = store.getWhatsapp();
  const statusEl = document.getElementById('sidebarWaStatus');
  if (!statusEl) return;
  statusEl.innerHTML = `
    <span class="status-dot ${wa.connected ? 'on' : 'off'}"></span>
    <span>${wa.connected ? 'WhatsApp conectado' : 'WhatsApp não conectado'}</span>
  `;
}

function drawFakeQr(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = 15;
  const cell = canvas.width / size;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0a0a0e';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inCorner = (x < 4 && y < 4) || (x > size - 5 && y < 4) || (x < 4 && y > size - 5);
      if (inCorner) continue;
      if (Math.random() > 0.55) ctx.fillRect(x * cell, y * cell, cell - 1, cell - 1);
    }
  }
  [[0, 0], [size - 4, 0], [0, size - 4]].forEach(([cx, cy]) => {
    ctx.fillStyle = '#0a0a0e';
    ctx.fillRect(cx * cell, cy * cell, cell * 4, cell * 4);
    ctx.fillStyle = '#fff';
    ctx.fillRect((cx + 1) * cell, (cy + 1) * cell, cell * 2, cell * 2);
    ctx.fillStyle = '#0a0a0e';
    ctx.fillRect((cx + 1.5) * cell, (cy + 1.5) * cell, cell, cell);
  });
}

/* ================= CAMPANHAS ================= */
function renderCampanhas(el) {
  const campaigns = store.getCampaigns();

  el.innerHTML = `
    <div class="grid-2">
      <div class="panel">
        <div class="section-title">Nova campanha</div>
        <div class="section-desc">Defina o público e a mensagem que será enviada.</div>

        <div class="field">
          <label class="field-label">Nome da campanha</label>
          <input type="text" class="input" id="campNome" placeholder="Ex: Campanha Barbearias SP">
        </div>

        <div class="field-row">
          <div class="field">
            <label class="field-label">Tipo de lead</label>
            <select class="select" id="campTipo">
              <option value="todos">Todos</option>
              <option value="qualificados">Qualificados</option>
              <option value="em-contato">Em contato</option>
              <option value="ativos">Ativos</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label">Segmento</label>
            <select class="select" id="campSegmento">
              <option value="">Todos</option>
              ${CATEGORIES.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="field-row">
          <div class="field">
            <label class="field-label">Cidade</label>
            <input type="text" class="input" id="campCidade" placeholder="Ex: São Paulo">
          </div>
          <div class="field">
            <label class="field-label">Bairro</label>
            <input type="text" class="input" id="campBairro" placeholder="Ex: Pinheiros">
          </div>
        </div>

        <div class="field">
          <label class="field-label">Limite de leads</label>
          <input type="number" class="input" id="campLimite" value="50" min="1" max="500">
        </div>

        <div class="field">
          <label class="field-label">Mensagem</label>
          <textarea class="textarea" id="campMensagem" placeholder="Escreva a mensagem da campanha...">Olá {{nome}}! Podemos ajudar sua empresa em {{bairro}} a conseguir mais clientes. Podemos conversar?</textarea>
          <div class="var-tag-row">
            ${VARIABLES.map(v => `<span class="var-tag" data-insert-var="${v.key}" style="cursor:pointer">${v.key}</span>`).join('')}
          </div>
        </div>

        <div class="field" style="display:flex;gap:10px">
          <button class="btn btn-secondary" id="saveScriptBtn">Salvar mensagem como script</button>
          <button class="btn btn-primary" id="sendCampaignBtn" style="flex:1">Criar campanha</button>
        </div>
        <div id="campaignProgressBox"></div>
      </div>

      <div class="panel">
        <div class="section-title">Campanhas</div>
        <div class="section-desc">Histórico de campanhas criadas.</div>
        <div class="stack" id="campaignList">${campaignListHtml(campaigns)}</div>
      </div>
    </div>
  `;

  document.querySelectorAll('[data-insert-var]').forEach(tag => {
    tag.addEventListener('click', () => {
      const ta = document.getElementById('campMensagem');
      const pos = ta.selectionStart || ta.value.length;
      ta.value = ta.value.slice(0, pos) + tag.dataset.insertVar + ta.value.slice(pos);
      ta.focus();
    });
  });

  document.getElementById('saveScriptBtn').addEventListener('click', () => {
    const mensagem = document.getElementById('campMensagem').value.trim();
    if (!mensagem) { toast('Escreva uma mensagem antes de salvar', 'error'); return; }
    openSaveScriptModal(mensagem);
  });

  document.getElementById('sendCampaignBtn').addEventListener('click', () => sendCampaign(el));
}

function campaignListHtml(campaigns) {
  if (campaigns.length === 0) {
    return `<div class="empty-state" style="padding:30px 10px"><div class="empty-title">Nenhuma campanha criada</div><div class="empty-desc">Crie sua primeira campanha ao lado.</div></div>`;
  }
  return campaigns.map(c => `
    <div class="automation-card">
      <div class="automation-info">
        <div class="automation-name">${escapeHtml(c.nome)}</div>
        <div class="automation-meta">
          <span>${escapeHtml(c.segmento || 'Todos os segmentos')}</span>
          <span>${escapeHtml([c.cidade, c.bairro].filter(Boolean).join(', ') || 'Todas as regiões')}</span>
          <span>${formatDate(c.createdAt)}</span>
        </div>
      </div>
      <div class="automation-actions">
        <span class="badge badge-ativa">${c.enviados} enviados</span>
      </div>
    </div>
  `).join('');
}

async function sendCampaign(el) {
  const nome = document.getElementById('campNome').value.trim();
  const tipoLead = document.getElementById('campTipo').value;
  const segmento = document.getElementById('campSegmento').value;
  const cidade = document.getElementById('campCidade').value.trim();
  const bairro = document.getElementById('campBairro').value.trim();
  const limite = Number(document.getElementById('campLimite').value) || 50;
  const mensagem = document.getElementById('campMensagem').value.trim();

  if (!nome || !mensagem) {
    toast('Preencha o nome da campanha e a mensagem', 'error');
    return;
  }

  const wa = store.getWhatsapp();
  if (!wa.connected) {
    toast('Conecte o WhatsApp antes de enviar uma campanha', 'error');
    return;
  }

  const leads = store.getLeads().filter(l => {
    if (!l.temWhatsapp) return false;
    if (tipoLead !== 'todos' && l.status !== tipoLead) return false;
    if (segmento && l.tipo !== segmento) return false;
    if (cidade && !l.cidade.toLowerCase().includes(cidade.toLowerCase())) return false;
    if (bairro && !l.bairro.toLowerCase().includes(bairro.toLowerCase())) return false;
    return true;
  }).slice(0, limite);

  const box = document.getElementById('campaignProgressBox');
  const btn = document.getElementById('sendCampaignBtn');
  btn.disabled = true;
  box.innerHTML = `<div class="search-status" style="margin-top:12px"><span class="spinner"></span><span>Enviando campanha para ${leads.length} leads...</span></div>`;

  await new Promise(r => setTimeout(r, randomInt(900, 1600)));

  const campaigns = store.getCampaigns();
  campaigns.unshift({
    id: uid('camp'),
    nome,
    tipoLead,
    segmento,
    cidade,
    bairro,
    limite,
    mensagem,
    status: 'enviada',
    enviados: leads.length,
    createdAt: new Date().toISOString(),
  });
  store.setCampaigns(campaigns);

  box.innerHTML = `<div class="hint" style="color:#4ade80;margin-top:12px">Campanha enviada para ${leads.length} leads com sucesso.</div>`;
  btn.disabled = false;
  toast(`Campanha "${nome}" enviada para ${leads.length} leads`, 'success');
  document.getElementById('campaignList').innerHTML = campaignListHtml(store.getCampaigns());
}

function openSaveScriptModal(mensagem) {
  const overlay = openModal(`
    <div class="modal-head">
      <div class="modal-title">Salvar mensagem como script</div>
      <button class="modal-close" data-close><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke-linecap="round"/></svg></button>
    </div>
    <div class="modal-body">
      <div class="field">
        <label class="field-label">Nome do script</label>
        <input type="text" class="input" id="scriptNomeInput" placeholder="Ex: Abordagem inicial">
      </div>
      <div class="field">
        <label class="field-label">Mensagem</label>
        <textarea class="textarea" id="scriptMsgInput">${escapeHtml(mensagem)}</textarea>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancelar</button>
      <button class="btn btn-primary" id="confirmSaveScript">Salvar script</button>
    </div>
  `);
  overlay.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));
  overlay.querySelector('#confirmSaveScript').addEventListener('click', () => {
    const nome = overlay.querySelector('#scriptNomeInput').value.trim();
    const msg = overlay.querySelector('#scriptMsgInput').value.trim();
    if (!nome || !msg) { toast('Preencha nome e mensagem', 'error'); return; }
    const scripts = store.getScripts();
    scripts.unshift({ id: uid('script'), nome, mensagem: msg, createdAt: new Date().toISOString() });
    store.setScripts(scripts);
    toast('Script salvo com sucesso', 'success');
    closeModal();
  });
}

/* ================= CONVERSAS ================= */
function renderConversas(el) {
  const conversations = store.getConversations();
  if (!state.activeConversationId && conversations[0]) state.activeConversationId = conversations[0].id;

  el.innerHTML = `
    <div class="conv-layout">
      <div class="conv-list">
        ${conversations.length === 0 ? `<div class="empty-state" style="padding:30px 14px"><div class="empty-title">Nenhuma conversa</div><div class="empty-desc">Envie uma campanha para começar a conversar com seus leads.</div></div>` :
        conversations.map(c => {
          const last = c.messages[c.messages.length - 1];
          return `
          <div class="conv-item ${state.activeConversationId === c.id ? 'active' : ''}" data-conv="${c.id}">
            <div class="conv-avatar">${initials(c.contactName)}</div>
            <div class="conv-item-info">
              <div class="conv-item-name">${escapeHtml(c.contactName)}</div>
              <div class="conv-item-preview">${escapeHtml(last ? last.text : '')}</div>
            </div>
          </div>
        `;
        }).join('')}
      </div>
      <div class="conv-panel" id="convPanel"></div>
    </div>
  `;

  el.querySelectorAll('[data-conv]').forEach(item => {
    item.addEventListener('click', () => {
      state.activeConversationId = item.dataset.conv;
      renderConversas(el);
    });
  });

  renderConvPanel();
}

function initials(name) {
  return (name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function renderConvPanel() {
  const panel = document.getElementById('convPanel');
  if (!panel) return;
  const conversations = store.getConversations();
  const conv = conversations.find(c => c.id === state.activeConversationId);

  if (!conv) {
    panel.innerHTML = `<div class="conv-empty">Selecione uma conversa</div>`;
    return;
  }

  panel.innerHTML = `
    <div class="conv-panel-head">
      <div class="conv-avatar">${initials(conv.contactName)}</div>
      <div>
        <div style="font-weight:700;font-size:13.5px">${escapeHtml(conv.contactName)}</div>
        <div class="hint" style="margin:0">via WhatsApp</div>
      </div>
    </div>
    <div class="conv-messages" id="convMessages">
      ${conv.messages.map(m => `
        <div class="msg-bubble ${m.from === 'me' ? 'me' : 'them'}">
          ${escapeHtml(m.text)}
          <span class="msg-time">${formatDateTime(m.time)}</span>
        </div>
      `).join('')}
    </div>
    <div class="conv-input-row">
      <input type="text" class="input" id="convInput" placeholder="Digite uma mensagem...">
      <button class="btn btn-primary" id="convSendBtn">Enviar</button>
    </div>
  `;

  const messagesBox = document.getElementById('convMessages');
  messagesBox.scrollTop = messagesBox.scrollHeight;

  const send = () => {
    const input = document.getElementById('convInput');
    const text = input.value.trim();
    if (!text) return;
    const all = store.getConversations();
    const idx = all.findIndex(c => c.id === conv.id);
    all[idx].messages.push({ from: 'me', text, time: new Date().toISOString() });
    store.setConversations(all);
    input.value = '';
    renderConvPanel();

    if (Math.random() > 0.4) {
      setTimeout(() => {
        const latest = store.getConversations();
        const i2 = latest.findIndex(c => c.id === conv.id);
        if (i2 === -1) return;
        latest[i2].messages.push({ from: 'them', text: REPLIES[randomInt(0, REPLIES.length - 1)], time: new Date().toISOString() });
        store.setConversations(latest);
        if (state.activeConversationId === conv.id) renderConvPanel();
      }, randomInt(1400, 2800));
    }
  };

  document.getElementById('convSendBtn').addEventListener('click', send);
  document.getElementById('convInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') send();
  });
}

/* ================= SCRIPTS ================= */
function renderScripts(el) {
  const scripts = store.getScripts();

  el.innerHTML = `
    <div class="page-head" style="margin-bottom:16px">
      <div class="section-desc" style="margin:0">Mensagens reutilizáveis para suas campanhas e conversas.</div>
      <button class="btn btn-primary btn-sm" id="newScriptBtn">
        <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>
        Novo script
      </button>
    </div>
    <div class="card-grid" id="scriptGrid">${scriptGridHtml(scripts)}</div>
  `;

  document.getElementById('newScriptBtn').addEventListener('click', () => openScriptModal());
  bindScriptCardEvents();
}

function scriptGridHtml(scripts) {
  if (scripts.length === 0) {
    return `<div class="empty-state" style="grid-column:1/-1;padding:30px 10px"><div class="empty-title">Nenhum script salvo</div><div class="empty-desc">Crie scripts para reutilizar mensagens em campanhas.</div></div>`;
  }
  return scripts.map(s => `
    <div class="script-card">
      <div class="script-name">${escapeHtml(s.nome)}</div>
      <div class="script-msg">${escapeHtml(s.mensagem)}</div>
      <div class="script-date">${formatDate(s.createdAt)}</div>
      <div class="script-actions">
        <button class="btn btn-ghost btn-sm" data-edit-script="${s.id}">Editar</button>
        <button class="btn btn-ghost btn-sm" data-dup-script="${s.id}">Duplicar</button>
        <button class="btn btn-danger btn-sm" data-del-script="${s.id}">Excluir</button>
      </div>
    </div>
  `).join('');
}

function bindScriptCardEvents() {
  document.querySelectorAll('[data-edit-script]').forEach(btn => {
    btn.addEventListener('click', () => openScriptModal(btn.dataset.editScript));
  });
  document.querySelectorAll('[data-dup-script]').forEach(btn => {
    btn.addEventListener('click', () => {
      const scripts = store.getScripts();
      const original = scripts.find(s => s.id === btn.dataset.dupScript);
      if (!original) return;
      scripts.unshift({ id: uid('script'), nome: `${original.nome} (cópia)`, mensagem: original.mensagem, createdAt: new Date().toISOString() });
      store.setScripts(scripts);
      toast('Script duplicado', 'success');
      renderScripts(document.getElementById('zapContent'));
    });
  });
  document.querySelectorAll('[data-del-script]').forEach(btn => {
    btn.addEventListener('click', () => {
      confirmModal({
        title: 'Excluir script',
        message: 'Tem certeza que deseja excluir este script?',
        confirmLabel: 'Excluir',
        danger: true,
        onConfirm: () => {
          store.setScripts(store.getScripts().filter(s => s.id !== btn.dataset.delScript));
          toast('Script excluído', 'info');
          renderScripts(document.getElementById('zapContent'));
        },
      });
    });
  });
}

function openScriptModal(scriptId) {
  const scripts = store.getScripts();
  const editing = scriptId ? scripts.find(s => s.id === scriptId) : null;

  const overlay = openModal(`
    <div class="modal-head">
      <div class="modal-title">${editing ? 'Editar script' : 'Novo script'}</div>
      <button class="modal-close" data-close><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke-linecap="round"/></svg></button>
    </div>
    <div class="modal-body">
      <div class="field">
        <label class="field-label">Nome</label>
        <input type="text" class="input" id="modalScriptNome" value="${editing ? escapeHtml(editing.nome) : ''}" placeholder="Ex: Abordagem inicial">
      </div>
      <div class="field">
        <label class="field-label">Mensagem</label>
        <textarea class="textarea" id="modalScriptMsg" placeholder="Escreva a mensagem...">${editing ? escapeHtml(editing.mensagem) : ''}</textarea>
        <div class="var-tag-row">${VARIABLES.map(v => `<span class="var-tag">${v.key}</span>`).join('')}</div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancelar</button>
      <button class="btn btn-primary" id="saveScriptModalBtn">${editing ? 'Salvar alterações' : 'Criar script'}</button>
    </div>
  `);
  overlay.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));
  overlay.querySelector('#saveScriptModalBtn').addEventListener('click', () => {
    const nome = overlay.querySelector('#modalScriptNome').value.trim();
    const mensagem = overlay.querySelector('#modalScriptMsg').value.trim();
    if (!nome || !mensagem) { toast('Preencha nome e mensagem', 'error'); return; }
    const all = store.getScripts();
    if (editing) {
      const idx = all.findIndex(s => s.id === editing.id);
      all[idx] = { ...all[idx], nome, mensagem };
    } else {
      all.unshift({ id: uid('script'), nome, mensagem, createdAt: new Date().toISOString() });
    }
    store.setScripts(all);
    toast(editing ? 'Script atualizado' : 'Script criado', 'success');
    closeModal();
    renderScripts(document.getElementById('zapContent'));
  });
}
