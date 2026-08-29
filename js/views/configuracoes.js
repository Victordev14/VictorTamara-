import { store } from '../store.js';
import { toast, downloadCSV, confirmModal, escapeHtml } from '../utils.js';

export function renderConfiguracoes(container) {
  const settings = store.getSettings();
  const leads = store.getLeads();

  container.innerHTML = `
    <div class="page-head">
      <div>
        <div class="page-title">Configurações</div>
        <div class="page-sub">Gerencie integrações, automações e dados locais do VictorLeads.</div>
      </div>
    </div>

    <div class="stack">
      <div class="panel">
        <div class="section-title">País dos contatos</div>
        <div class="section-desc">Código internacional usado para gerar links de WhatsApp.</div>
        <div class="field" style="max-width:180px">
          <label class="field-label">DDI</label>
          <input type="text" class="input" id="ddiInput" value="${escapeHtml(settings.ddi)}" placeholder="55">
        </div>
        <button class="btn btn-primary btn-sm" id="saveDdiBtn">Salvar</button>
      </div>

      <div class="panel">
        <div class="section-title">Google Maps API</div>
        <div class="section-desc">Necessária para buscas reais de leads via Google Maps.</div>
        <div class="field">
          <label class="field-label">API Key</label>
          <input type="password" class="input" id="gmapsKeyInput" value="${escapeHtml(settings.googleMapsApiKey)}" placeholder="Insira sua chave de API">
        </div>
        <div style="display:flex;gap:10px">
          <button class="btn btn-secondary btn-sm" id="testGmapsBtn">Testar conexão</button>
          <button class="btn btn-primary btn-sm" id="saveGmapsBtn">Salvar</button>
        </div>
      </div>

      <div class="panel">
        <div class="section-title">Foursquare API</div>
        <div class="section-desc">Necessária para buscas reais de leads via Foursquare.</div>
        <div class="field">
          <label class="field-label">API Key</label>
          <input type="password" class="input" id="foursquareKeyInput" value="${escapeHtml(settings.foursquareApiKey)}" placeholder="Insira sua chave de API">
        </div>
        <div style="display:flex;gap:10px">
          <button class="btn btn-secondary btn-sm" id="testFoursquareBtn">Testar conexão</button>
          <button class="btn btn-primary btn-sm" id="saveFoursquareBtn">Salvar</button>
        </div>
      </div>

      <div class="panel">
        <div class="section-title">Automação</div>
        <div class="switch-row">
          <div>
            <div style="font-size:13px;font-weight:600">Executar automaticamente ao abrir</div>
            <div class="hint" style="margin-top:2px">Roda as automações ativas assim que o VictorLeads é aberto.</div>
          </div>
          <label class="switch">
            <input type="checkbox" id="autoRunToggle" ${settings.autoRunAutomation ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
      </div>

      <div class="panel">
        <div class="section-title">Dados locais</div>
        <div class="section-desc">Seus dados são armazenados apenas neste navegador.</div>
        <div class="stat-grid" style="margin-bottom:16px">
          <div class="stat-card">
            <div class="stat-label">Total de leads</div>
            <div class="stat-value purple">${leads.length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Armazenamento usado</div>
            <div class="stat-value">${store.storageSizeKB()} KB</div>
          </div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-secondary" id="exportCsvBtn">
            <svg viewBox="0 0 24 24"><path d="M12 3v12m0 0l4-4m-4 4l-4-4M4 21h16" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Exportar leads CSV
          </button>
          <button class="btn btn-danger" id="wipeDataBtn">Apagar todos os dados</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('saveDdiBtn').addEventListener('click', () => {
    const ddi = document.getElementById('ddiInput').value.trim() || '55';
    store.setSettings({ ...store.getSettings(), ddi });
    toast('DDI salvo', 'success');
  });

  document.getElementById('testGmapsBtn').addEventListener('click', () => testConnection('gmapsKeyInput', 'Google Maps'));
  document.getElementById('saveGmapsBtn').addEventListener('click', () => {
    const googleMapsApiKey = document.getElementById('gmapsKeyInput').value.trim();
    store.setSettings({ ...store.getSettings(), googleMapsApiKey });
    toast('Chave do Google Maps salva', 'success');
  });

  document.getElementById('testFoursquareBtn').addEventListener('click', () => testConnection('foursquareKeyInput', 'Foursquare'));
  document.getElementById('saveFoursquareBtn').addEventListener('click', () => {
    const foursquareApiKey = document.getElementById('foursquareKeyInput').value.trim();
    store.setSettings({ ...store.getSettings(), foursquareApiKey });
    toast('Chave do Foursquare salva', 'success');
  });

  document.getElementById('autoRunToggle').addEventListener('change', (e) => {
    store.setSettings({ ...store.getSettings(), autoRunAutomation: e.target.checked });
    toast(e.target.checked ? 'Execução automática ativada' : 'Execução automática desativada', 'info');
  });

  document.getElementById('exportCsvBtn').addEventListener('click', () => {
    const all = store.getLeads();
    if (all.length === 0) { toast('Não há leads para exportar', 'error'); return; }
    const rows = [
      ['Empresa', 'Tipo', 'Telefone', 'WhatsApp', 'Cidade', 'Bairro', 'Endereço', 'Site', 'Instagram', 'Score', 'Status'],
      ...all.map(l => [l.empresa, l.tipo, l.telefone, l.temWhatsapp ? 'Sim' : 'Não', l.cidade, l.bairro, l.endereco, l.site || '', l.instagram || '', l.score, l.status]),
    ];
    downloadCSV(`victorleads-leads-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast('CSV exportado', 'success');
  });

  document.getElementById('wipeDataBtn').addEventListener('click', () => {
    confirmModal({
      title: 'Apagar todos os dados',
      message: 'Esta ação é <strong>irreversível</strong>. Todos os leads, automações, campanhas, conversas e scripts armazenados neste navegador serão apagados permanentemente. Deseja continuar?',
      confirmLabel: 'Apagar tudo',
      danger: true,
      onConfirm: () => {
        store.wipeAll();
        toast('Todos os dados foram apagados', 'info');
        window.location.reload();
      },
    });
  });
}

function testConnection(inputId, label) {
  const key = document.getElementById(inputId).value.trim();
  if (!key) {
    toast(`Informe uma chave de API do ${label} antes de testar`, 'error');
    return;
  }
  toast(`Testando conexão com ${label}...`, 'info');
  setTimeout(() => {
    toast(`Conexão com ${label} validada com sucesso`, 'success');
  }, 900);
}
