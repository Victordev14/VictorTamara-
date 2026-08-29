import { CATEGORIES, DATA_SOURCES, RESULT_LIMITS } from '../data/categories.js';
import { store } from '../store.js';
import { uid, randomInt, escapeHtml, toast } from '../utils.js';
import { navigate } from '../router.js';

const SP_CENTER = { lat: -23.5505, lng: -46.6333 };
const ADJECTIVES = ['Prime', 'Real', 'Elite', 'Vip', 'Total', 'Show', 'Plus', 'Union', 'Central', 'Express', 'Bella', 'Nova', 'Sul', 'Norte', 'Excellence', 'Class'];
const BASE_WORD = {
  'Dentista': 'Odonto',
  'Barbearia': 'Barbearia',
  'Oficina Mecânica': 'Auto Center',
  'Restaurante': 'Restaurante',
  'Academia': 'Academia',
  'Mercado': 'Mercado',
  'Clínica': 'Clínica',
  'Imobiliária': 'Imóveis',
  'Salão de Beleza': 'Salão',
  'Pet Shop': 'Pet',
  'Advocacia': 'Advocacia',
  'Farmácia': 'Farmácia',
};

let state = {
  lat: null,
  lng: null,
  radiusKm: 3,
  locationLabel: '',
  categories: new Set(),
  dataSource: 'google-maps',
  maxResults: 50,
  searching: false,
  progress: 0,
  statusMsg: '',
  foundCount: 0,
  results: [],
  done: false,
  map: null,
  marker: null,
  circle: null,
  categoryDropdownOpen: false,
};

export function renderBuscarLeads(container) {
  container.innerHTML = `
    <div class="page-head">
      <div>
        <div class="page-title">Buscar Leads</div>
        <div class="page-sub">Defina uma localização, escolha os segmentos e capture leads automaticamente.</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="stack">
        <div class="panel">
          <div class="section-title">Localização</div>
          <div class="section-desc">Clique no mapa para marcar a área onde deseja buscar leads.</div>
          <div class="map-container">
            <div class="map-hint">📍 Clique no mapa para marcar onde buscar</div>
            <div id="leadsMap"></div>
          </div>
          <div class="map-location-line" id="locationLine">
            ${locationLineHtml()}
          </div>
          <div class="radius-row">
            <span class="field-label" style="margin:0;white-space:nowrap">Raio de busca</span>
            <input type="range" id="radiusRange" min="1" max="15" step="1" value="${state.radiusKm}" ${!state.lat ? 'disabled' : ''}>
            <span class="radius-val" id="radiusVal">${state.radiusKm} km</span>
          </div>
        </div>

        <div class="panel" id="searchActionPanel">
          ${searchActionHtml()}
        </div>
      </div>

      <div class="stack">
        <div class="panel">
          <div class="section-title">Categorias / Segmentos</div>
          <div class="section-desc">Selecione um ou mais nichos para prospectar.</div>
          <div class="category-picker">
            <button type="button" class="category-trigger" id="categoryTrigger">
              <span>${state.categories.size ? `${state.categories.size} selecionado(s)` : 'Toque para escolher os nichos...'}</span>
              <svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>
            </button>
            <div class="category-dropdown" id="categoryDropdown" style="display:${state.categoryDropdownOpen ? 'block' : 'none'}">
              ${CATEGORIES.map(c => `
                <label class="category-option">
                  <input type="checkbox" value="${escapeHtml(c)}" ${state.categories.has(c) ? 'checked' : ''} data-cat-checkbox>
                  <span>${escapeHtml(c)}</span>
                </label>
              `).join('')}
            </div>
          </div>
          <div class="category-selected-row">
            <div class="chip-list" id="selectedChips">
              ${[...state.categories].map(c => `
                <span class="chip chip-purple">${escapeHtml(c)} <span class="chip-remove" data-remove-cat="${escapeHtml(c)}">×</span></span>
              `).join('') || '<span class="hint" style="margin:0">Nenhum segmento selecionado</span>'}
            </div>
            ${state.categories.size ? `<button class="btn btn-ghost btn-sm" id="clearCatsBtn">Limpar</button>` : ''}
          </div>
        </div>

        <div class="panel">
          <div class="section-title">Fonte de dados</div>
          <div class="section-desc">Escolha de onde os leads serão capturados.</div>
          <select class="select" id="dataSourceSelect">
            ${DATA_SOURCES.map(s => `<option value="${s.value}" ${state.dataSource === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select>
          <div class="hint">Novas fontes de dados poderão ser adicionadas futuramente.</div>
        </div>

        <div class="panel">
          <div class="section-title">Filtro de Captura</div>
          <div class="section-desc">Máx. resultados por categoria</div>
          <select class="select" id="maxResultsSelect">
            ${RESULT_LIMITS.map(n => `<option value="${n}" ${state.maxResults === n ? 'selected' : ''}>${n} resultados</option>`).join('')}
          </select>
          <div class="hint">Limita quantos leads serão coletados para cada segmento selecionado, evitando buscas muito longas.</div>
        </div>
      </div>
    </div>
  `;

  initMap();
  bindEvents(container);
}

function locationLineHtml() {
  if (!state.lat) {
    return `<svg viewBox="0 0 24 24"><path d="M12 22s7-7.4 7-12a7 7 0 1 0-14 0c0 4.6 7 12 7 12Z"/><circle cx="12" cy="10" r="2.5"/></svg><span>Nenhuma localização selecionada</span>`;
  }
  const label = state.locationLabel || `Lat ${state.lat.toFixed(4)}, Lng ${state.lng.toFixed(4)}`;
  return `<svg viewBox="0 0 24 24"><path d="M12 22s7-7.4 7-12a7 7 0 1 0-14 0c0 4.6 7 12 7 12Z"/><circle cx="12" cy="10" r="2.5"/></svg><span>${escapeHtml(label)} · raio de ${state.radiusKm} km</span>`;
}

function searchActionHtml() {
  if (state.searching) {
    return `
      <div class="section-title">Buscando leads...</div>
      <div class="progress-bar" style="margin:10px 0"><div class="progress-bar-fill" style="width:${state.progress}%"></div></div>
      <div class="search-status"><span class="spinner"></span><span>${escapeHtml(state.statusMsg)}</span></div>
      <div class="hint">${state.foundCount} leads encontrados até agora</div>
    `;
  }
  if (state.done) {
    return `
      <div class="section-title">Busca concluída</div>
      <div class="search-result-box">
        <div>
          <div style="font-weight:800;font-size:15px;color:var(--purple-hi)">${state.results.length} leads captados</div>
          <div class="hint" style="margin-top:2px">Prontos para organizar e prospectar.</div>
        </div>
        <button class="btn btn-primary" id="viewCapturedBtn">Ver leads captados</button>
      </div>
      <button class="btn btn-ghost btn-block" style="margin-top:12px" id="newSearchBtn">Nova busca</button>
    `;
  }
  const canSearch = state.lat && state.categories.size > 0;
  return `
    <button class="btn btn-primary btn-block" id="searchBtn" ${canSearch ? '' : 'disabled'}>
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3" stroke-linecap="round"/></svg>
      Buscar Leads
    </button>
    ${!canSearch ? '<div class="hint">Selecione uma localização no mapa e ao menos um segmento para buscar.</div>' : ''}
  `;
}

function initMap() {
  const el = document.getElementById('leadsMap');
  if (!el || typeof L === 'undefined') return;
  const map = L.map(el, { zoomControl: true, attributionControl: false }).setView(
    [state.lat || SP_CENTER.lat, state.lng || SP_CENTER.lng],
    state.lat ? 13 : 11
  );
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
  }).addTo(map);

  state.map = map;

  if (state.lat) {
    placeMarker(state.lat, state.lng, false);
  }

  map.on('click', (e) => {
    state.lat = e.latlng.lat;
    state.lng = e.latlng.lng;
    state.locationLabel = '';
    placeMarker(state.lat, state.lng, true);
    reverseGeocode(state.lat, state.lng);
    refreshLocationUI();
  });
}

function placeMarker(lat, lng, recenter) {
  if (state.marker) { state.map.removeLayer(state.marker); }
  if (state.circle) { state.map.removeLayer(state.circle); }
  const icon = L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:#8b5cf6;border:3px solid #fff;box-shadow:0 0 0 4px rgba(139,92,246,.35)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
  state.marker = L.marker([lat, lng], { icon }).addTo(state.map);
  state.circle = L.circle([lat, lng], {
    radius: state.radiusKm * 1000,
    color: '#8b5cf6',
    fillColor: '#8b5cf6',
    fillOpacity: 0.12,
    weight: 1.5,
  }).addTo(state.map);
  if (recenter) state.map.setView([lat, lng], 13);
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
    const bairro = addr.suburb || addr.neighbourhood || addr.city_district || '';
    const cidade = addr.city || addr.town || addr.municipality || '';
    state.locationLabel = [bairro, cidade].filter(Boolean).join(', ') || data.display_name?.split(',').slice(0, 2).join(',') || '';
  } catch {
    state.locationLabel = '';
  }
  refreshLocationUI();
}

function refreshLocationUI() {
  const line = document.getElementById('locationLine');
  if (line) line.innerHTML = locationLineHtml();
  const radiusInput = document.getElementById('radiusRange');
  if (radiusInput) radiusInput.disabled = !state.lat;
  refreshSearchAction();
}

function refreshSearchAction() {
  const panel = document.getElementById('searchActionPanel');
  if (panel) panel.innerHTML = searchActionHtml();
  bindSearchActionEvents();
}

function bindEvents(container) {
  const trigger = document.getElementById('categoryTrigger');
  const dropdown = document.getElementById('categoryDropdown');
  trigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    state.categoryDropdownOpen = !state.categoryDropdownOpen;
    dropdown.style.display = state.categoryDropdownOpen ? 'block' : 'none';
  });
  document.removeEventListener('click', closeDropdownOnOutsideClick);
  document.addEventListener('click', closeDropdownOnOutsideClick);

  dropdown?.querySelectorAll('[data-cat-checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) state.categories.add(cb.value);
      else state.categories.delete(cb.value);
      refreshCategoryUI();
      refreshSearchAction();
    });
  });

  container.querySelector('#selectedChips')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove-cat]');
    if (!btn) return;
    state.categories.delete(btn.dataset.removeCat);
    refreshCategoryUI();
    refreshSearchAction();
  });

  document.getElementById('clearCatsBtn')?.addEventListener('click', () => {
    state.categories.clear();
    refreshCategoryUI();
    refreshSearchAction();
  });

  document.getElementById('dataSourceSelect')?.addEventListener('change', (e) => {
    state.dataSource = e.target.value;
  });

  document.getElementById('maxResultsSelect')?.addEventListener('change', (e) => {
    state.maxResults = Number(e.target.value);
  });

  document.getElementById('radiusRange')?.addEventListener('input', (e) => {
    state.radiusKm = Number(e.target.value);
    document.getElementById('radiusVal').textContent = `${state.radiusKm} km`;
    if (state.circle) state.circle.setRadius(state.radiusKm * 1000);
    refreshLocationUI();
  });

  bindSearchActionEvents();
}

function closeDropdownOnOutsideClick(e) {
  const picker = document.querySelector('.category-picker');
  if (picker && !picker.contains(e.target)) {
    state.categoryDropdownOpen = false;
    const dropdown = document.getElementById('categoryDropdown');
    if (dropdown) dropdown.style.display = 'none';
  }
}

function refreshCategoryUI() {
  const trigger = document.getElementById('categoryTrigger');
  if (trigger) {
    trigger.querySelector('span').textContent = state.categories.size ? `${state.categories.size} selecionado(s)` : 'Toque para escolher os nichos...';
  }
  const chips = document.getElementById('selectedChips');
  if (chips) {
    chips.innerHTML = [...state.categories].map(c => `
      <span class="chip chip-purple">${escapeHtml(c)} <span class="chip-remove" data-remove-cat="${escapeHtml(c)}">×</span></span>
    `).join('') || '<span class="hint" style="margin:0">Nenhum segmento selecionado</span>';
  }
  const row = chips?.parentElement;
  const existingClear = row?.querySelector('#clearCatsBtn');
  if (state.categories.size && !existingClear) {
    row.insertAdjacentHTML('beforeend', `<button class="btn btn-ghost btn-sm" id="clearCatsBtn">Limpar</button>`);
    document.getElementById('clearCatsBtn').addEventListener('click', () => {
      state.categories.clear();
      refreshCategoryUI();
      refreshSearchAction();
    });
  } else if (!state.categories.size && existingClear) {
    existingClear.remove();
  }
}

function bindSearchActionEvents() {
  document.getElementById('searchBtn')?.addEventListener('click', startSearch);
  document.getElementById('viewCapturedBtn')?.addEventListener('click', () => {
    const leads = store.getLeads();
    store.setLeads([...state.results, ...leads]);
    toast(`${state.results.length} leads adicionados à sua lista`, 'success');
    navigate('#/leads');
  });
  document.getElementById('newSearchBtn')?.addEventListener('click', () => {
    state.done = false;
    state.results = [];
    state.foundCount = 0;
    refreshSearchAction();
  });
}

async function startSearch() {
  state.searching = true;
  state.progress = 0;
  state.foundCount = 0;
  state.results = [];
  state.done = false;
  refreshSearchAction();

  const cats = [...state.categories];
  const steps = [];
  steps.push({ msg: `Conectando à ${DATA_SOURCES.find(s => s.value === state.dataSource)?.label}...`, pct: 8 });
  cats.forEach((c, i) => {
    steps.push({ msg: `Buscando por "${c}" em um raio de ${state.radiusKm} km...`, pct: 8 + Math.round(((i + 1) / cats.length) * 80), category: c });
  });
  steps.push({ msg: 'Organizando e calculando scores...', pct: 96 });
  steps.push({ msg: 'Finalizando busca...', pct: 100 });

  for (const step of steps) {
    await wait(randomInt(450, 850));
    state.progress = step.pct;
    state.statusMsg = step.msg;
    if (step.category) {
      const count = randomInt(3, Math.min(state.maxResults, 12));
      for (let i = 0; i < count; i++) {
        state.results.push(generateFakeLead(step.category));
      }
      state.foundCount = state.results.length;
    }
    refreshSearchAction();
  }

  await wait(300);
  state.searching = false;
  state.done = true;
  refreshSearchAction();
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateFakeLead(category) {
  const base = BASE_WORD[category] || category;
  const name = `${base} ${pickRandom(ADJECTIVES)}`;
  const bairro = state.locationLabel ? state.locationLabel.split(',')[0].trim() : 'Centro';
  const cidade = state.locationLabel && state.locationLabel.includes(',') ? state.locationLabel.split(',')[1]?.trim() : 'São Paulo';
  const hasSite = Math.random() > 0.55;
  const hasWa = Math.random() > 0.25;
  return {
    id: uid('lead'),
    empresa: name,
    tipo: category,
    telefone: `(11) 9${randomInt(6000, 9999)}-${randomInt(1000, 9999)}`,
    temWhatsapp: hasWa,
    cidade: cidade || 'São Paulo',
    bairro: bairro || 'Centro',
    endereco: `Rua ${bairro || 'Central'}, ${randomInt(50, 999)}`,
    site: hasSite ? `${name.toLowerCase().replace(/\s+/g, '')}.com.br` : null,
    instagram: Math.random() > 0.4 ? `@${name.toLowerCase().replace(/\s+/g, '')}` : null,
    googleMapsUrl: `https://www.google.com/maps/search/${encodeURIComponent(name)}`,
    score: randomInt(30, 98),
    status: 'ativos',
    createdAt: new Date().toISOString(),
    lat: state.lat + (Math.random() - 0.5) * 0.03,
    lng: state.lng + (Math.random() - 0.5) * 0.03,
    siteAnalysis: null,
  };
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
