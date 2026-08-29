import { store } from '../store.js';
import { CATEGORIES } from '../data/categories.js';
import { escapeHtml, uid, formatDate, toast, openModal, closeModal, confirmModal } from '../utils.js';

const STATUS_LABEL = { ativa: 'Ativa', pausada: 'Pausada', concluida: 'Concluída' };
const STATUS_BADGE = { ativa: 'badge-ativa', pausada: 'badge-pausada', concluida: 'badge-concluida' };

export function renderAutomacao(container) {
  container.innerHTML = `
    <div class="page-head">
      <div>
        <div class="page-title">Automação</div>
        <div class="page-sub">Prospecte seus leads automaticamente conforme o agendamento definido.</div>
      </div>
      <button class="btn btn-primary" id="newAutomationBtn">
        <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>
        Nova automação
      </button>
    </div>
    <div class="stack" id="automationList"></div>
  `;

  renderList();
  document.getElementById('newAutomationBtn').addEventListener('click', openNewAutomationModal);
}

function renderList() {
  const list = document.getElementById('automationList');
  const automations = store.getAutomations();

  if (automations.length === 0) {
    list.innerHTML = `
      <div class="panel">
        <div class="empty-state">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <div class="empty-title">Nenhuma automação criada</div>
          <div class="empty-desc">Crie uma automação para prospectar leads automaticamente em um horário definido.</div>
        </div>
      </div>
    `;
    return;
  }

  list.innerHTML = automations.map(a => `
    <div class="automation-card">
      <div class="automation-info">
        <div class="automation-name">${escapeHtml(a.nome)}</div>
        <div class="automation-meta">
          <span><svg viewBox="0 0 24 24"><path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2-3-2Z"/></svg>${escapeHtml((a.segmento || []).join(', ') || '-')}</span>
          <span><svg viewBox="0 0 24 24"><path d="M12 22s7-7.4 7-12a7 7 0 1 0-14 0c0 4.6 7 12 7 12Z"/><circle cx="12" cy="10" r="2.5"/></svg>${escapeHtml(a.localizacao)}</span>
          <span><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>${formatDate(a.data)}</span>
          <span><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" stroke-linecap="round"/></svg>${escapeHtml(a.horario)}</span>
        </div>
      </div>
      <div class="automation-actions">
        <span class="badge ${STATUS_BADGE[a.status]}">${STATUS_LABEL[a.status]}</span>
        ${a.status !== 'concluida' ? `
          <button class="btn btn-ghost btn-sm" data-toggle="${a.id}">${a.status === 'ativa' ? 'Pausar' : 'Ativar'}</button>
        ` : ''}
        <button class="btn btn-danger btn-sm" data-delete="${a.id}">Excluir</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const all = store.getAutomations();
      const idx = all.findIndex(a => a.id === btn.dataset.toggle);
      if (idx === -1) return;
      all[idx].status = all[idx].status === 'ativa' ? 'pausada' : 'ativa';
      store.setAutomations(all);
      toast(all[idx].status === 'ativa' ? 'Automação ativada' : 'Automação pausada', 'success');
      renderList();
    });
  });

  list.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => {
      confirmModal({
        title: 'Excluir automação',
        message: 'Tem certeza que deseja excluir esta automação? Esta ação não pode ser desfeita.',
        confirmLabel: 'Excluir',
        danger: true,
        onConfirm: () => {
          const all = store.getAutomations().filter(a => a.id !== btn.dataset.delete);
          store.setAutomations(all);
          toast('Automação excluída', 'info');
          renderList();
        },
      });
    });
  });
}

function openNewAutomationModal() {
  const overlay = openModal(`
    <div class="modal-head">
      <div class="modal-title">Nova automação</div>
      <button class="modal-close" data-close><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke-linecap="round"/></svg></button>
    </div>
    <div class="modal-body">
      <div class="field">
        <label class="field-label">Nome da automação</label>
        <input type="text" class="input" id="autoNome" placeholder="Ex: Barbearias — Zona Sul">
      </div>
      <div class="field">
        <label class="field-label">Segmento</label>
        <div class="category-dropdown" style="position:static;max-height:170px">
          ${CATEGORIES.map(c => `
            <label class="category-option">
              <input type="checkbox" value="${escapeHtml(c)}" data-auto-cat>
              <span>${escapeHtml(c)}</span>
            </label>
          `).join('')}
        </div>
      </div>
      <div class="field">
        <label class="field-label">Localização</label>
        <input type="text" class="input" id="autoLocalizacao" placeholder="Ex: São Paulo, Zona Sul">
      </div>
      <div class="field-row">
        <div class="field">
          <label class="field-label">Data</label>
          <input type="date" class="input" id="autoData" value="${new Date().toISOString().slice(0, 10)}">
        </div>
        <div class="field">
          <label class="field-label">Horário</label>
          <input type="time" class="input" id="autoHorario" value="08:00">
        </div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancelar</button>
      <button class="btn btn-primary" id="saveAutomationBtn">Criar automação</button>
    </div>
  `);

  overlay.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));

  overlay.querySelector('#saveAutomationBtn').addEventListener('click', () => {
    const nome = overlay.querySelector('#autoNome').value.trim();
    const localizacao = overlay.querySelector('#autoLocalizacao').value.trim();
    const data = overlay.querySelector('#autoData').value;
    const horario = overlay.querySelector('#autoHorario').value;
    const segmento = [...overlay.querySelectorAll('[data-auto-cat]:checked')].map(c => c.value);

    if (!nome || !localizacao || segmento.length === 0) {
      toast('Preencha nome, localização e ao menos um segmento', 'error');
      return;
    }

    const automations = store.getAutomations();
    automations.unshift({
      id: uid('auto'),
      nome,
      segmento,
      localizacao,
      data,
      horario,
      status: 'ativa',
    });
    store.setAutomations(automations);
    toast('Automação criada com sucesso', 'success');
    closeModal();
    renderList();
  });
}
