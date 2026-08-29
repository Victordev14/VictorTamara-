import { randomInt } from './utils.js';

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function analyzeLeadSync(lead) {
  const hasSite = !!lead.site || Math.random() > 0.5;
  if (!hasSite) {
    return {
      scanned: true,
      hasSite: false,
      quality: 0,
      mobile: false,
      contactInfo: false,
      digitalPresence: randomInt(5, 25),
      overallScore: randomInt(5, 20),
      discoveredSite: null,
      scannedAt: new Date().toISOString(),
    };
  }
  const quality = randomInt(35, 97);
  const mobile = Math.random() > 0.3;
  const contactInfo = Math.random() > 0.35;
  const digitalPresence = randomInt(30, 95);
  const overallScore = Math.round((quality + digitalPresence + (mobile ? 90 : 40) + (contactInfo ? 90 : 40)) / 4);
  return {
    scanned: true,
    hasSite: true,
    quality,
    mobile,
    contactInfo,
    digitalPresence,
    overallScore,
    discoveredSite: lead.site || `${lead.empresa.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com.br`,
    scannedAt: new Date().toISOString(),
  };
}

export async function scanSite(lead) {
  await wait(randomInt(900, 1700));
  const analysis = analyzeLeadSync(lead);
  lead.siteAnalysis = analysis;
  if (analysis.hasSite && !lead.site) lead.site = analysis.discoveredSite;
  return analysis;
}
