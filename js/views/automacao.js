import { store } from '../store.js';
import { CATEGORIES, DATA_SOURCES } from '../data/categories.js';
import { escapeHtml, uid, toast, openModal, closeModal, confirmModal } from '../utils.js';

const STATUS_LABEL = { ativa: 'Ativa', pausada: 'Pausada', concluida: 'Concluída' };
const STATUS_BADGE = { ativa: 'badge-ativa', pausada: 'badge-pausada', concluida: 'badge-concluida' };
const MAX_LEADS_OPTIONS = [10, 25, 50, 100, 150, 200];
const DAY_LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const DAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const SP_CENTER = { lat: -23.5505, lng: -46.6333 };

const STATE_UF = {
  'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM', 'Bahia': 'BA', 'Ceará': 'CE',
  'Distrito Federal': 'DF', 'Espírito Santo': 'ES', 'Goiás': 'GO', 'Maranhão': 'MA', 'Mato Grosso': 'MT',
  'Mato Grosso do Sul': 'MS', 'Minas Gerais': 'MG', 'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR',
  'Pernambuco': 'PE', 'Piauí': 'PI', 'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN',
  'Rio Grande do Sul': 'RS', 'Rondônia': 'RO', 'Roraima': 'RR', 'Santa Catarina': 'SC',
  'São Paulo': 'SP', 'Sergipe': 'SE', 'Tocantins': 'TO',
};

const VARIABLES = ['{{nome}}', '{{cidade}}', '{{categoria}}', '{{bairro}}'];

// Transient state used only while the create/edit modal is open.
let modalState = null;

export function renderAutomacao(container) {
  container.innerHTML = `
    <div class="page-head">
      <div>
        <div class="page-title">Automação</div>
        <div class="page-sub">Prospecte seus leads e execute suas campanhas automaticamente.</div>
      </div>
      <button class="btn btn-primary" id="newAutomationBtn">
        <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>
        Nova automação
      </button>
    </div>
    <div class="stack" id="automationList"></div>
  `;

  renderList();
  document.getElementById('newAutomationBtn').addEventListener('click', () => openAutomationModal());
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
          <div class="empty-desc">Crie uma automação para prospectar leads e enviar campanhas automaticamente.</div>
        </div>
      </div>
    `;
    return;
  }

  list.innerHTML = automations.map(auto => autoRowHtml(auto)).join('');

  list.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openAutomationModal(btn.dataset.edit));
  });

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
          store.setAutomations(store.getAutomations().filter(a => a.id !== btn.dataset.delete));
          toast('Automação excluída', 'info');
          renderList();
        },
      });
    });
  });
}

function autoRowHtml(a) {
  const nichos = a.nichos || a.segmento || [];
  const fonteLabel = DATA_SOURCES.find(s => s.value === a.fonte)?.label || 'Google Maps';
  const local = a.localizacaoLabel || a.localizacao || '-';
  const proxima = nextRunLabel(a.dias || [], a.horarios || (a.horario ? [a.horario] : []));

  return `
    <div class="auto-row">
      <div class="auto-row-top">
        <div class="auto-row-name">
          <span class="badge ${STATUS_BADGE[a.status]}">${STATUS_LABEL[a.status]}</span>
          <span>${escapeHtml(a.nome)}</span>
        </div>
        <div class="auto-row-actions">
          <button class="btn btn-ghost btn-sm" data-edit="${a.id}">Editar</button>
          ${a.status !== 'concluida' ? `<button class="btn btn-secondary btn-sm" data-toggle="${a.id}">${a.status === 'ativa' ? 'Pausar' : 'Ativar'}</button>` : ''}
          <button class="btn btn-danger btn-sm" data-delete="${a.id}">Excluir</button>
        </div>
      </div>
      <div class="auto-row-meta">
        <span class="auto-meta-item"><em>Fonte</em>${escapeHtml(fonteLabel)}</span>
        <span class="auto-meta-item"><em>Nicho</em>${escapeHtml(nichos.join(', ') || '-')}</span>
        <span class="auto-meta-item"><em>Localização</em>${escapeHtml(local)}</span>
        <span class="auto-meta-item"><em>Próxima execução</em>${escapeHtml(proxima)}</span>
      </div>
    </div>
  `;
}

function nextRunLabel(dias, horarios) {
  if (!dias.length || !horarios.length) return '-';
  const sorted = [...horarios].sort();
  const now = new Date();
  const todayOurs = (now.getDay() + 6) % 7; // 0=Seg..6=Dom
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (let offset = 0; offset <= 7; offset++) {
    const dayOurs = (todayOurs + offset) % 7;
    if (!dias.includes(dayOurs)) continue;
    if (offset === 0) {
      const upcoming = sorted.find(h => {
        const [hh, mm] = h.split(':').map(Number);
        return hh * 60 + mm > nowMinutes;
      });
      if (upcoming) return `Hoje às ${upcoming}`;
      continue;
    }
    const label = offset === 1 ? 'Amanhã' : DAY_NAMES[dayOurs];
    return `${label} às ${sorted[0]}`;
  }
  return '-';
}

/* ===================== MODAL ===================== */

function openAutomationModal(editId) {
  const automations = store.getAutomations();
  const editing = editId ? automations.find(a => a.id === editId) : null;

  modalState = {
    editingId: editing ? editing.id : null,
    nichos: new Set(editing ? (editing.nichos || editing.segmento || []) : []),
    lat: editing ? (editing.lat ?? null) : null,
    lng: editing ? (editing.lng ?? null) : null,
    localizacaoLabel: editing ? (editing.localizacaoLabel || editing.localizacao || '') : '',
    map: null,
    marker: null,
    nichoDropdownOpen: false,
  };

  const horarios = editing ? (editing.horarios || (editing.horario ? [editing.horario] : ['09:00'])) : ['09:00'];
  const dias = editing ? (editing.dias || []) : [];

  const overlay = openModal(`
    <div class="modal-head">
      <div class="modal-title">${editing ? 'Editar automação' : 'Nova automação'}</div>
      <button class="modal-close" data-close><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke-linecap="round"/></svg></button>
    </div>
    <div class="modal-body">
      <div class="field">
        <label class="field-label">Nome da automação</label>
        <input type="text" class="input" id="afNome" placeholder="Ex: Barbearias São Paulo" value="${editing ? escapeHtml(editing.nome) : ''}">
      </div>

      <div class="field-row">
        <div class="field">
          <label class="field-label">Fonte dos leads</label>
          <select class="select" id="afFonte">
            ${DATA_SOURCES.map(s => `<option value="${s.value}" ${editing?.fonte === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select>
          <div class="hint">Novas fontes poderão ser adicionadas futuramente.</div>
        </div>
        <div class="field">
          <label class="field-label">Máximo de leads por nicho</label>
          <select class="select" id="afMaxLeads">
            ${MAX_LEADS_OPTIONS.map(n => `<option value="${n}" ${(editing?.maxLeadsPorNicho || 50) === n ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="field">
        <label class="field-label">Nichos a prospectar</label>
        <div class="category-picker">
          <button type="button" class="category-trigger" id="afNichoTrigger">
            <span>${modalState.nichos.size ? `${modalState.nichos.size} selecionado(s)` : 'Buscar nicho...'}</span>
            <svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>
          </button>
          <div class="category-dropdown" id="afNichoDropdown" style="display:none">
            ${CATEGORIES.map(c => `
              <label class="category-option">
                <input type="checkbox" value="${escapeHtml(c)}" ${modalState.nichos.has(c) ? 'checked' : ''} data-af-nicho>
                <span>${escapeHtml(c)}</span>
              </label>
            `).join('')}
          </div>
        </div>
        <div class="chip-list" id="afNichoChips" style="margin-top:8px">${nichoChipsHtml()}</div>
      </div>

      <div class="field">
        <label class="field-label">Área de prospecção</label>
        <div class="map-container" style="height:220px">
          <div class="map-hint">📍 Clique no mapa para marcar a área</div>
          <div id="afMap"></div>
        </div>
        <div class="map-location-line" id="afLocationLine">${locationLineHtml()}</div>
      </div>

      <div class="field">
        <label class="field-label">Mensagem da campanha</label>
        <textarea class="textarea" id="afMensagem" placeholder="Digite a mensagem que será enviada aos leads..." style="min-height:110px">${editing ? escapeHtml(editing.mensagem || '') : ''}</textarea>
        <div class="var-tag-row">
          ${VARIABLES.map(v => `<span class="var-tag" data-insert-var="${v}" style="cursor:pointer">${v}</span>`).join('')}
        </div>
      </div>

      <div class="field">
        <label class="field-label">Intervalo entre mensagens (segundos)</label>
        <div class="interval-row">
          <input type="number" class="input" id="afIntervalMin" value="${editing?.intervaloMin ?? 35}" min="1">
          <span class="hint" style="margin:0">até</span>
          <input type="number" class="input" id="afIntervalMax" value="${editing?.intervaloMax ?? 60}" min="1">
          <span class="hint" style="margin:0">segundos</span>
        </div>
      </div>

      <div class="field">
        <label class="field-label">Dias da semana</label>
        <div class="day-picker" id="afDayPicker">
          ${DAY_LABELS.map((d, i) => `
            <button type="button" class="day-btn ${dias.includes(i) ? 'active' : ''}" data-day="${i}" title="${DAY_NAMES[i]}">${d}</button>
          `).join('')}
        </div>
      </div>

      <div class="field">
        <label class="field-label">Horários</label>
        <div id="afHorariosList">
          ${horarios.map(h => timeSlotRowHtml(h)).join('')}
        </div>
        <button type="button" class="btn btn-ghost btn-sm" id="afAddHorarioBtn">+ Adicionar horário</button>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancelar</button>
      <button class="btn btn-primary" id="saveAutomationBtn">${editing ? 'Salvar alterações' : 'Salvar automação'}</button>
    </div>
  `, { size: 'modal-xl' });

  overlay.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));

  initAutomationMap(editing);
  bindNichoPicker(overlay);
  bindVariableInserts(overlay);
  bindDayPicker(overlay);
  bindHorarios(overlay);

  overlay.querySelector('#saveAutomationBtn').addEventListener('click', () => saveAutomation(overlay));
}

function nichoChipsHtml() {
  if (!modalState.nichos.size) return '<span class="hint" style="margin:0">Nenhum nicho selecionado</span>';
  return [...modalState.nichos].map(c => `
    <span class="chip chip-purple">${escapeHtml(c)} <span class="chip-remove" data-remove-nicho="${escapeHtml(c)}">×</span></span>
  `).join('');
}

function bindNichoPicker(overlay) {
  const trigger = overlay.querySelector('#afNichoTrigger');
  const dropdown = overlay.querySelector('#afNichoDropdown');

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    modalState.nichoDropdownOpen = !modalState.nichoDropdownOpen;
    dropdown.style.display = modalState.nichoDropdownOpen ? 'block' : 'none';
  });

  overlay.addEventListener('click', (e) => {
    if (!e.target.closest('.category-picker')) {
      modalState.nichoDropdownOpen = false;
      dropdown.style.display = 'none';
    }
  });

  dropdown.querySelectorAll('[data-af-nicho]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) modalState.nichos.add(cb.value);
      else modalState.nichos.delete(cb.value);
      refreshNichoUI(overlay);
    });
  });

  overlay.querySelector('#afNichoChips').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove-nicho]');
    if (!btn) return;
    modalState.nichos.delete(btn.dataset.removeNicho);
    dropdown.querySelectorAll('[data-af-nicho]').forEach(cb => { cb.checked = modalState.nichos.has(cb.value); });
    refreshNichoUI(overlay);
  });
}

function refreshNichoUI(overlay) {
  overlay.querySelector('#afNichoTrigger span').textContent = modalState.nichos.size ? `${modalState.nichos.size} selecionado(s)` : 'Buscar nicho...';
  overlay.querySelector('#afNichoChips').innerHTML = nichoChipsHtml();
}

function bindVariableInserts(overlay) {
  overlay.querySelectorAll('[data-insert-var]').forEach(tag => {
    tag.addEventListener('click', () => {
      const ta = overlay.querySelector('#afMensagem');
      const pos = ta.selectionStart ?? ta.value.length;
      ta.value = ta.value.slice(0, pos) + tag.dataset.insertVar + ta.value.slice(pos);
      ta.focus();
    });
  });
}

function bindDayPicker(overlay) {
  overlay.querySelectorAll('#afDayPicker .day-btn').forEach(btn => {
    btn.addEventListener('click', () => btn.classList.toggle('active'));
  });
}

function timeSlotRowHtml(value) {
  return `
    <div class="time-slot-row">
      <input type="time" class="input" value="${escapeHtml(value)}" data-horario-input>
      <button type="button" class="btn btn-ghost btn-icon" data-remove-horario title="Remover horário">
        <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke-linecap="round"/></svg>
      </button>
    </div>
  `;
}

function bindHorarios(overlay) {
  const list = overlay.querySelector('#afHorariosList');

  const bindRemove = (row) => {
    row.querySelector('[data-remove-horario]').addEventListener('click', () => {
      if (list.querySelectorAll('.time-slot-row').length <= 1) {
        toast('É necessário ao menos um horário', 'error');
        return;
      }
      row.remove();
    });
  };
  list.querySelectorAll('.time-slot-row').forEach(bindRemove);

  overlay.querySelector('#afAddHorarioBtn').addEventListener('click', () => {
    const div = document.createElement('div');
    div.innerHTML = timeSlotRowHtml('09:00').trim();
    const row = div.firstElementChild;
    list.appendChild(row);
    bindRemove(row);
  });
}

function locationLineHtml() {
  if (!modalState.lat) {
    return `<svg viewBox="0 0 24 24"><path d="M12 22s7-7.4 7-12a7 7 0 1 0-14 0c0 4.6 7 12 7 12Z"/><circle cx="12" cy="10" r="2.5"/></svg><span>Nenhuma localização selecionada</span>`;
  }
  const label = modalState.localizacaoLabel || `Lat ${modalState.lat.toFixed(4)}, Lng ${modalState.lng.toFixed(4)}`;
  return `<svg viewBox="0 0 24 24"><path d="M12 22s7-7.4 7-12a7 7 0 1 0-14 0c0 4.6 7 12 7 12Z"/><circle cx="12" cy="10" r="2.5"/></svg><span>${escapeHtml(label)}</span>`;
}

function refreshLocationLine() {
  const el = document.getElementById('afLocationLine');
  if (el) el.innerHTML = locationLineHtml();
}

function initAutomationMap(editing) {
  const el = document.getElementById('afMap');
  if (!el || typeof L === 'undefined') return;

  const startLat = modalState.lat || SP_CENTER.lat;
  const startLng = modalState.lng || SP_CENTER.lng;
  const map = L.map(el, { zoomControl: true, attributionControl: false }).setView([startLat, startLng], modalState.lat ? 13 : 11);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
  modalState.map = map;

  if (modalState.lat) placeMarker(modalState.lat, modalState.lng);

  map.on('click', (e) => {
    modalState.lat = e.latlng.lat;
    modalState.lng = e.latlng.lng;
    modalState.localizacaoLabel = '';
    placeMarker(modalState.lat, modalState.lng);
    refreshLocationLine();
    reverseGeocode(modalState.lat, modalState.lng);
  });

  setTimeout(() => map.invalidateSize(), 120);
}

function placeMarker(lat, lng) {
  if (modalState.marker) modalState.map.removeLayer(modalState.marker);
  const icon = L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:#8b5cf6;border:3px solid #fff;box-shadow:0 0 0 4px rgba(139,92,246,.35)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
  modalState.marker = L.marker([lat, lng], { icon }).addTo(modalState.map);
}

async function reverseGeocode(lat, lng) {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, { signal: controller.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error('geocode failed');
    const data = await res.json();
    const addr = data.address || {};
    const cidade = addr.city || addr.town || addr.municipality || '';
    const uf = STATE_UF[addr.state] || '';
    modalState.localizacaoLabel = [cidade, uf].filter(Boolean).join(' - ') || '';
  } catch {
    modalState.localizacaoLabel = '';
  }
  refreshLocationLine();
}

function saveAutomation(overlay) {
  const nome = overlay.querySelector('#afNome').value.trim();
  const fonte = overlay.querySelector('#afFonte').value;
  const maxLeadsPorNicho = Number(overlay.querySelector('#afMaxLeads').value);
  const mensagem = overlay.querySelector('#afMensagem').value.trim();
  const intervaloMin = Number(overlay.querySelector('#afIntervalMin').value) || 30;
  const intervaloMax = Number(overlay.querySelector('#afIntervalMax').value) || 60;
  const dias = [...overlay.querySelectorAll('#afDayPicker .day-btn.active')].map(b => Number(b.dataset.day));
  const horarios = [...overlay.querySelectorAll('[data-horario-input]')].map(i => i.value).filter(Boolean);
  const nichos = [...modalState.nichos];

  if (!nome) { toast('Informe um nome para a automação', 'error'); return; }
  if (nichos.length === 0) { toast('Selecione ao menos um nicho', 'error'); return; }
  if (!modalState.lat) { toast('Selecione uma localização no mapa', 'error'); return; }
  if (!mensagem) { toast('Escreva a mensagem da campanha', 'error'); return; }
  if (dias.length === 0) { toast('Selecione ao menos um dia da semana', 'error'); return; }
  if (horarios.length === 0) { toast('Adicione ao menos um horário', 'error'); return; }
  if (intervaloMin > intervaloMax) { toast('O intervalo mínimo não pode ser maior que o máximo', 'error'); return; }

  const automations = store.getAutomations();

  const payload = {
    nome,
    fonte,
    nichos,
    lat: modalState.lat,
    lng: modalState.lng,
    localizacaoLabel: modalState.localizacaoLabel || `Lat ${modalState.lat.toFixed(4)}, Lng ${modalState.lng.toFixed(4)}`,
    maxLeadsPorNicho,
    mensagem,
    intervaloMin,
    intervaloMax,
    dias,
    horarios,
  };

  if (modalState.editingId) {
    const idx = automations.findIndex(a => a.id === modalState.editingId);
    if (idx !== -1) automations[idx] = { ...automations[idx], ...payload };
    toast('Automação atualizada', 'success');
  } else {
    automations.unshift({ id: uid('auto'), status: 'ativa', createdAt: new Date().toISOString(), ...payload });
    toast('Automação criada com sucesso', 'success');
  }

  store.setAutomations(automations);
  closeModal();
  renderList();
}
