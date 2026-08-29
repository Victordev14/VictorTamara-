import {
  generateDemoLeads,
  generateDemoAutomations,
  generateDemoScripts,
  generateDemoCampaigns,
  generateDemoConversations,
} from './data/demoData.js';

const KEYS = {
  leads: 'vl_leads',
  automations: 'vl_automations',
  scripts: 'vl_scripts',
  campaigns: 'vl_campaigns',
  conversations: 'vl_conversations',
  settings: 'vl_settings',
  whatsapp: 'vl_whatsapp',
  seeded: 'vl_seeded_v1',
};

const DEFAULT_SETTINGS = {
  ddi: '55',
  googleMapsApiKey: '',
  foursquareApiKey: '',
  autoRunAutomation: false,
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function seedIfEmpty() {
  if (localStorage.getItem(KEYS.seeded)) return;
  const leads = generateDemoLeads();
  write(KEYS.leads, leads);
  write(KEYS.automations, generateDemoAutomations());
  write(KEYS.scripts, generateDemoScripts());
  write(KEYS.campaigns, generateDemoCampaigns(leads));
  write(KEYS.conversations, generateDemoConversations(leads));
  write(KEYS.settings, DEFAULT_SETTINGS);
  write(KEYS.whatsapp, { connected: false });
  localStorage.setItem(KEYS.seeded, '1');
}

export const store = {
  getLeads: () => read(KEYS.leads, []),
  setLeads: (leads) => write(KEYS.leads, leads),

  getAutomations: () => read(KEYS.automations, []),
  setAutomations: (v) => write(KEYS.automations, v),

  getScripts: () => read(KEYS.scripts, []),
  setScripts: (v) => write(KEYS.scripts, v),

  getCampaigns: () => read(KEYS.campaigns, []),
  setCampaigns: (v) => write(KEYS.campaigns, v),

  getConversations: () => read(KEYS.conversations, []),
  setConversations: (v) => write(KEYS.conversations, v),

  getSettings: () => read(KEYS.settings, DEFAULT_SETTINGS),
  setSettings: (v) => write(KEYS.settings, v),

  getWhatsapp: () => read(KEYS.whatsapp, { connected: false }),
  setWhatsapp: (v) => write(KEYS.whatsapp, v),

  wipeAll: () => {
    write(KEYS.leads, []);
    write(KEYS.automations, []);
    write(KEYS.scripts, []);
    write(KEYS.campaigns, []);
    write(KEYS.conversations, []);
    write(KEYS.settings, DEFAULT_SETTINGS);
    write(KEYS.whatsapp, { connected: false });
    localStorage.setItem(KEYS.seeded, '1');
  },

  storageSizeKB: () => {
    let total = 0;
    Object.values(KEYS).forEach(k => {
      const v = localStorage.getItem(k);
      if (v) total += v.length;
    });
    return (total / 1024).toFixed(1);
  },
};

export { KEYS };
