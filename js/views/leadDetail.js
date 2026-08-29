import { store } from '../store.js';
import { openModal, closeModal, escapeHtml, scoreClass, scoreLabel, waLink, toast, confirmModal } from '../utils.js';
import { scanSite } from '../siteScan.js';

const STATUS_LABELS = { ativos: 'Novo', qualificados: 'Qualificado', 'em-contato': 'Em Contato', arquivados: 'Arquivado' };
const STATUS_BADGE = { ativos: 'badge-novo', qualificados: 'badge-qualificado', 'em-contato': 'badge-contato', arquivados: 'badge-arquivado' };

let scanning = false;

export function openLeadDetail(leadId, onChange) {
  scanning = false;
  render(leadId, onChange);
}

function getLead(leadId) {
  return store.getLeads().find(l => l.id === leadId);
}

function updateLead(leadId, patch) {
  const leads = store.getLeads();
  const idx = leads.findIndex(l => l.id === leadId);
  if (idx === -1) return null;
  leads[idx] = { ...leads[idx], ...patch };
  store.setLeads(leads);
  return leads[idx];
}

function render(leadId, onChange) {
  const lead = getLead(leadId);
  if (!lead) { closeModal(); return; }
  const { ddi } = store.getSettings();

  const overlay = openModal(bodyHtml(lead, ddi), { size: 'modal-lg' });

  overlay.querySelector('[data-close]')?.addEventListener('click', () => closeModal());

  overlay.querySelector('#detailQualifyBtn')?.addEventListener('click', () => {
    updateLead(lead.id, { status: 'qualificados' });
    toast('Lead qualificado', 'success');
    render(leadId, onChange);
    onChange?.();
  });
  overlay.querySelector('#detailContactBtn')?.addEventListener('click', () => {
    updateLead(lead.id, { status: 'em-contato' });
    toast('Lead movido para Em Contato', 'success');
    render(leadId, onChange);
    onChange?.();
  });
  overlay.querySelector('#detailArchiveBtn')?.addEventListener('click', () => {
    updateLead(lead.id, { status: 'arquivados' });
    toast('Lead arquivado', 'info');
    render(leadId, onChange);
    onChange?.();
  });
  overlay.querySelector('#detailWaBtn')?.addEventListener('click', () => {
    window.open(waLink(ddi, lead.telefone, `Olá ${lead.empresa}, tudo bem?`), '_blank', 'noopener');
  });
  overlay.querySelector('#scanSiteBtn')?.addEventListener('click', async () => {
    scanning = true;
    render(leadId, onChange);
    const analysis = await scanSite(lead);
    updateLead(lead.id, { siteAnalysis: analysis, site: lead.site });
    scanning = false;
    toast(analysis.hasSite ? 'Site encontrado e analisado' : 'Nenhum site encontrado', analysis.hasSite ? 'success' : 'info');
    render(leadId, onChange);
    onChange?.();
  });
}

function bodyHtml(lead, ddi) {
  return `
    <div class="modal-head">
      <div class="modal-title">${escapeHtml(lead.empresa)}</div>
      <button class="modal-close" data-close><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke-linecap="round"/></svg></button>
    </div>
    <div class="modal-body">
      <div class="detail-score-row">
        <div class="score-pill">
          <span class="score-num ${scoreClass(lead.score)}">${lead.score}</span>
          <span class="score-label">${scoreLabel(lead.score)}</span>
        </div>
        <div style="flex:1">
          <span class="badge ${STATUS_BADGE[lead.status]}">${STATUS_LABELS[lead.status]}</span>
          <div class="hint" style="margin-top:6px">${escapeHtml(lead.tipo)} · ${escapeHtml(lead.bairro)}, ${escapeHtml(lead.cidade)}</div>
        </div>
      </div>

      <div class="detail-grid">
        <div class="detail-item"><span class="detail-label">Empresa</span><span class="detail-value">${escapeHtml(lead.empresa)}</span></div>
        <div class="detail-item"><span class="detail-label">Categoria</span><span class="detail-value">${escapeHtml(lead.tipo)}</span></div>
        <div class="detail-item"><span class="detail-label">Telefone</span><span class="detail-value">${escapeHtml(ddi)} ${escapeHtml(lead.telefone)}</span></div>
        <div class="detail-item"><span class="detail-label">WhatsApp</span><span class="detail-value">${lead.temWhatsapp ? 'Disponível' : 'Não informado'}</span></div>
        <div class="detail-item"><span class="detail-label">Cidade</span><span class="detail-value">${escapeHtml(lead.cidade)}</span></div>
        <div class="detail-item"><span class="detail-label">Bairro</span><span class="detail-value">${escapeHtml(lead.bairro)}</span></div>
        <div class="detail-item" style="grid-column:1/-1"><span class="detail-label">Endereço</span><span class="detail-value">${escapeHtml(lead.endereco || '-')}</span></div>
        <div class="detail-item"><span class="detail-label">Site</span><span class="detail-value">${lead.site ? `<a href="https://${lead.site.replace(/^https?:\/\//, '')}" target="_blank" rel="noopener">${escapeHtml(lead.site)}</a>` : 'Não encontrado'}</span></div>
        <div class="detail-item"><span class="detail-label">Instagram</span><span class="detail-value">${lead.instagram ? escapeHtml(lead.instagram) : '-'}</span></div>
        <div class="detail-item" style="grid-column:1/-1"><span class="detail-label">Google Maps</span><span class="detail-value"><a href="${lead.googleMapsUrl}" target="_blank" rel="noopener">Abrir no Google Maps →</a></span></div>
      </div>

      ${scanSectionHtml(lead)}

      <div class="detail-actions">
        <button class="btn btn-secondary btn-sm" id="detailQualifyBtn">Qualificar</button>
        <button class="btn btn-secondary btn-sm" id="detailContactBtn">Entrar em contato</button>
        <button class="btn btn-primary btn-sm" id="detailWaBtn">
          <svg viewBox="0 0 24 24"><path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.5 8.5 0 0 1-4-1L3 20l1.1-5A8.4 8.4 0 1 1 21 11.5Z"/></svg>
          Abrir WhatsApp
        </button>
        <button class="btn btn-danger btn-sm" id="detailArchiveBtn">Arquivar</button>
      </div>
    </div>
  `;
}

function scanSectionHtml(lead) {
  if (scanning) {
    return `
      <div class="scan-box">
        <div class="search-status"><span class="spinner"></span><span>Analisando presença digital...</span></div>
      </div>
    `;
  }
  const a = lead.siteAnalysis;
  if (!a) {
    return `
      <div class="scan-box">
        <div class="section-title" style="margin-bottom:8px">Análise de site</div>
        <button class="btn btn-secondary btn-sm" id="scanSiteBtn">Escanear Site</button>
      </div>
    `;
  }
  return `
    <div class="scan-box">
      <div class="panel-head" style="margin-bottom:6px">
        <div class="section-title" style="margin-bottom:0">Análise de site</div>
        <button class="btn btn-ghost btn-sm" id="scanSiteBtn">Escanear novamente</button>
      </div>
      <div class="hint" style="margin-top:0;margin-bottom:8px">${a.hasSite ? `Site encontrado: ${escapeHtml(a.discoveredSite)}` : 'Nenhum site foi encontrado para este lead.'}</div>
      ${metricRow('Qualidade do site', a.quality)}
      ${metricRow('Presença mobile', a.mobile ? 100 : 15, a.mobile ? 'Sim' : 'Não')}
      ${metricRow('Informações de contato', a.contactInfo ? 100 : 15, a.contactInfo ? 'Sim' : 'Não')}
      ${metricRow('Presença digital', a.digitalPresence)}
      <div class="scan-metric" style="margin-top:12px;border-top:1px solid var(--border);padding-top:10px">
        <span class="scan-metric-label" style="font-weight:700;color:var(--text)">Pontuação geral</span>
        <span class="score-num ${scoreClass(a.overallScore)}">${a.overallScore}</span>
      </div>
    </div>
  `;
}

function metricRow(label, pct, overrideText) {
  return `
    <div class="scan-metric">
      <span class="scan-metric-label">${label}</span>
      <div class="mini-bar"><div class="mini-bar-fill" style="width:${pct}%"></div></div>
      <span style="font-size:12px;font-weight:700;color:var(--text-2)">${overrideText || pct + '%'}</span>
    </div>
  `;
}
