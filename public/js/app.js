// ==============================================================
// KerjaHub - Public Job Seeker Portal JavaScript
// High Interactivity, Live Filtering & Cloud/Local Resilience
// Professional Corporate Presentation (No Emojis & Clean Icons)
// ==============================================================

let sbClient = null;
let currentSupabaseUrl = '';
let currentSupabaseKey = '';

function parseStructuredList(val) {
  if (!val) return [];
  const splitSingle = (str, fromArray = false) => {
    const raw = String(str || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    if (!raw) return [];
    const cleanLine = (line) => line
      .replace(/^[\s•▪▫◦●○■□✓✔➤➢►▶\-–—*]+/, '')
      .replace(/^\d{1,2}[\.\)]\s+/, '')
      .trim();

    const leadingBulletRe = /^(?:[-–—•▪▫◦●○■□✓✔➤➢►▶*]|\d{1,2}[\.\)])(?:\s+\S|(?=[A-Za-zÀ-ÿ]))|^[•▪▫◦●○■□✓✔➤➢►▶*](?=\S)/;
    const inlineDashMatches = raw.match(/(?:^|\s)-(?=[A-Za-zÀ-ÿ])/g) || [];
    let hasExplicitBullets = false;
    let parts = [];

    if (raw.includes('\n')) {
      const rawLines = raw.split(/\n+/).map(s => s.trim()).filter(Boolean);
      hasExplicitBullets = rawLines.some(l => leadingBulletRe.test(l));
      if (hasExplicitBullets) {
        for (const line of rawLines) {
          const isBullet = leadingBulletRe.test(line);
          const cleaned = cleanLine(line).replace(/\s+/g, ' ');
          if (!cleaned) continue;
          if (isBullet || parts.length === 0) {
            parts.push(cleaned);
          } else {
            parts[parts.length - 1] += ' ' + cleaned;
          }
        }
      } else {
        parts = rawLines.map(cleanLine).filter(Boolean);
      }
    } else if (/[•▪▫◦●■□✓✔➤➢►▶]/.test(raw)) {
      hasExplicitBullets = true;
      parts = raw.split(/\s*[•▪▫◦●■□✓✔➤➢►▶]+\s*/).map(cleanLine).filter(Boolean);
    } else if (inlineDashMatches.length >= 2) {
      hasExplicitBullets = true;
      parts = raw.split(/(?:^|\s)+-(?=[A-Za-zÀ-ÿ])/).map(cleanLine).filter(Boolean);
    } else if (raw.replace(/(&[a-zA-Z0-9#]{2,8});/g, '$1\x00').includes(';')) {
      parts = raw.replace(/(&[a-zA-Z0-9#]{2,8});/g, '$1\x00').split(/\s*;\s*/).map(s => cleanLine(s.replace(/\x00/g, ';'))).filter(Boolean);
    } else if (/(?:^|\s)\d{1,2}[\.\)]\s+\S/.test(raw) && (raw.match(/(?:^|\s)\d{1,2}[\.\)]\s+/g) || []).length >= 2) {
      hasExplicitBullets = true;
      parts = raw.split(/\s+(?=\d{1,2}[\.\)]\s+)/).map(cleanLine).filter(Boolean);
    } else {
      parts = [cleanLine(raw)].filter(Boolean);
    }

    if (hasExplicitBullets) {
      return parts;
    }

    const out = [];
    const gluedRe = /(?<=[a-z0-9\)%]|SMA|SMK|WNI|S1|D3|TAHUN|AKTIF|ROHANI|JASMANI|MENIKAH|SEDERAJAT|WANITA|PRIA)(?=(?:Pendidikan|Lulusan|Usia|Umur|Tinggi|Berat|Sehat|Tidak|Belum|Bukan|Bersedia|Memiliki|Warga|WNI|Minimal|Maksimal|Berpenampilan|Siap|Mampu|Menguasai|Pengalaman|Diutamakan|Fresh|Domisili|Penempatan|Pria|Wanita|Laki|Perempuan|MEMILIKI|TIDAK|BERSEDIA|SEHAT|USIA|TINGGI|PENDIDIKAN|MINIMAL|MAKSIMAL)\b)/g;
    const collapsedRe = /(?<=[a-zA-Z0-9\)%])\s+(?=(?:Pendidikan\s+(?:min|Min|SMA|SMK|D3|S1)|Lulusan\s+(?:SMA|SMK|D3|S1|min)|Usia\s+(?:min|max|Min|Max|\d)|Umur\s+(?:min|max|\d)|Tinggi\s+[bB]adan|Berat\s+[bB]adan|Sehat\s+(?:[Jj]asmani|[Ff]isik|[Rr]ohani)|Tidak\s+(?:[Bb]uta|[Bb]erkacamata|[Bb]ertato|[Ss]edang|[Pp]ernah|[Mm]erokok|[Mm]emiliki)|Bersedia\s+(?:[Bb]ekerja|[Dd]itempatkan|[Ss]hift|[Ll]embur|[Mm]engikuti)|Memiliki\s+(?:[Pp]engalaman|SIM|KTP|SKCK|NPWP|[Ss]ertifikat|[Kk]emampuan)|Menguasai\s+(?:Microsoft|Ms\.|Excel|Word|[Bb]ahasa|[Kk]omputer)|Diutamakan\s+(?:[Yy]ang|[Mm]emiliki|[Bb]erpengalaman|[Dd]omisili)|Berpenampilan\s+[Mm]enarik|Fresh\s+[Gg]raduate))/g;

    for (const p of parts) {
      const gluedSplit = p.replace(gluedRe, '\n').split('\n');
      for (const seg of gluedSplit) {
        const expanded = (!fromArray && seg.length > 48) ? seg.replace(collapsedRe, '\n') : seg;
        expanded.split('\n').map(cleanLine).filter(Boolean).forEach(item => out.push(item));
      }
    }
    return out;
  };

  let arr = val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('[')) {
      try { arr = JSON.parse(trimmed); } catch { return splitSingle(trimmed, false); }
    } else {
      return splitSingle(trimmed, false);
    }
  }
  if (Array.isArray(arr)) {
    const res = [];
    for (const item of arr) {
      if (item === null || item === undefined) continue;
      splitSingle(item, true).forEach(s => res.push(s));
    }
    return res;
  }
  return splitSingle(arr, false);
}
if (typeof window !== 'undefined') window.parseStructuredList = parseStructuredList;

// SAFE STORAGE HELPER (Anti Tracking Prevention block & Private Browsing safe)
const _appMemoryStore = { local: {}, session: {} };
function safeLocalGet(key) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch (e) { }
  return _appMemoryStore.local[key] || null;
}
function safeLocalSet(key, value) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
  } catch (e) { }
  _appMemoryStore.local[key] = String(value);
}
function safeLocalRemove(key) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
      return;
    }
  } catch (e) { }
  delete _appMemoryStore.local[key];
}
function safeSessionGet(key) {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage.getItem(key);
    }
  } catch (e) { }
  return _appMemoryStore.session[key] || null;
}
function safeSessionSet(key, value) {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(key, value);
      return;
    }
  } catch (e) { }
  _appMemoryStore.session[key] = String(value);
}
function safeSessionRemove(key) {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(key);
      return;
    }
  } catch (e) { }
  delete _appMemoryStore.session[key];
}

const DEFAULT_SUPABASE_URL = "https://nptmawuukuysqzqakwej.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_CeLmp_Pj-sgJ_vIrShAj2A__rzAQIYT";
const ALTERNATE_SUPABASE_KEY = "sb_publishable_vhr-CPf4EI0fy2Xsl1uBPg_RxF7UwWT";

function getApiEndpoint(endpoint) {
  if (!endpoint) return '';
  const clean = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
  const pathname = window.location.pathname.toLowerCase();
  if (pathname.includes('/job_portal/')) {
    return `/Job_portal${clean}`;
  }
  return clean;
}

async function safeFetchJson(url, options = {}) {
  if (typeof window !== 'undefined' && window.location) {
    if (window.location.protocol === 'file:' || window.location.hostname.includes('github.io')) {
      return { ok: false, status: 0, data: null, error: new Error('Static/offline environment') };
    }
  }
  try {
    const res = await fetch(url, options);
    let data = null;
    try {
      const text = await res.text();
      if (text && text.trim()) {
        data = JSON.parse(text);
      }
    } catch (parseErr) { }
    return { ok: res.ok, status: res.status, data, res };
  } catch (netErr) {
    return { ok: false, status: 0, data: null, error: netErr };
  }
}

// Global Normalizer: Cleans social media copy, emoji spam, extracts real company and structured metadata
window.cleanJobData = function (job) {
  if (!job) return job;
  const copy = { ...job };

  let rawTitle = (copy.title || '').trim();
  let comp = (copy.company_name || '').trim();
  let desc = (copy.description || '').trim();

  const hasEmoji = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(rawTitle + ' ' + comp);
  const isMessyTitle = hasEmoji || /^(untuk\s+|lowongan\s+bumn|loker\s+terbaru)/i.test(rawTitle) || rawTitle.includes('🏢') || rawTitle.includes('💼') || rawTitle.endsWith('..');
  const isGenericComp = /^(instagram|facebook|twitter|linkedin|web|portal|loker|google|bing|website)$/i.test(comp);

  const searchTexts = [desc, rawTitle];

  // 1. Detect Real Company Name if currently placeholder / social media
  if (isGenericComp || comp.length < 5 || comp.includes('🏢')) {
    for (const text of searchTexts) {
      const ptMatch = text.match(/(?:🏢\s*)?((?:PT|CV|Bank|Yayasan|RSUD|RS|Universitas|Politeknik)\s+[^💼📢🕒🕐🎓\n\r,]+?)(?=\s+(?:membuka|buka|posisi|career|recruitment|💼|📢|🕒|🕐|🎓|$))/i);
      if (ptMatch && ptMatch[1]) {
        const extractedComp = ptMatch[1].replace(/^[🏢\s]+/, '').replace(/[\.\s]+$/, '').trim();
        if (extractedComp.length > 3) {
          comp = extractedComp;
          break;
        }
      }
    }
  }

  // 2. Extract Clean Title ONLY if messy
  let cleanTitle = rawTitle;
  if (isMessyTitle) {
    let candidateTitle = '';
    for (const text of searchTexts) {
      const posMatch = text.match(/(?:💼\s*Posisi:?|Posisi\s*:?)\s*([^🕒🕐🎓📢🏢\n\r]+?)(?=\s*(?:🕒|🕐|🎓|📢|🏢|Status:|Jenjang:|Pendidikan:|PT |CV |membuka|$))/i);
      if (posMatch && posMatch[1]) {
        const cand = posMatch[1].replace(/[\.\s]+$/, '').trim();
        if (!cand.endsWith('..') && cand.length > candidateTitle.length && !cand.toLowerCase().includes('informasi dipublikasikan')) {
          candidateTitle = cand;
        }
      }
    }

    if (candidateTitle) {
      cleanTitle = candidateTitle;
    } else {
      cleanTitle = cleanTitle.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ' ');
      cleanTitle = cleanTitle.replace(/\b(LOWONGAN\s+(?:BUMN\s+)?(?:TERBARU\s+)?|LOKER\s+TERBARU\s+|WE ARE HIRING\s+|DIBUTUHKAN\s+SEGERA\s+)\b/gi, ' ');
      if (comp && cleanTitle.includes(comp)) {
        cleanTitle = cleanTitle.replace(comp, ' ');
      }
      cleanTitle = cleanTitle.replace(/\s+-\s+[^-]+$/, '').trim();
      cleanTitle = cleanTitle.replace(/\s+/g, ' ').replace(/[\.\s]+$/, '').trim();
    }

    if (/^untuk\s+/i.test(cleanTitle)) {
      cleanTitle = 'Program Rekrutmen Perbankan ' + cleanTitle;
    }
  }

  // Clean trailing punctuation & spaces
  cleanTitle = cleanTitle.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').replace(/\s+/g, ' ').trim();
  comp = comp.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').replace(/\s+/g, ' ').trim();

  // 3. Extract Metadata: Status & Education
  let statusVal = copy.job_type || '';
  let eduVal = copy.experience_level || '';
  for (const text of searchTexts) {
    const sm = text.match(/(?:🕒|🕐|Status\s*:?)\s*([A-Za-z\s]+?)(?=\s*(?:🎓|Jenjang|Pendidikan|PT |CV |membuka|$))/i);
    if (sm && sm[1]) statusVal = sm[1].trim();

    const em = text.match(/(?:🎓|Jenjang\s*Pendidikan\s*:?|Pendidikan\s*:?)\s*([^🏢📢💼🕒🕐\n\r]+?)(?=\s*(?:PT |CV |membuka|Status|$))/i);
    if (em && em[1]) {
      eduVal = em[1].replace(/^(?:Jenjang\s*Pendidikan|Pendidikan)\s*:?\s*/i, '').trim();
    }
  }

  // 4. Clean Description Narrative
  let cleanDesc = desc;
  if (!cleanDesc || cleanDesc.includes('📢') || cleanDesc.includes('🏢') || cleanDesc.includes('💼') || cleanDesc.includes('🎓') || cleanDesc.includes('🕐')) {
    cleanDesc = comp + ' membuka kesempatan berkarir untuk posisi ' + cleanTitle + '.';
    if (eduVal) cleanDesc += ' Terbuka bagi pelamar dengan kualifikasi jenjang pendidikan ' + eduVal + '.';
    if (statusVal) cleanDesc += ' Status hubungan kerja: ' + statusVal + '.';
    cleanDesc += ' Seluruh tahapan pendaftaran dan verifikasi berkas dilakukan secara resmi tanpa dipungut biaya apapun.';
  }

  // 5. Clean Responsibilities
  let resps = parseStructuredList(copy.responsibilities);
  resps = resps.map(r => {
    let cleanR = String(r || '');
    if (/Menjalankan tugas utama posisi/i.test(cleanR)) {
      cleanR = 'Menjalankan tugas dan tanggung jawab utama posisi ' + cleanTitle + '.';
    }
    cleanR = cleanR.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
    cleanR = cleanR.replace(/\s+/g, ' ').trim();
    return cleanR;
  }).filter(r => r.length >= 2);

  if ((resps.length <= 2 || isMessyTitle) && resps.length < 4) {
    if (/administrasi|admin/i.test(cleanTitle) && !resps.some(r => r.includes('administrasi dokumen'))) {
      resps.unshift('Mengelola tata kelola administrasi dokumen, pengarsipan berkas, dan pencatatan operasional unit.');
    }
    if (/finance|keuangan|accounting|akuntansi/i.test(cleanTitle) && !resps.some(r => r.includes('keuangan'))) {
      resps.push('Mendukung proses rekonsiliasi data transaksi dan penyusunan berkas administrasi fungsi keuangan.');
    }
    if (resps.length < 2) {
      resps.push(`Menjaga profesionalisme, integritas, dan disiplin kerja di lingkungan ${comp}.`);
      resps.push('Berkoordinasi secara aktif dengan tim kerja demi kelancaran pencapaian target operasional.');
    }
  }

  // 6. Clean Requirements & Benefits
  let reqs = parseStructuredList(copy.requirements);
  reqs = reqs.map(r => {
    let cleanReq = String(r || '').replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').replace(/\s+/g, ' ').trim();
    if (/pendidikan sesuai kualifikasi/i.test(cleanReq) && eduVal) {
      cleanReq = `Kualifikasi jenjang pendidikan: ${eduVal}.`;
    }
    return cleanReq;
  }).filter(r => r.length >= 2);

  let bens = parseStructuredList(copy.benefits)
    .map(b => String(b || '').replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').replace(/\s+/g, ' ').trim())
    .filter(b => b.length >= 2);

  copy.title = cleanTitle || rawTitle;
  copy.company_name = comp;
  copy.description = cleanDesc;
  copy.responsibilities = resps;
  copy.requirements = reqs;
  copy.benefits = bens;
  copy._clean_status = statusVal;
  copy._clean_education = eduVal;

  // Extract cover_image & flyer_images (from database columns or contact_value JSON)
  let coverImg = copy.cover_image || '';
  let flyers = Array.isArray(copy.flyer_images) ? [...copy.flyer_images] : [];
  if (typeof copy.flyer_images === 'string' && copy.flyer_images.startsWith('[')) {
    try {
      const parsed = JSON.parse(copy.flyer_images);
      if (Array.isArray(parsed)) flyers = parsed;
    } catch (e) { }
  }
  if (copy.contact_value) {
    try {
      const cv = typeof copy.contact_value === 'string' ? JSON.parse(copy.contact_value) : copy.contact_value;
      if (cv) {
        if (!coverImg && cv.cover_image) coverImg = cv.cover_image;
        if ((!flyers || flyers.length === 0) && Array.isArray(cv.flyer_images)) {
          flyers = cv.flyer_images;
        }
      }
    } catch (e) { }
  }
  if ((!flyers || flyers.length === 0) && copy.poster_image && String(copy.poster_image).trim()) {
    flyers = [copy.poster_image];
  }
  copy.cover_image = coverImg;
  copy.flyer_images = (flyers || []).filter(Boolean);

  return copy;
};

// Site Settings (WhatsApp CV Order & Social Media Footer)
window.siteSettings = {
  cv_whatsapp: '081234567890',
  cv_order_message: 'Halo Admin KerjaHub, saya ingin memesan layanan pembuatan / review CV profesional berstandar ATS agar lolos seleksi kerja. Mohon informasi tarif dan prosedurnya. Terima kasih.',
  instagram_url: '',
  tiktok_url: ''
};

function normalizePublicSocialUrl(rawVal, platform) {
  const raw = String(rawVal || '').trim();
  if (!raw || /^(javascript|data|vbscript):/i.test(raw)) return '';
  let url = raw;
  if (!/^https?:\/\//i.test(url)) {
    const cleanHandle = raw.replace(/^@+/, '').replace(/^\/+|\/+$/g, '');
    if (!cleanHandle) return '';
    if (platform === 'instagram') {
      url = (/^(www\.)?instagram\.com\//i.test(cleanHandle) || /^instagr\.am\//i.test(cleanHandle))
        ? `https://${cleanHandle}`
        : `https://www.instagram.com/${cleanHandle}/`;
    } else if (platform === 'tiktok') {
      url = (/^(www\.|vm\.|vt\.)?tiktok\.com\//i.test(cleanHandle))
        ? `https://${cleanHandle}`
        : `https://www.tiktok.com/@${cleanHandle}`;
    } else {
      url = `https://${cleanHandle}`;
    }
  }
  try {
    const parsed = new URL(url);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') ? parsed.href : '';
  } catch (e) {
    return '';
  }
}

window.renderFooterSocialLinks = function () {
  const container = document.getElementById('footer-social-links');
  if (!container) return;
  const s = window.siteSettings || {};
  const igUrl = normalizePublicSocialUrl(s.instagram_url, 'instagram');
  const ttUrl = normalizePublicSocialUrl(s.tiktok_url, 'tiktok');

  const items = [];
  if (igUrl) {
    items.push(`
      <a href="${escapeHtml(igUrl)}" target="_blank" rel="noopener noreferrer" class="social-footer-btn social-ig" title="Ikuti Instagram Resmi KerjaHub" aria-label="Instagram KerjaHub">
        <span class="social-footer-icon"><i class="fa-brands fa-instagram"></i></span>
        <span>Instagram</span>
      </a>
    `);
  }
  if (ttUrl) {
    items.push(`
      <a href="${escapeHtml(ttUrl)}" target="_blank" rel="noopener noreferrer" class="social-footer-btn social-tt" title="Ikuti TikTok Resmi KerjaHub" aria-label="TikTok KerjaHub">
        <span class="social-footer-icon"><i class="fa-brands fa-tiktok"></i></span>
        <span>TikTok</span>
      </a>
    `);
  }

  if (items.length === 0) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }

  container.innerHTML = items.join('');
  container.style.display = 'inline-flex';
};

window.closeWaWidget = function() {
  const card = document.getElementById('wa-popover-card');
  const btn = document.getElementById('btn-floating-pesan-cv');
  const wrap = document.getElementById('floating-wa-widget');
  if (card) card.hidden = true;
  if (btn) btn.setAttribute('aria-expanded', 'false');
  if (wrap) wrap.classList.remove('is-open');
};

window.toggleWaWidget = function(event) {
  if (event) event.stopPropagation();
  const card = document.getElementById('wa-popover-card');
  const btn = document.getElementById('btn-floating-pesan-cv');
  const wrap = document.getElementById('floating-wa-widget');
  if (!card) {
    window.openCvOrderWhatsApp();
    return;
  }
  const willOpen = card.hidden;
  card.hidden = !willOpen;
  if (btn) btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
  if (wrap) wrap.classList.toggle('is-open', willOpen);
};

if (typeof document !== 'undefined' && !window._waWidgetOutsideBound) {
  window._waWidgetOutsideBound = true;
  document.addEventListener('click', (e) => {
    const wrap = document.getElementById('floating-wa-widget');
    const card = document.getElementById('wa-popover-card');
    if (wrap && card && !card.hidden && !wrap.contains(e.target)) {
      window.closeWaWidget();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.closeWaWidget();
  });
}

window.openCvOrderWhatsApp = function(event) {
  if (event) event.stopPropagation();
  const settings = window.siteSettings || {};
  let phone = (settings.cv_whatsapp || '081234567890').trim();
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) clean = '62' + clean.slice(1);
  else if (clean.startsWith('8')) clean = '62' + clean;
  else if (!clean.startsWith('62')) clean = '62' + clean;

  const msg = settings.cv_order_message || 'Halo Admin KerjaHub, saya ingin memesan layanan pembuatan / review CV profesional berstandar ATS agar lolos seleksi kerja. Mohon informasi tarif dan prosedurnya. Terima kasih.';
  window.open(`https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(msg)}`, '_blank');
  window.closeWaWidget();
};

window.resetCategoryFilter = function () {
  activeFilters.category = 'Semua';
  const sc = document.getElementById('search-category');
  if (sc) sc.value = 'Semua';
  const catDropdown = document.getElementById('dropdown-category');
  if (catDropdown) {
    catDropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
    catDropdown.querySelector('.dropdown-item[data-value="Semua"]')?.classList.add('active');
    const catText = catDropdown.querySelector('.dropdown-selected-text');
    if (catText) catText.textContent = 'Semua Kategori';
  }
  const allCatRadio = document.querySelector('input[name="filter_category"][value="Semua"]');
  if (allCatRadio) allCatRadio.checked = true;
  applyFiltersAndRender();
};

window.filterByPlatform = function (plat) {
  activeFilters.platform = plat;
  const radio = document.querySelector(`input[name="filter_platform"][value="${plat}"]`);
  if (radio) radio.checked = true;
  document.querySelectorAll('.chip-plat').forEach(c => {
    c.classList.toggle('active', c.dataset.platform === plat);
  });
  applyFiltersAndRender();
  document.getElementById('lowongan')?.scrollIntoView({ behavior: 'smooth' });
};

let isLoadingPublicJobs = false;

const _sbMemoryStore = {};
const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storage: {
      getItem: (k) => _sbMemoryStore[k] || null,
      setItem: (k, v) => { _sbMemoryStore[k] = String(v); },
      removeItem: (k) => { delete _sbMemoryStore[k]; }
    }
  }
};

function getOrCreateSupabaseClient(url, key, baseOpts) {
  if (!window.supabase || typeof window.supabase.createClient !== 'function') return null;
  const cache = (window.__khSupabaseClients = window.__khSupabaseClients || {});
  const cacheKey = `${url}::${key}`;
  if (cache[cacheKey]) return cache[cacheKey];

  const authOpts = Object.assign({}, (baseOpts && baseOpts.auth) || {}, {
    storageKey: 'kh_auth_' + String(key).slice(-8)
  });
  const opts = Object.assign({}, baseOpts || {}, { auth: authOpts });
  cache[cacheKey] = window.supabase.createClient(url, key, opts);
  return cache[cacheKey];
}

async function initSupabaseClient() {

  // 1. Immediately initialize with client-side default Supabase credentials so it works on GitHub Pages, workdev, and static previews
  if (!sbClient) {
    try {
      sbClient = getOrCreateSupabaseClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY, clientOptions);
      if (sbClient) {
        currentSupabaseUrl = DEFAULT_SUPABASE_URL;
        currentSupabaseKey = DEFAULT_SUPABASE_KEY;
      }
    } catch (e) {
      console.warn('Initial Supabase createClient error:', e);
    }
  }

  // 2. Fetch runtime /api/config and settings in background without blocking initial rendering
  (async () => {
    try {
      const { ok, data } = await safeFetchJson(getApiEndpoint('/api/config'));
      if (ok && data) {
        if (data.supabaseUrl && data.supabaseKey) {
          if (data.supabaseUrl !== currentSupabaseUrl || data.supabaseKey !== currentSupabaseKey) {
            try {
              const nextClient = getOrCreateSupabaseClient(data.supabaseUrl, data.supabaseKey, clientOptions);
              if (nextClient) {
                sbClient = nextClient;
                currentSupabaseUrl = data.supabaseUrl;
                currentSupabaseKey = data.supabaseKey;
              }
            } catch (e) {
              console.warn('Supabase createClient error:', e);
            }
          }
        }
        if (data.cv_whatsapp) {
          window.siteSettings.cv_whatsapp = data.cv_whatsapp;
        }
        if (data.cv_order_message) {
          window.siteSettings.cv_order_message = data.cv_order_message;
        }
        if (typeof data.instagram_url === 'string') {
          window.siteSettings.instagram_url = data.instagram_url;
        }
        if (typeof data.tiktok_url === 'string') {
          window.siteSettings.tiktok_url = data.tiktok_url;
        }
        if (typeof window.renderFooterSocialLinks === 'function') {
          window.renderFooterSocialLinks();
        }
      }
    } catch (e) {
      // offline/static preview
    }

    // 3. Resilient fallback for site settings directly from Supabase if needed
    if (sbClient && window.siteSettings && (!window.siteSettings.cv_whatsapp || window.siteSettings.cv_whatsapp === '081234567890' || (!window.siteSettings.instagram_url && !window.siteSettings.tiktok_url))) {
      try {
        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ timeout: true }), 4000));
        const fetchPromise = sbClient.from('jobs').select('description').eq('status', 'system_settings').limit(1);
        const { data: stRows } = await Promise.race([fetchPromise, timeoutPromise]);
        if (stRows && stRows.length > 0 && stRows[0].description) {
          const parsed = JSON.parse(stRows[0].description);
          if (parsed.cv_whatsapp) window.siteSettings.cv_whatsapp = parsed.cv_whatsapp;
          if (parsed.cv_order_message) window.siteSettings.cv_order_message = parsed.cv_order_message;
          if (!window.siteSettings.instagram_url && parsed.instagram_url) window.siteSettings.instagram_url = parsed.instagram_url;
          if (!window.siteSettings.tiktok_url && parsed.tiktok_url) window.siteSettings.tiktok_url = parsed.tiktok_url;
          if (typeof window.renderFooterSocialLinks === 'function') {
            window.renderFooterSocialLinks();
          }
        }
      } catch (e) { }
    }
  })();
}

// Active State
let rawAllJobs = [];
let filteredJobs = [];
let activeFilters = {
  search: '',
  category: 'Semua',
  job_type: 'Semua',
  location: 'Semua',
  experience: 'Semua',
  platform: 'Semua',
  has_salary: false,
  anti_hoax: false,
  tab: 'all',
  sort: 'newest'
};

let searchDebounceTimer = null;

let _publicRealtimeChannel = null;
function setupSupabaseRealtimeSync() {
  if (!sbClient || typeof sbClient.channel !== 'function') return;
  if (String(currentSupabaseKey || '').startsWith('sb_publishable_')) return;
  if (_publicRealtimeChannel) return;
  try {
    const channel = sbClient.channel('public-jobs-realtime-stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, async (payload) => {
        console.log('⚡ [Public Realtime] Realtime job update detected:', payload.eventType);
        safeSessionRemove('kerja_public_jobs_cache');
        await loadJobs();
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          try { sbClient.removeChannel(channel); } catch (e) { }
          try { sbClient.realtime?.disconnect(); } catch (e) { }
          _publicRealtimeChannel = null;
        }
      });
    _publicRealtimeChannel = channel;
  } catch (err) {
    console.warn('Realtime sync warning in public app:', err);
  }
}

let _lastKnownJobsVersion = '';
let _liveJobsPollTimer = null;
let _liveJobsBc = null;
let _lastJobsSignature = '';

function getJobsSignature(list) {
  if (!Array.isArray(list)) return '';
  return list.map(j => `${j.id}:${j.status || ''}:${j.updated_at || j.created_at || ''}:${j.is_featured ? 1 : 0}:${j.views_count || 0}`).join('|');
}

function isAnyUserModalOpen() {
  return Boolean(document.querySelector('#job-detail-modal.active, #poster-lightbox.active'));
}

function setupLiveJobsAutoSync() {
  if (_liveJobsPollTimer) return;

  // 1. Instant cross-tab sync (<10ms) when Admin creates/edits/deletes a job in another tab
  if (typeof BroadcastChannel === 'function' && !_liveJobsBc) {
    try {
      _liveJobsBc = new BroadcastChannel('kerjahub_jobs_sync');
      _liveJobsBc.onmessage = (ev) => {
        const msg = ev && ev.data;
        if (!msg) return;
        if (msg.type === 'settings_updated' && msg.settings) {
          Object.assign(window.siteSettings, msg.settings);
          if (typeof window.renderFooterSocialLinks === 'function') window.renderFooterSocialLinks();
          return;
        }
        if (msg.type !== 'jobs_updated') return;
        if (Array.isArray(msg.jobs)) {
          const nextJobs = msg.jobs.map(window.cleanJobData).filter(isJobPubliclyVisible);
          const nextSig = getJobsSignature(nextJobs);
          if (nextSig !== _lastJobsSignature) {
            rawAllJobs = nextJobs;
            _lastJobsSignature = nextSig;
            try {
              safeLocalSet('kerja_public_jobs_cache', JSON.stringify(rawAllJobs));
              safeSessionSet('kerja_public_jobs_cache', JSON.stringify(rawAllJobs));
            } catch (e) { }
            if (!isAnyUserModalOpen()) {
              updateTabCounters();
              if (typeof refreshMasterDataFromJobs === 'function') refreshMasterDataFromJobs();
              if (typeof renderPopularCategoriesByViews === 'function') renderPopularCategoriesByViews();
              applyFiltersAndRender();
            }
          }
        }
        loadJobs({ silent: true, bypassCache: true });
      };
    } catch (e) { }
  }

  // 2. Fallback cross-tab storage event listener
  window.addEventListener('storage', (e) => {
    if (!e) return;
    if (e.key === 'kerjahub_settings_sync' && e.newValue) {
      try {
        const s = JSON.parse(e.newValue);
        if (s && typeof s === 'object') {
          Object.assign(window.siteSettings, s);
          if (typeof window.renderFooterSocialLinks === 'function') window.renderFooterSocialLinks();
        }
      } catch (se) { }
      return;
    }
    if (e.key !== 'kerjahub_jobs_sync_ts' && e.key !== 'kerja_public_jobs_cache') return;
    try {
      const cached = safeLocalGet('kerja_public_jobs_cache');
      if (cached !== null && cached !== undefined) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const nextJobs = parsed.map(window.cleanJobData).filter(isJobPubliclyVisible);
          const nextSig = getJobsSignature(nextJobs);
          if (nextSig !== _lastJobsSignature) {
            rawAllJobs = nextJobs;
            _lastJobsSignature = nextSig;
            if (!isAnyUserModalOpen()) {
              updateTabCounters();
              if (typeof refreshMasterDataFromJobs === 'function') refreshMasterDataFromJobs();
              if (typeof renderPopularCategoriesByViews === 'function') renderPopularCategoriesByViews();
              applyFiltersAndRender();
            }
          }
        }
      }
    } catch (err) { }
    loadJobs({ silent: true, bypassCache: true });
  });

  // 3. Cross-device lightweight version polling (6s) + focus/visibility sync
  const checkVersionAndSync = async () => {
    if (document.visibilityState === 'hidden') return;
    try {
      const { ok, data: json } = await safeFetchJson(getApiEndpoint('/api/jobs/version?_t=' + Date.now()));
      if (ok && json && json.success && typeof json.version === 'string') {
        if (!_lastKnownJobsVersion) {
          _lastKnownJobsVersion = json.version;
        } else if (json.version !== _lastKnownJobsVersion) {
          _lastKnownJobsVersion = json.version;
          await loadJobs({ silent: true, bypassCache: true });
        }
      }
    } catch (e) { }
  };

  checkVersionAndSync();
  _liveJobsPollTimer = setInterval(checkVersionAndSync, 6000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkVersionAndSync();
  });
  window.addEventListener('focus', checkVersionAndSync);
}

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initSupabaseClient();
  setupEventListeners();
  setupCustomDropdowns();
  setupModalDismiss('job-detail-modal');
  setupModalDismiss('poster-lightbox');
  setupCvMatcher();
  setupLiveJobsAutoSync();
  await Promise.all([
    loadCompanyImagesCache(),
    loadMasterDataFilters(),
    loadJobs()
  ]);
  setupSupabaseRealtimeSync();
});

const STATIC_COMPANY_IMAGES = {
  "PT Kobe Boga Utama": "https://goletskerja.com/wp-content/uploads/2024/06/logo-2024-06-15T101948.321.jpg",
  "PT Patra Drilling Contractor": "https://www.tender-indonesia.com/newsrectory/files/Logo_111.68.127.98ea5bb3cc200030c4e01ae3eaee70f1fb1234567890.png",
  "PT Bank Central Asia Tbk (BCA)": "https://static.vecteezy.com/system/resources/previews/024/701/610/large_2x/yogyakarta-indonesia-march-20-2023-bank-bca-exterior-building-bank-central-asia-tbk-is-the-largest-private-bank-in-indonesia-bca-kcp-ahmad-dahlan-free-photo.JPG",
  "Trinova Tech Solutions": "https://trinovatechsolutions.in/logo.png",
  "PT Indofood CBP Sukses Makmur Tbk": "https://lokermedan.net/wp-content/uploads/2022/05/PT-Indofood-CBP-Sukses-Makmur-Tbk.jpg",
  "PT TOYOTA MOTOR MANUFACTURING INDONESIA (TMMIN)": "https://images.cakeresume.com/images/e7290147-dc27-4025-81e5-1f1cfa4e5431.jpg",
  "PT Kalbe Farma Tbk": "https://cdn1-production-images-kly.akamaized.net/UiFATqcym61jnHSQIM2axtwK_oc=/1280x720/smart/filters:quality(75):strip_icc():format(webp)/kly-media-production/medias/3526828/original/027148900_1627708283-kalbe_farma_31_juli_2021Kalbe_Farma_31_juli_2021.jpg",
  "PT Mayora Indah Tbk": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Mayora_logo.svg/512px-Mayora_logo.svg.png",
  "PT Kereta Api Indonesia (Persero)": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Logo_PT_Kereta_Api_Indonesia_%28Persero%29_2020.svg/512px-Logo_PT_Kereta_Api_Indonesia_%28Persero%29_2020.svg.png",
  "PT Bank Rakyat Indonesia (Persero) Tbk": "https://as1.ftcdn.net/v2/jpg/07/23/52/60/1000_F_723526051_FC7ZRZ9ayH8E0pRgLxBFSXV8H8xSi9PH.jpg",
  "PT Telkom Indonesia (Persero) Tbk": "https://cdn.antaranews.com/cache/1200x800/2022/03/30/logo-telkom.jpg",
  "PT Astra Honda Motor": "https://4.bp.blogspot.com/-yW5YMuFn9fY/WikUNZdotsI/AAAAAAAACtc/vSNgqAtcHiQ6hhgmf0JI7GuhZ3jLtxMGQCLcBGAs/s1600/PT_ASTRA_HONDA_MOTOR_-_panoramio.jpg",
  "Tech Innovations Lab": "https://images.glints.com/unsafe/1200x0/glints-dashboard.oss-ap-southeast-1.aliyuncs.com/company-logo/8c2bfa786d8397948713242d400800d4.jpeg",
  "Synergy Tech Global": "https://www.sinergiteknoglobal.co.id/img/gallerypage/peresmian-gedung/peresmian-gedung-001.JPG",
  "PT Yamaha Indonesia Motor Mfg": "https://global.yamaha-motor.com/about/group/asia_oceania/img/pic_004.jpg",
  "PT Krakatau Blue Water": "https://static.wikia.nocookie.net/logopedia/images/9/9f/Krakatau_Blue_Water.png",
  "PT Sumco Indonesia": "https://wlkp-assets.kemnaker.go.id/companies/95cde64d-dcfa-40f7-b85f-0ef7383e02fa/62a15a7ee1312.JPG",
  "PT Shopee International Indonesia": "https://www.shutterstock.com/shutterstock/photos/2279767699/display_1500/stock-photo-surakarta-indonesia-march-shopee-logo-on-office-building-at-surakarta-shopee-2279767699.jpg"
};

window._companyImagesCache = { ...STATIC_COMPANY_IMAGES };

async function loadCompanyImagesCache() {
  try {
    const { ok, data: json } = await safeFetchJson(getApiEndpoint('/api/company-images'));
    if (ok && json && json.success && json.data) {
      window._companyImagesCache = { ...window._companyImagesCache, ...json.data };
      if (rawAllJobs && rawAllJobs.length > 0) {
        applyFiltersAndRender();
      }
    }
  } catch (e) { }
}

// Theme handling
function initTheme() {
  const savedTheme = safeLocalGet('kerjahub_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  safeLocalSet('kerjahub_theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) {
    btn.innerHTML = theme === 'dark'
      ? '<i class="fa-solid fa-sun" style="color: #f59e0b;"></i>'
      : '<i class="fa-solid fa-moon"></i>';
  }
}

// Setup Event Listeners
function setupEventListeners() {
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  // Search Input & Clear button
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('btn-clear-search');
  const searchBtn = document.getElementById('search-btn');
  const searchCategory = document.getElementById('search-category');
  const searchLocation = document.getElementById('search-location');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      if (clearSearchBtn) {
        clearSearchBtn.style.display = val.trim() ? 'block' : 'none';
      }
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        activeFilters.search = val.trim();
        applyFiltersAndRender();
      }, 250);
    });

    searchInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        clearTimeout(searchDebounceTimer);
        activeFilters.search = searchInput.value.trim();
        applyFiltersAndRender();
      }
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      clearSearchBtn.style.display = 'none';
      activeFilters.search = '';
      applyFiltersAndRender();
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      if (searchInput) activeFilters.search = searchInput.value.trim();
      if (searchCategory) activeFilters.category = searchCategory.value;
      if (searchLocation) activeFilters.location = searchLocation.value;
      syncSidebarInputs();
      applyFiltersAndRender();
    });
  }

  if (searchCategory) {
    searchCategory.addEventListener('change', (e) => {
      activeFilters.category = e.target.value;
      syncSidebarInputs();
      applyFiltersAndRender();
    });
  }

  if (searchLocation) {
    searchLocation.addEventListener('change', (e) => {
      activeFilters.location = e.target.value;
      applyFiltersAndRender();
    });
  }

  // Trending Popular Category Chips Click (Delegated for dynamic view-ranked chips)
  const catChipsSection = document.getElementById('kategori-section');
  if (catChipsSection && !catChipsSection._delegatedBound) {
    catChipsSection._delegatedBound = true;
    catChipsSection.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip-keyword');
      if (!chip) return;
      if (chip.id === 'btn-search-all-cat' || chip.dataset.category === 'Semua') {
        if (typeof window.resetCategoryFilter === 'function') {
          window.resetCategoryFilter();
        } else {
          activeFilters.category = 'Semua';
          syncSidebarInputs();
          applyFiltersAndRender();
        }
        document.getElementById('lowongan')?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      if (chip.classList.contains('chip-plat')) {
        const plat = chip.dataset.platform || 'Semua';
        window.filterByPlatform(plat);
        return;
      }
      if (chip.dataset.category) {
        activeFilters.category = chip.dataset.category;
        if (searchCategory) searchCategory.value = chip.dataset.category;
        syncSidebarInputs();
        applyFiltersAndRender();
        document.getElementById('lowongan')?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      const kw = chip.dataset.keyword || '';
      if (searchInput) {
        searchInput.value = kw;
        if (clearSearchBtn) clearSearchBtn.style.display = 'block';
      }
      activeFilters.search = kw;
      applyFiltersAndRender();
      document.getElementById('lowongan')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Tab Buttons
  document.querySelectorAll('.job-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.job-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilters.tab = btn.dataset.tab || 'all';
      applyFiltersAndRender();
    });
  });

  // Sidebar Platform Radios (Medsos & Resmi)
  document.querySelectorAll('input[name="filter_platform"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      activeFilters.platform = e.target.value;
      document.querySelectorAll('.chip-plat').forEach(c => {
        c.classList.toggle('active', c.dataset.platform === e.target.value);
      });
      applyFiltersAndRender();
    });
  });

  // Sidebar Radios
  document.querySelectorAll('input[name="filter_category"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      activeFilters.category = e.target.value;
      if (searchCategory) searchCategory.value = e.target.value;
      applyFiltersAndRender();
    });
  });

  document.querySelectorAll('input[name="filter_type"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      activeFilters.job_type = e.target.value;
      applyFiltersAndRender();
    });
  });

  document.querySelectorAll('input[name="filter_experience"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      activeFilters.experience = e.target.value;
      applyFiltersAndRender();
    });
  });

  const salaryCheckbox = document.getElementById('filter_has_salary');
  if (salaryCheckbox) {
    salaryCheckbox.addEventListener('change', (e) => {
      activeFilters.has_salary = e.target.checked;
      applyFiltersAndRender();
    });
  }

  const antiHoaxCheckbox = document.getElementById('filter_anti_hoax');
  if (antiHoaxCheckbox) {
    antiHoaxCheckbox.addEventListener('change', (e) => {
      activeFilters.anti_hoax = e.target.checked;
      applyFiltersAndRender();
    });
  }

  // Reset Button
  const resetBtn = document.getElementById('btn-reset-filter');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetAllFilters);
  }

  const clearChipsBtn = document.getElementById('btn-clear-all-chips');
  if (clearChipsBtn) {
    clearChipsBtn.addEventListener('click', resetAllFilters);
  }

  // Mobile Filter Drawer Toggle & Apply
  const mobileFilterToggleBtn = document.getElementById('btn-toggle-filter-mobile');
  const filterSidebar = document.getElementById('filter-sidebar');
  const mobileApplyBtn = document.getElementById('btn-apply-filter-mobile');

  if (mobileFilterToggleBtn && filterSidebar) {
    mobileFilterToggleBtn.addEventListener('click', () => {
      filterSidebar.classList.toggle('open-mobile');
      mobileFilterToggleBtn.classList.toggle('active');
    });
  }

  if (mobileApplyBtn && filterSidebar) {
    mobileApplyBtn.addEventListener('click', () => {
      filterSidebar.classList.remove('open-mobile');
      if (mobileFilterToggleBtn) mobileFilterToggleBtn.classList.remove('active');
      const lowonganSec = document.getElementById('lowongan');
      if (lowonganSec) lowonganSec.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Sort
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      activeFilters.sort = e.target.value;
      applyFiltersAndRender();
    });
  }

  // Grid / List View Toggle
  const btnGrid = document.getElementById('view-grid-btn');
  const btnList = document.getElementById('view-list-btn');
  const jobsGrid = document.getElementById('jobs-container');

  if (btnGrid && btnList && jobsGrid) {
    btnGrid.addEventListener('click', () => {
      btnGrid.classList.add('active');
      btnList.classList.remove('active');
      jobsGrid.classList.remove('list-view');
    });

    btnList.addEventListener('click', () => {
      btnList.classList.add('active');
      btnGrid.classList.remove('active');
      jobsGrid.classList.add('list-view');
    });
  }
}

// Setup Custom Interactive Dropdowns
function setupCustomDropdowns() {
  const dropdowns = document.querySelectorAll('.custom-dropdown');

  dropdowns.forEach(dropdown => {
    const trigger = dropdown.querySelector('.dropdown-trigger');
    const menu = dropdown.querySelector('.dropdown-menu');
    const selectedText = dropdown.querySelector('.dropdown-selected-text');
    const hiddenInput = dropdown.querySelector('input[type="hidden"]');

    if (trigger && !trigger._bound) {
      trigger._bound = true;
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdowns.forEach(d => {
          if (d !== dropdown) d.classList.remove('open');
        });
        dropdown.classList.toggle('open');
      });
    }

    if (menu && !menu._bound) {
      menu._bound = true;
      menu.addEventListener('click', (e) => {
        const item = e.target.closest('.dropdown-item');
        if (!item) return;
        e.stopPropagation();

        const val = item.dataset.value;
        const textSpan = item.querySelector('.dropdown-item-left span') || item.querySelector('span');
        const text = textSpan ? textSpan.textContent.trim() : val;

        menu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        if (selectedText) selectedText.textContent = text;
        if (hiddenInput) hiddenInput.value = val;

        dropdown.classList.remove('open');

        if (dropdown.id === 'dropdown-category') {
          activeFilters.category = val;
          syncSidebarInputs();
          applyFiltersAndRender();
        } else if (dropdown.id === 'dropdown-location') {
          activeFilters.location = val;
          applyFiltersAndRender();
        } else if (dropdown.id === 'dropdown-sort') {
          activeFilters.sort = val;
          applyFiltersAndRender();
        }
      });
    }
  });

  if (!window._dropdownGlobalBound) {
    window._dropdownGlobalBound = true;
    document.addEventListener('click', () => {
      document.querySelectorAll('.custom-dropdown').forEach(d => d.classList.remove('open'));
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.custom-dropdown').forEach(d => d.classList.remove('open'));
      }
      const lb = document.getElementById('poster-lightbox');
      if (lb && lb.classList.contains('active')) {
        if (e.key === 'ArrowLeft') window.prevLightboxSlide(e);
        else if (e.key === 'ArrowRight') window.nextLightboxSlide(e);
      }
    });
  }
}

const DEFAULT_PUBLIC_MASTER_DATA = {
  categories: [
    'Manufaktur & Pabrik',
    'Teknik & Otomotif',
    'Operator & Produksi',
    'Gudang & Logistik',
    'Quality Control (QC)',
    'Administrasi & Umum',
    'Keuangan & Akuntansi',
    'Teknologi & IT',
    'Pemasaran & Sales',
    'Kesehatan & Farmasi'
  ],
  locations: [
    'Jakarta', 'Bekasi', 'Cikarang', 'Karawang', 'Tangerang',
    'Bogor', 'Depok', 'Bandung', 'Surabaya', 'Semarang',
    'Cilegon', 'Purwakarta', 'Subang', 'Remote / WFH'
  ],
  job_types: [
    'Full-Time',
    'Part-Time',
    'Contract / Kontrak',
    'Internship / Magang',
    'Freelance',
    'Shift / Operator'
  ],
  experience_levels: [
    'Fresh Graduate / Pemula',
    'Pengalaman 1-2 Tahun',
    'Pengalaman 3-5 Tahun',
    'Pengalaman > 5 Tahun',
    'Tanpa Pengalaman'
  ]
};

function normalizeFilterToken(val) {
  return String(val || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function canonicalFilterKey(val) {
  return String(val || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function matchFilterOption(jobValue, selectedFilter) {
  if (!selectedFilter || selectedFilter === 'Semua') return true;
  if (!jobValue) return false;

  const jobNorm = normalizeFilterToken(jobValue);
  const filterNorm = normalizeFilterToken(selectedFilter);
  if (!jobNorm || !filterNorm) return false;
  if (jobNorm === filterNorm || jobNorm.includes(filterNorm) || filterNorm.includes(jobNorm)) {
    return true;
  }

  // Handle slash-separated bilingual variants like "Contract / Kontrak" or "Fresh Graduate / Pemula"
  const jobParts = String(jobValue).split(/[\/,|]+/).map(normalizeFilterToken).filter(p => p.length >= 2);
  const filterParts = String(selectedFilter).split(/[\/,|]+/).map(normalizeFilterToken).filter(p => p.length >= 2);
  for (const fp of filterParts) {
    for (const jp of jobParts) {
      if (jp === fp || jp.includes(fp) || fp.includes(jp)) return true;
    }
  }
  return false;
}

function getCategoryIcon(name) {
  const n = String(name || '').toLowerCase();
  if (n.includes('manufaktur') || n.includes('pabrik') || n.includes('operator') || n.includes('produksi')) return 'fa-industry';
  if (n.includes('teknik') || n.includes('otomotif') || n.includes('mesin')) return 'fa-wrench';
  if (n.includes('gudang') || n.includes('logistik') || n.includes('supply')) return 'fa-boxes-stacked';
  if (n.includes('quality') || n.includes('qc') || n.includes('qa')) return 'fa-clipboard-check';
  if (n.includes('admin') || n.includes('umum') || n.includes('hr')) return 'fa-folder-open';
  if (n.includes('keuangan') || n.includes('akuntansi') || n.includes('finance') || n.includes('bank')) return 'fa-calculator';
  if (n.includes('teknologi') || n.includes('it') || n.includes('software') || n.includes('web') || n.includes('data')) return 'fa-laptop-code';
  if (n.includes('pemasaran') || n.includes('sales') || n.includes('marketing')) return 'fa-bullhorn';
  if (n.includes('kesehatan') || n.includes('farmasi') || n.includes('medis')) return 'fa-kit-medical';
  if (n.includes('desain') || n.includes('kreatif') || n.includes('media')) return 'fa-pen-nib';
  return 'fa-tag';
}

function getLocationIcon(name) {
  const n = String(name || '').toLowerCase();
  return (n.includes('remote') || n.includes('wfh')) ? 'fa-house-laptop' : 'fa-location-dot';
}

function buildOptionItems(primaryList, fallbackList, extraJobValues, iconResolver) {
  const merged = [];
  const seenKeys = new Set();

  const pushItem = (raw) => {
    const rawName = (typeof raw === 'string' ? raw : (raw && raw.name)) || '';
    const name = String(rawName).trim();
    if (!name || name.toLowerCase() === 'semua') return;
    const key = canonicalFilterKey(name);
    if (!key || seenKeys.has(key)) return;
    seenKeys.add(key);
    const customIcon = (raw && typeof raw === 'object' && raw.icon) ? raw.icon : null;
    merged.push({
      name,
      icon: customIcon || iconResolver(name)
    });
  };

  const base = (Array.isArray(primaryList) && primaryList.length > 0) ? primaryList : fallbackList;
  base.forEach(pushItem);
  if (Array.isArray(extraJobValues)) {
    extraJobValues.forEach(pushItem);
  }
  return merged;
}

function normalizeMasterDataForUser(rawData) {
  const src = (rawData && typeof rawData === 'object') ? (rawData.allData || rawData) : {};
  const visibleJobs = (typeof rawAllJobs !== 'undefined' && Array.isArray(rawAllJobs))
    ? rawAllJobs.filter(isJobPubliclyVisible)
    : [];

  const jobCategories = visibleJobs.map(j => j.category).filter(Boolean);
  const jobLocations = visibleJobs.map(j => j.location).filter(Boolean);
  const jobTypes = visibleJobs.map(j => j.job_type).filter(Boolean);
  const jobExperiences = visibleJobs.map(j => j.experience_level).filter(Boolean);

  return {
    categories: buildOptionItems(src.categories || src.category, DEFAULT_PUBLIC_MASTER_DATA.categories, jobCategories, getCategoryIcon),
    locations: buildOptionItems(src.locations || src.location, DEFAULT_PUBLIC_MASTER_DATA.locations, jobLocations, getLocationIcon),
    job_types: buildOptionItems(src.job_types || src.job_type, DEFAULT_PUBLIC_MASTER_DATA.job_types, jobTypes, () => 'fa-clock'),
    experience_levels: buildOptionItems(src.experience_levels || src.experience, DEFAULT_PUBLIC_MASTER_DATA.experience_levels, jobExperiences, () => 'fa-graduation-cap')
  };
}

function formatCompactViews(views) {
  const num = Number(views || 0);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}jt`;
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}rb`;
  return String(num);
}

// Render Popular Categories Ranked Strictly by Total Views
function renderPopularCategoriesByViews() {
  const section = document.getElementById('kategori-section');
  if (!section) return;

  const visibleJobs = (typeof rawAllJobs !== 'undefined' && Array.isArray(rawAllJobs))
    ? rawAllJobs.filter(isJobPubliclyVisible)
    : [];

  const statsMap = new Map();
  visibleJobs.forEach(job => {
    const rawCat = String(job.category || '').trim();
    if (!rawCat) return;
    const key = canonicalFilterKey(rawCat) || rawCat.toLowerCase();
    const views = Number(job.views_count || 0);
    if (!statsMap.has(key)) {
      statsMap.set(key, { name: rawCat, views: 0, count: 0 });
    }
    const entry = statsMap.get(key);
    entry.views += views;
    entry.count += 1;
  });

  let ranked = Array.from(statsMap.values()).sort((a, b) => {
    if (b.views !== a.views) return b.views - a.views;
    if (b.count !== a.count) return b.count - a.count;
    return a.name.localeCompare(b.name);
  });

  if (ranked.length === 0) {
    const masterCats = (window._normalizedMasterData && window._normalizedMasterData.categories) || [];
    ranked = (masterCats.length > 0 ? masterCats : DEFAULT_PUBLIC_MASTER_DATA.categories.map(name => ({ name })))
      .slice(0, 6)
      .map(c => ({ name: c.name, views: 0, count: 0 }));
  } else {
    ranked = ranked.slice(0, 8);
  }

  const isAllActive = !activeFilters.category || activeFilters.category === 'Semua';
  let html = `
    <span class="trending-label"><i class="fa-solid fa-fire" style="color: #f97316;"></i> Kategori Terpopuler:</span>
    <button type="button" class="chip-keyword ${isAllActive ? 'active' : ''}" id="btn-search-all-cat" data-category="Semua" title="Tampilkan Semua Kategori">
      <i class="fa-solid fa-layer-group" style="color: ${isAllActive ? '#ffffff' : '#6366f1'};"></i> Semua Kategori
    </button>
  `;

  ranked.forEach(item => {
    const isActive = !isAllActive && (
      canonicalFilterKey(activeFilters.category) === canonicalFilterKey(item.name) ||
      matchFilterOption(item.name, activeFilters.category)
    );
    const iconCls = getCategoryIcon(item.name);
    html += `
      <button type="button" class="chip-keyword ${isActive ? 'active' : ''}" data-category="${escapeHtml(item.name)}" title="Filter kategori ${escapeHtml(item.name)} (${item.views.toLocaleString('id-ID')}x dilihat)">
        <i class="fa-solid ${iconCls}"></i>
        <span>${escapeHtml(item.name)}</span>
        <span class="chip-views-badge" title="${item.views.toLocaleString('id-ID')}x dilihat &bull; ${item.count} lowongan"><i class="fa-regular fa-eye"></i> ${formatCompactViews(item.views)}</span>
      </button>
    `;
  });

  section.innerHTML = html;
}

// Render Master Data to Filter DOM Elements
function renderMasterDataToDOM(rawData) {
  if (rawData && typeof rawData === 'object') {
    window._lastMasterDataRaw = rawData;
  }
  const data = normalizeMasterDataForUser(rawData || window._lastMasterDataRaw);
  window._normalizedMasterData = data;

  // 1. Category Dropdown Menu (#dropdown-category-menu)
  const catMenu = document.getElementById('dropdown-category-menu');
  if (catMenu && Array.isArray(data.categories)) {
    let catHtml = `
      <div class="dropdown-item ${activeFilters.category === 'Semua' ? 'active' : ''}" data-value="Semua">
        <div class="dropdown-item-left"><i class="fa-solid fa-layer-group"></i><span>Semua Kategori</span></div>
        <i class="fa-solid fa-check dropdown-check"></i>
      </div>
    `;
    data.categories.forEach(c => {
      const isChecked = activeFilters.category !== 'Semua' && matchFilterOption(c.name, activeFilters.category);
      catHtml += `
        <div class="dropdown-item ${isChecked ? 'active' : ''}" data-value="${escapeHtml(c.name)}">
          <div class="dropdown-item-left"><i class="fa-solid ${c.icon || 'fa-tag'}"></i><span>${escapeHtml(c.name)}</span></div>
          <i class="fa-solid fa-check dropdown-check"></i>
        </div>
      `;
    });
    catMenu.innerHTML = catHtml;
  }

  // 2. Location Dropdown Menu (#dropdown-location-menu)
  const locMenu = document.getElementById('dropdown-location-menu');
  if (locMenu && Array.isArray(data.locations)) {
    let locHtml = `
      <div class="dropdown-item ${activeFilters.location === 'Semua' ? 'active' : ''}" data-value="Semua">
        <div class="dropdown-item-left"><i class="fa-solid fa-globe"></i><span>Semua Lokasi</span></div>
        <i class="fa-solid fa-check dropdown-check"></i>
      </div>
    `;
    data.locations.forEach(l => {
      const isChecked = activeFilters.location !== 'Semua' && matchFilterOption(l.name, activeFilters.location);
      locHtml += `
        <div class="dropdown-item ${isChecked ? 'active' : ''}" data-value="${escapeHtml(l.name)}">
          <div class="dropdown-item-left"><i class="fa-solid ${l.icon || 'fa-location-dot'}"></i><span>${escapeHtml(l.name)}</span></div>
          <i class="fa-solid fa-check dropdown-check"></i>
        </div>
      `;
    });
    locMenu.innerHTML = locHtml;
  }

  // 3. Sidebar Categories Filter (#sidebar-filter-categories)
  const sideCat = document.getElementById('sidebar-filter-categories');
  if (sideCat && Array.isArray(data.categories)) {
    let sideCatHtml = `
      <label class="filter-checkbox">
        <input type="radio" name="filter_category" value="Semua" ${activeFilters.category === 'Semua' ? 'checked' : ''}>
        <span>Semua Kategori</span>
      </label>
    `;
    data.categories.forEach(c => {
      const isChecked = activeFilters.category !== 'Semua' && matchFilterOption(c.name, activeFilters.category);
      sideCatHtml += `
        <label class="filter-checkbox">
          <input type="radio" name="filter_category" value="${escapeHtml(c.name)}" ${isChecked ? 'checked' : ''}>
          <span>${escapeHtml(c.name)}</span>
        </label>
      `;
    });
    sideCat.innerHTML = sideCatHtml;
  }

  // 4. Sidebar Job Types Filter (#sidebar-filter-job-types)
  const sideTypes = document.getElementById('sidebar-filter-job-types');
  if (sideTypes && Array.isArray(data.job_types)) {
    let sideTypesHtml = `
      <label class="filter-checkbox">
        <input type="radio" name="filter_type" value="Semua" ${activeFilters.job_type === 'Semua' ? 'checked' : ''}>
        <span>Semua Tipe</span>
      </label>
    `;
    data.job_types.forEach(t => {
      const isChecked = activeFilters.job_type !== 'Semua' && matchFilterOption(t.name, activeFilters.job_type);
      sideTypesHtml += `
        <label class="filter-checkbox">
          <input type="radio" name="filter_type" value="${escapeHtml(t.name)}" ${isChecked ? 'checked' : ''}>
          <span>${escapeHtml(t.name)}</span>
        </label>
      `;
    });
    sideTypes.innerHTML = sideTypesHtml;
  }

  // 5. Sidebar Experience Levels Filter (#sidebar-filter-experience-levels)
  const sideExp = document.getElementById('sidebar-filter-experience-levels');
  if (sideExp && Array.isArray(data.experience_levels)) {
    let sideExpHtml = `
      <label class="filter-checkbox">
        <input type="radio" name="filter_experience" value="Semua" ${activeFilters.experience === 'Semua' ? 'checked' : ''}>
        <span>Semua Level</span>
      </label>
    `;
    data.experience_levels.forEach(e => {
      const isChecked = activeFilters.experience !== 'Semua' && matchFilterOption(e.name, activeFilters.experience);
      sideExpHtml += `
        <label class="filter-checkbox">
          <input type="radio" name="filter_experience" value="${escapeHtml(e.name)}" ${isChecked ? 'checked' : ''}>
          <span>${escapeHtml(e.name)}</span>
        </label>
      `;
    });
    sideExp.innerHTML = sideExpHtml;
  }

  setupCustomDropdowns();
  setupDynamicFilterListeners();
  syncSidebarInputs();
}

function refreshMasterDataFromJobs() {
  renderMasterDataToDOM(window._lastMasterDataRaw || null);
}

// Dynamically Load Master Data into Filters
async function loadMasterDataFilters() {
  let renderedFromCache = false;
  // Check client-side cache for instant display
  try {
    const cached = safeSessionGet('kerja_master_data_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed === 'object') {
        renderMasterDataToDOM(parsed);
        renderedFromCache = true;
      }
    }
  } catch (e) { }

  // Ensure sidebar & hero dropdowns are never empty at t=0ms
  if (!renderedFromCache) {
    renderMasterDataToDOM(null);
  }

  let data = null;

  try {
    const { ok, data: json } = await safeFetchJson(getApiEndpoint('/api/master-data'));
    if (ok && json && json.success && json.data) {
      data = json.data.allData || json.data;
    }
  } catch (err) { }

  // Resilient fallback to direct Supabase if API is unavailable
  if (!data && sbClient) {
    try {
      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ timeout: true }), 5000));
      const fetchPromise = sbClient.from('jobs').select('description').eq('status', 'system_master_data').limit(1);
      const { data: rows } = await Promise.race([fetchPromise, timeoutPromise]);
      if (rows && rows.length > 0 && rows[0].description) {
        const parsed = JSON.parse(rows[0].description);
        if (parsed && (Array.isArray(parsed.categories) || Array.isArray(parsed.category))) {
          data = parsed;
        }
      }
    } catch (e) { }
  }

  if (data) {
    try {
      safeSessionSet('kerja_master_data_cache', JSON.stringify(data));
    } catch (e) { }
    renderMasterDataToDOM(data);
    renderPopularCategoriesByViews();
  }
}

function setupDynamicFilterListeners() {
  document.querySelectorAll('input[name="filter_category"]').forEach(r => {
    r.onchange = (e) => {
      activeFilters.category = e.target.value;
      const sc = document.getElementById('search-category');
      if (sc) sc.value = e.target.value;
      syncSidebarInputs();
      applyFiltersAndRender();
    };
  });

  document.querySelectorAll('input[name="filter_type"]').forEach(r => {
    r.onchange = (e) => {
      activeFilters.job_type = e.target.value;
      applyFiltersAndRender();
    };
  });

  document.querySelectorAll('input[name="filter_experience"]').forEach(r => {
    r.onchange = (e) => {
      activeFilters.experience = e.target.value;
      applyFiltersAndRender();
    };
  });
}

function syncSidebarInputs() {
  document.querySelectorAll('input[name="filter_category"]').forEach(r => {
    r.checked = activeFilters.category === 'Semua'
      ? r.value === 'Semua'
      : (r.value !== 'Semua' && matchFilterOption(r.value, activeFilters.category));
  });

  document.querySelectorAll('input[name="filter_type"]').forEach(r => {
    r.checked = activeFilters.job_type === 'Semua'
      ? r.value === 'Semua'
      : (r.value !== 'Semua' && matchFilterOption(r.value, activeFilters.job_type));
  });

  document.querySelectorAll('input[name="filter_experience"]').forEach(r => {
    r.checked = activeFilters.experience === 'Semua'
      ? r.value === 'Semua'
      : (r.value !== 'Semua' && matchFilterOption(r.value, activeFilters.experience));
  });

  // Sync custom category dropdown
  const catDropdown = document.getElementById('dropdown-category');
  if (catDropdown) {
    const items = catDropdown.querySelectorAll('.dropdown-item');
    items.forEach(i => {
      const isMatch = activeFilters.category === 'Semua'
        ? i.dataset.value === 'Semua'
        : (i.dataset.value !== 'Semua' && matchFilterOption(i.dataset.value, activeFilters.category));
      if (isMatch) {
        i.classList.add('active');
        const textSpan = i.querySelector('.dropdown-item-left span') || i.querySelector('span');
        const selectedText = catDropdown.querySelector('.dropdown-selected-text');
        if (selectedText && textSpan) selectedText.textContent = textSpan.textContent.trim();
      } else {
        i.classList.remove('active');
      }
    });
  }
}

function resetAllFilters() {
  activeFilters = {
    search: '',
    category: 'Semua',
    job_type: 'Semua',
    location: 'Semua',
    experience: 'Semua',
    has_salary: false,
    anti_hoax: false,
    platform: 'Semua',
    tab: 'all',
    sort: 'newest'
  };

  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';
  const clearSearchBtn = document.getElementById('btn-clear-search');
  if (clearSearchBtn) clearSearchBtn.style.display = 'none';

  // Reset custom category dropdown
  const catDropdown = document.getElementById('dropdown-category');
  if (catDropdown) {
    catDropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
    catDropdown.querySelector('.dropdown-item[data-value="Semua"]')?.classList.add('active');
    const catText = catDropdown.querySelector('.dropdown-selected-text');
    if (catText) catText.textContent = 'Semua Kategori';
    const catInput = document.getElementById('search-category');
    if (catInput) catInput.value = 'Semua';
  }

  // Reset custom location dropdown
  const locDropdown = document.getElementById('dropdown-location');
  if (locDropdown) {
    locDropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
    locDropdown.querySelector('.dropdown-item[data-value="Semua"]')?.classList.add('active');
    const locText = locDropdown.querySelector('.dropdown-selected-text');
    if (locText) locText.textContent = 'Semua Lokasi';
    const locInput = document.getElementById('search-location');
    if (locInput) locInput.value = 'Semua';
  }

  // Reset custom sort dropdown
  const sortDropdown = document.getElementById('dropdown-sort');
  if (sortDropdown) {
    sortDropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
    sortDropdown.querySelector('.dropdown-item[data-value="newest"]')?.classList.add('active');
    const sortText = sortDropdown.querySelector('.dropdown-selected-text');
    if (sortText) sortText.textContent = 'Terbaru Ditambahkan';
    const sortInput = document.getElementById('sort-select');
    if (sortInput) sortInput.value = 'newest';
  }

  const allCatRadio = document.querySelector('input[name="filter_category"][value="Semua"]');
  if (allCatRadio) allCatRadio.checked = true;

  const allTypeRadio = document.querySelector('input[name="filter_type"][value="Semua"]');
  if (allTypeRadio) allTypeRadio.checked = true;

  const allExpRadio = document.querySelector('input[name="filter_experience"][value="Semua"]');
  if (allExpRadio) allExpRadio.checked = true;

  const allPlatRadio = document.querySelector('input[name="filter_platform"][value="Semua"]');
  if (allPlatRadio) allPlatRadio.checked = true;

  const salaryCheckbox = document.getElementById('filter_has_salary');
  if (salaryCheckbox) salaryCheckbox.checked = false;

  const antiHoaxCheckbox = document.getElementById('filter_anti_hoax');
  if (antiHoaxCheckbox) antiHoaxCheckbox.checked = false;

  document.querySelectorAll('.job-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.job-tab-btn[data-tab="all"]')?.classList.add('active');

  renderPopularCategoriesByViews();
  applyFiltersAndRender();
}

function setupModalDismiss(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal || modal._dismissBound) return;
  modal._dismissBound = true;
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.closest('.modal-close-btn') || e.target.classList.contains('lightbox-close-btn')) {
      modal.classList.remove('active');
      if (modalId === 'job-detail-modal') {
        stopJobFlyerCarousel();
      }
    }
  });
}

// Helper to determine if a job is visible to public visitors
function isJobPubliclyVisible(j) {
  if (!j) return false;
  if (!j.status || j.status.startsWith('system_') || j.status === 'deleted' || j.status === 'archived') {
    return false;
  }
  if (j.status === 'scheduled') {
    if (!j.scheduled_at) return false;
    const schedTime = new Date(j.scheduled_at).getTime();
    if (isNaN(schedTime) || schedTime > Date.now()) return false;
  }
  return true;
}

// Load Jobs: Ultra-Fast Multi-Layer Fetching with 0ms Instant Cache & Concurrent Race
async function loadJobs(options = {}) {
  const { silent = false, bypassCache = false } = options || {};
  if (isLoadingPublicJobs && !bypassCache) return;
  isLoadingPublicJobs = true;

  try {
    const container = document.getElementById('jobs-container');

    // 1. Instant 0ms perceived load time: check localStorage first, then sessionStorage
    let hadCached = false;
    if (!bypassCache) {
      try {
        const cached = safeLocalGet('kerja_public_jobs_cache') || safeSessionGet('kerja_public_jobs_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            rawAllJobs = parsed.map(window.cleanJobData).filter(isJobPubliclyVisible);
            _lastJobsSignature = getJobsSignature(rawAllJobs);
            updateTabCounters();
            if (typeof refreshMasterDataFromJobs === 'function') refreshMasterDataFromJobs();
            applyFiltersAndRender();
            hadCached = true;
          }
        }
      } catch (e) { }
    }

    if (!hadCached && !silent && (!rawAllJobs || rawAllJobs.length === 0) && container) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px;">
          <i class="fa-solid fa-spinner fa-spin" style="font-size: 2.2rem; color: var(--primary);"></i>
          <p style="margin-top: 14px; color: var(--text-muted); font-weight: 500;">Memuat info lowongan & poster resmi...</p>
        </div>
      `;
    }

    const LIGHT_JOB_COLS = 'id,title,company_name,category,job_type,location,salary_display,experience_level,description,requirements,responsibilities,benefits,contact_type,contact_value,deadline,status,is_featured,views_count,created_at,updated_at,whatsapp,email,website_url,source_platform,source_label,scheduled_at,apply_info';

    const fetchLocalApi = async () => {
      try {
        if (!bypassCache && window.__initialJobsPrefetch) {
          const pre = await window.__initialJobsPrefetch;
          window.__initialJobsPrefetch = null;
          if (pre && pre.success && Array.isArray(pre.data)) {
            return pre.data.map(window.cleanJobData).filter(isJobPubliclyVisible);
          }
        }
        const endpoint = bypassCache ? `/api/jobs?_t=${Date.now()}` : '/api/jobs';
        const { ok, data: json } = await safeFetchJson(getApiEndpoint(endpoint));
        if (ok && json && json.success && Array.isArray(json.data)) {
          return json.data.map(window.cleanJobData).filter(isJobPubliclyVisible);
        }
      } catch (e) { }
      return null;
    };

    const fetchSupabase = async () => {
      if (!sbClient) {
        sbClient = getOrCreateSupabaseClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY, clientOptions);
        if (sbClient) {
          currentSupabaseUrl = DEFAULT_SUPABASE_URL;
          currentSupabaseKey = DEFAULT_SUPABASE_KEY;
        }
      }
      if (!sbClient) return null;
      try {
        const fetchQuery = () => sbClient
          .from('jobs')
          .select(LIGHT_JOB_COLS)
          .neq('status', 'system_master_data')
          .neq('status', 'system_settings')
          .neq('status', 'system_flyer_themes')
          .neq('status', 'system_company_images')
          .neq('status', 'system_uploaded_file')
          .order('id', { ascending: false });

        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ timeout: true }), 4000));
        let res = await Promise.race([fetchQuery(), timeoutPromise]);

        if (res && res.error && (res.error.code === 'PGRST301' || res.status === 401 || String(res.error.message || '').includes('API key'))) {
          const altKey = (currentSupabaseKey === DEFAULT_SUPABASE_KEY) ? ALTERNATE_SUPABASE_KEY : DEFAULT_SUPABASE_KEY;
          const altClient = getOrCreateSupabaseClient(DEFAULT_SUPABASE_URL, altKey, clientOptions);
          if (altClient) {
            sbClient = altClient;
            currentSupabaseKey = altKey;
            const altTimeout = new Promise(resolve => setTimeout(() => resolve({ timeout: true }), 4000));
            res = await Promise.race([fetchQuery(), altTimeout]);
          }
        }

        if (res && !res.timeout && !res.error && Array.isArray(res.data)) {
          return res.data.map((row) => {
            row.poster_image = row.poster_image || `/api/jobs/${row.id}/image/poster`;
            return window.cleanJobData(row);
          }).filter(isJobPubliclyVisible);
        }
      } catch (e) { }
      return null;
    };

    // Prioritize lightweight Edge-Cached /api/jobs (avoids 16+ MB Supabase 500 timeout), fallback to lightweight Supabase only if needed
    let freshJobs = await fetchLocalApi();
    if (freshJobs === null) {
      freshJobs = await fetchSupabase();
    }

    if (Array.isArray(freshJobs)) {
      const nextSig = getJobsSignature(freshJobs);
      const changed = nextSig !== _lastJobsSignature;
      rawAllJobs = freshJobs;
      _lastJobsSignature = nextSig;
      try {
        safeLocalSet('kerja_public_jobs_cache', JSON.stringify(rawAllJobs));
        safeSessionSet('kerja_public_jobs_cache', JSON.stringify(rawAllJobs));
      } catch (e) { }
      if (!hadCached || (changed && (!silent || !isAnyUserModalOpen()))) {
        updateTabCounters();
        if (typeof refreshMasterDataFromJobs === 'function') refreshMasterDataFromJobs();
        applyFiltersAndRender();
      }
    } else if (!hadCached) {
      rawAllJobs = [];
      _lastJobsSignature = '';
      updateTabCounters();
      if (typeof refreshMasterDataFromJobs === 'function') refreshMasterDataFromJobs();
      applyFiltersAndRender();
    }

    // Deep linking check ?job=:id
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const targetJobId = urlParams.get('job');
      if (targetJobId) {
        setTimeout(() => {
          openJobDetail(targetJobId);
        }, 300);
      }
    } catch (e) { }
  } finally {
    isLoadingPublicJobs = false;
  }
}

// Calculate Tab Counters
function updateTabCounters() {
  const allActive = rawAllJobs.filter(isJobPubliclyVisible);
  const featured = allActive.filter(j => j.is_featured === 1 || j.is_featured === true || j.is_featured === '1');
  const remote = allActive.filter(j => (j.job_type && j.job_type.toLowerCase().includes('remote')) || (j.location && j.location.toLowerCase().includes('remote')));
  const freshgrad = allActive.filter(j => (j.experience_level && j.experience_level.toLowerCase().includes('fresh')) || (j.description && j.description.toLowerCase().includes('fresh graduate')));

  document.getElementById('tab-count-all') && (document.getElementById('tab-count-all').textContent = allActive.length);
  document.getElementById('tab-count-featured') && (document.getElementById('tab-count-featured').textContent = featured.length);
  document.getElementById('tab-count-remote') && (document.getElementById('tab-count-remote').textContent = remote.length);
  document.getElementById('tab-count-freshgrad') && (document.getElementById('tab-count-freshgrad').textContent = freshgrad.length);
}

// Apply Filters and Render
function applyFiltersAndRender() {
  // Keep active and expired/closed jobs visible in the feed (only exclude unreleased scheduled / deleted / archived)
  let list = rawAllJobs.filter(isJobPubliclyVisible);

  // Filter Tab
  if (activeFilters.tab === 'featured') {
    list = list.filter(j => j.is_featured === 1 || j.is_featured === true || j.is_featured === '1');
  } else if (activeFilters.tab === 'remote') {
    list = list.filter(j => (j.job_type && j.job_type.toLowerCase().includes('remote')) || (j.location && j.location.toLowerCase().includes('remote')));
  } else if (activeFilters.tab === 'freshgrad') {
    list = list.filter(j => (j.experience_level && j.experience_level.toLowerCase().includes('fresh')) || (j.description && j.description.toLowerCase().includes('fresh graduate')));
  }

  // Filter Kategori
  if (activeFilters.category && activeFilters.category !== 'Semua') {
    list = list.filter(j => matchFilterOption(j.category, activeFilters.category));
  }

  // Filter Tipe Pekerjaan
  if (activeFilters.job_type && activeFilters.job_type !== 'Semua') {
    list = list.filter(j => matchFilterOption(j.job_type, activeFilters.job_type));
  }

  // Filter Lokasi
  if (activeFilters.location && activeFilters.location !== 'Semua') {
    const loc = activeFilters.location.toLowerCase();
    list = list.filter(j => j.location && j.location.toLowerCase().includes(loc));
  }

  // Filter Pengalaman
  if (activeFilters.experience && activeFilters.experience !== 'Semua') {
    list = list.filter(j => matchFilterOption(j.experience_level, activeFilters.experience));
  }

  // Filter Gaji
  if (activeFilters.has_salary) {
    list = list.filter(j => j.salary_display && j.salary_display.toLowerCase().includes('rp'));
  }

  // Filter Anti-Hoax Terverifikasi
  if (activeFilters.anti_hoax) {
    list = list.filter(j => {
      const cv = String(j.contact_value || '').toLowerCase();
      const comp = String(j.company_name || '').toLowerCase();
      return cv.includes('is_verified_anti_hoax') || j.is_official || comp.includes('pt') || comp.includes('tbk') || comp.includes('persero') || comp.includes('bank') || comp.includes('astra') || comp.includes('telkom');
    });
  }

  // Filter Platform Sumber (LinkedIn, Instagram, Facebook, Resmi)
  if (activeFilters.platform && activeFilters.platform !== 'Semua') {
    const p = activeFilters.platform.toLowerCase();
    list = list.filter(j => {
      const sp = (j.source_platform || '').toLowerCase();
      const comp = (j.company_name || '').toLowerCase();
      const web = (j.website_url || j.contact_value || '').toLowerCase();
      if (p === 'linkedin') return sp === 'linkedin' || comp.includes('linkedin') || web.includes('linkedin');
      if (p === 'instagram') return sp === 'instagram' || comp.includes('instagram') || web.includes('instagram');
      if (p === 'facebook') return sp === 'facebook' || comp.includes('facebook') || web.includes('facebook');
      if (p === 'official') return sp === 'official' || (!sp.includes('linkedin') && !sp.includes('instagram') && !sp.includes('facebook') && !web.includes('linkedin') && !web.includes('instagram') && !web.includes('facebook'));
      return true;
    });
  }

  // Filter Search (Comprehensive Multi-Field & Smart Out-of-Category Matching)
  window.isSearchingOutOfCategory = false;
  if (activeFilters.search) {
    const s = activeFilters.search.toLowerCase();
    const matchFunction = (j) => {
      const parseList = (val) => Array.isArray(val) ? val.join(' ') : (typeof val === 'string' && val.startsWith('[') ? JSON.parse(val || '[]').join(' ') : String(val || ''));
      const reqsText = parseList(j.requirements);
      const respsText = parseList(j.responsibilities);
      const benefitsText = parseList(j.benefits);

      const titleMatch = j.title && j.title.toLowerCase().includes(s);
      const companyMatch = j.company_name && j.company_name.toLowerCase().includes(s);
      const descMatch = j.description && j.description.toLowerCase().includes(s);
      const catMatch = j.category && j.category.toLowerCase().includes(s);
      const locMatch = j.location && j.location.toLowerCase().includes(s);
      const reqMatch = reqsText.toLowerCase().includes(s);
      const respMatch = respsText.toLowerCase().includes(s);
      const benMatch = benefitsText.toLowerCase().includes(s);
      const salMatch = j.salary_display && j.salary_display.toLowerCase().includes(s);
      const expMatch = j.experience_level && j.experience_level.toLowerCase().includes(s);

      return titleMatch || companyMatch || descMatch || catMatch || locMatch || reqMatch || respMatch || benMatch || salMatch || expMatch;
    };

    const inCategoryList = list.filter(matchFunction);

    // If zero matches inside currently selected category, but matches exist when searching across all categories:
    if (inCategoryList.length === 0 && activeFilters.category && activeFilters.category !== 'Semua') {
      const allCategoryMatches = rawAllJobs
        .filter(isJobPubliclyVisible)
        .filter(matchFunction);

      if (allCategoryMatches.length > 0) {
        list = allCategoryMatches;
        window.isSearchingOutOfCategory = true;
      } else {
        list = [];
      }
    } else {
      list = inCategoryList;
    }
  }

  // Sorting: lowongan yang sudah melewati batas waktu (terkunci/expired) SELALU ditaruh di urutan paling bawah
  list.sort((a, b) => {
    const lockDiff = (isJobLocked(a) ? 1 : 0) - (isJobLocked(b) ? 1 : 0);
    if (lockDiff !== 0) return lockDiff;

    if (window.activeCvKeywords && window.activeCvKeywords.length > 0) {
      const scoreDiff = (b._matchScore || 0) - (a._matchScore || 0);
      if (scoreDiff !== 0) return scoreDiff;
    } else if (activeFilters.sort === 'views') {
      const viewsDiff = (b.views_count || 0) - (a.views_count || 0);
      if (viewsDiff !== 0) return viewsDiff;
    } else if (activeFilters.sort === 'featured') {
      const featDiff = (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
      if (featDiff !== 0) return featDiff;
    }

    const idDiff = (Number(b.id) || 0) - (Number(a.id) || 0);
    if (idDiff !== 0) return idDiff;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  filteredJobs = list;
  renderActiveFilterChips();
  if (typeof renderPopularCategoriesByViews === 'function') renderPopularCategoriesByViews();
  renderJobs(filteredJobs);
  updateCountDisplay(filteredJobs.length);
  updateTabCounters();
}

function updateCountDisplay(count) {
  const countEl = document.getElementById('results-count-num');
  if (countEl) countEl.textContent = count;
}

// Active Filter Chips Bar
function renderActiveFilterChips() {
  const bar = document.getElementById('active-filters-bar');
  const chipsContainer = document.getElementById('active-filter-chips');
  if (!bar || !chipsContainer) return;

  const chips = [];

  if (activeFilters.tab !== 'all') {
    const tabLabels = {
      featured: 'Rekomendasi Unggulan',
      remote: 'Remote (WFH)',
      freshgrad: 'Fresh Graduate'
    };
    chips.push({
      label: `Tab: ${tabLabels[activeFilters.tab] || activeFilters.tab}`,
      action: () => {
        activeFilters.tab = 'all';
        document.querySelectorAll('.job-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.job-tab-btn[data-tab="all"]')?.classList.add('active');
      }
    });
  }

  if (activeFilters.search) {
    chips.push({
      label: `Kata Kunci: "${activeFilters.search}"`,
      action: () => {
        activeFilters.search = '';
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = '';
        const clearSearchBtn = document.getElementById('btn-clear-search');
        if (clearSearchBtn) clearSearchBtn.style.display = 'none';
        document.querySelectorAll('.chip-keyword').forEach(c => c.classList.remove('active'));
      }
    });
  }

  if (activeFilters.category !== 'Semua') {
    chips.push({
      label: `Kategori: ${activeFilters.category}`,
      action: () => {
        activeFilters.category = 'Semua';
        const sc = document.getElementById('search-category');
        if (sc) sc.value = 'Semua';
        const allCatRadio = document.querySelector('input[name="filter_category"][value="Semua"]');
        if (allCatRadio) allCatRadio.checked = true;
        const catDropdown = document.getElementById('dropdown-category');
        if (catDropdown) {
          catDropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
          catDropdown.querySelector('.dropdown-item[data-value="Semua"]')?.classList.add('active');
          const catText = catDropdown.querySelector('.dropdown-selected-text');
          if (catText) catText.textContent = 'Semua Kategori';
        }
      }
    });
  }

  if (activeFilters.job_type !== 'Semua') {
    chips.push({
      label: `Tipe: ${activeFilters.job_type}`,
      action: () => {
        activeFilters.job_type = 'Semua';
        const allTypeRadio = document.querySelector('input[name="filter_type"][value="Semua"]');
        if (allTypeRadio) allTypeRadio.checked = true;
      }
    });
  }

  if (activeFilters.location !== 'Semua') {
    chips.push({
      label: `Lokasi: ${activeFilters.location}`,
      action: () => {
        activeFilters.location = 'Semua';
        const sl = document.getElementById('search-location');
        if (sl) sl.value = 'Semua';
        const locDropdown = document.getElementById('dropdown-location');
        if (locDropdown) {
          locDropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
          locDropdown.querySelector('.dropdown-item[data-value="Semua"]')?.classList.add('active');
          const locText = locDropdown.querySelector('.dropdown-selected-text');
          if (locText) locText.textContent = 'Semua Lokasi';
        }
      }
    });
  }

  if (activeFilters.experience !== 'Semua') {
    chips.push({
      label: `Level: ${activeFilters.experience}`,
      action: () => {
        activeFilters.experience = 'Semua';
        const allExpRadio = document.querySelector('input[name="filter_experience"][value="Semua"]');
        if (allExpRadio) allExpRadio.checked = true;
      }
    });
  }

  if (activeFilters.has_salary) {
    chips.push({
      label: `Dengan Info Gaji`,
      action: () => {
        activeFilters.has_salary = false;
        const cb = document.getElementById('filter_has_salary');
        if (cb) cb.checked = false;
      }
    });
  }

  if (activeFilters.platform && activeFilters.platform !== 'Semua') {
    const platLabels = {
      linkedin: 'LinkedIn Recruiter',
      instagram: 'Instagram Karir',
      facebook: 'Facebook Jobs',
      official: 'Resmi BUMN & Korporasi'
    };
    chips.push({
      label: `Sumber: ${platLabels[activeFilters.platform] || activeFilters.platform}`,
      action: () => {
        activeFilters.platform = 'Semua';
        const radio = document.querySelector('input[name="filter_platform"][value="Semua"]');
        if (radio) radio.checked = true;
        document.querySelectorAll('.chip-plat').forEach(c => c.classList.remove('active'));
      }
    });
  }

  const mftBadge = document.getElementById('mft-active-badge');

  if (chips.length > 0) {
    bar.style.display = 'flex';
    chipsContainer.innerHTML = chips.map((c, idx) => `
      <div class="filter-chip-item">
        <span>${escapeHtml(c.label)}</span>
        <button type="button" onclick="removeFilterChip(${idx})" title="Hapus filter"><i class="fa-solid fa-xmark"></i></button>
      </div>
    `).join('');
    window._chipActions = chips.map(c => c.action);
    if (mftBadge) {
      mftBadge.textContent = `${chips.length} Aktif`;
      mftBadge.style.color = 'var(--primary)';
    }
  } else {
    bar.style.display = 'none';
    chipsContainer.innerHTML = '';
    window._chipActions = [];
    if (mftBadge) {
      mftBadge.textContent = 'Semua';
      mftBadge.style.color = 'var(--text-muted)';
    }
  }
}

window.removeFilterChip = function (idx) {
  if (window._chipActions && window._chipActions[idx]) {
    window._chipActions[idx]();
    applyFiltersAndRender();
  }
};

// -------------------------------------------------------------
// DYNAMIC CORPORATE COMPANY BANNER GENERATOR
// Automatically generates sleek corporate banners featuring the Company Name
// Only uploaded manual flyers take precedence from actual files!
// -------------------------------------------------------------
function hashStr(str) {
  let hash = 0;
  if (!str) return 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const corporateBannerPalettes = [
  { bg1: '#0f172a', bg2: '#1e1b4b', bg3: '#312e81', accent: '#6366f1', textAccent: '#a5b4fc', border: 'rgba(99,102,241,0.3)' },
  { bg1: '#022c22', bg2: '#064e3b', bg3: '#065f46', accent: '#10b981', textAccent: '#6ee7b7', border: 'rgba(16,185,129,0.3)' },
  { bg1: '#082f49', bg2: '#0c4a6e', bg3: '#075985', accent: '#0284c7', textAccent: '#7dd3fc', border: 'rgba(2,132,199,0.3)' },
  { bg1: '#1e1035', bg2: '#2e1065', bg3: '#581c87', accent: '#a855f7', textAccent: '#d8b4fe', border: 'rgba(168,85,247,0.3)' },
  { bg1: '#1c1917', bg2: '#292524', bg3: '#44403c', accent: '#f59e0b', textAccent: '#fde68a', border: 'rgba(245,158,11,0.3)' },
  { bg1: '#090d16', bg2: '#1e293b', bg3: '#334155', accent: '#38bdf8', textAccent: '#bae6fd', border: 'rgba(56,189,248,0.3)' }
];

function escapeSvgText(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getEffectiveCompanyName(job) {
  if (!job) return 'Perusahaan Terverifikasi';
  const comp = (job.company_name || '').trim();
  const title = (job.title || '').trim();
  const isGeneric = /^(bukajobs|linkedin|instagram|facebook|portal|web|loker|official|resmi)/i.test(comp);
  const ptMatch = title.match(/(?:(?:Lowongan|Rekrutmen|Karir|Loker)\s+(?:di\s+|pada\s+)?)?((?:PT|CV|Bank|Yayasan|RSUD|RS)\s+[^–\-|:]+)/i);
  if (ptMatch && ptMatch[1] && (isGeneric || comp.length < 5)) {
    return ptMatch[1].trim();
  }
  if (/^(PT|CV|Bank|Yayasan)\s+/i.test(title) && isGeneric) {
    return title;
  }
  return comp || title || 'Perusahaan Terverifikasi';
}

function isManualJobFlyer(job) {
  if (!job || !job.poster_image) return false;
  const p = String(job.poster_image).trim();
  if (!p) return false;
  if (p.includes('unsplash.com')) return false;
  if (p.includes('placeholder')) return false;
  if (p.includes('sample_')) return false;
  if (p.includes('corporate_worker_mascot') || p.includes('factory_operator_mascot')) {
    return false;
  }
  if (p.startsWith('/api/jobs/') || p.startsWith('/uploads/') || p.startsWith('./uploads/') || p.startsWith('uploads/') || p.startsWith('data:image/')) {
    return true;
  }
  if (p.startsWith('http://') || p.startsWith('https://')) {
    return true;
  }
  return false;
}

function generateCompanyBannerDataUrl(job) {
  const compName = getEffectiveCompanyName(job);
  const title = (job.title || '').trim();
  const cat = (job.category || 'Lowongan Resmi').toUpperCase();
  const initial = compName ? compName.replace(/^(PT|CV)\s+/i, '').trim().charAt(0).toUpperCase() || 'C' : 'C';

  const hash = hashStr(compName);
  const palette = corporateBannerPalettes[hash % corporateBannerPalettes.length];

  const displayComp = escapeSvgText(compName);
  const displayTitle = escapeSvgText(title);
  const displayCat = escapeSvgText(cat);

  let compFontSize = 32;
  if (displayComp.length > 35) compFontSize = 22;
  else if (displayComp.length > 25) compFontSize = 26;
  else if (displayComp.length > 18) compFontSize = 29;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 420" width="100%" height="100%">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${palette.bg1}"/>
        <stop offset="50%" stop-color="${palette.bg2}"/>
        <stop offset="100%" stop-color="${palette.bg3}"/>
      </linearGradient>
      <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.18)"/>
        <stop offset="100%" stop-color="rgba(255,255,255,0.04)"/>
      </linearGradient>
      <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
        <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="800" height="420" fill="url(#bgGrad)"/>
    <rect width="800" height="420" fill="url(#grid)"/>
    <circle cx="720" cy="80" r="140" fill="${palette.accent}" opacity="0.18"/>
    <circle cx="80" cy="340" r="160" fill="${palette.textAccent}" opacity="0.12"/>
    <g transform="translate(40, 36)">
      <rect width="170" height="30" rx="15" fill="rgba(255,255,255,0.12)" stroke="${palette.border}" stroke-width="1"/>
      <circle cx="16" cy="15" r="4.5" fill="#10b981"/>
      <text x="30" y="19" font-family="system-ui, -apple-system, BlinkMacSystemFont, Roboto, sans-serif" font-size="11" font-weight="700" fill="#ffffff" letter-spacing="1">REKRUTMEN RESMI</text>
    </g>
    <g transform="translate(560, 36)">
      <rect width="200" height="30" rx="15" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
      <text x="100" y="19" text-anchor="middle" font-family="system-ui, -apple-system, BlinkMacSystemFont, Roboto, sans-serif" font-size="11" font-weight="700" fill="${palette.textAccent}">${displayCat}</text>
    </g>
    <g transform="translate(400, 160)" text-anchor="middle">
      <circle cx="0" cy="4" r="45" fill="rgba(0,0,0,0.22)"/>
      <circle cx="0" cy="0" r="42" fill="url(#badgeGrad)" stroke="${palette.accent}" stroke-width="2.5"/>
      <text x="0" y="12" font-family="system-ui, -apple-system, BlinkMacSystemFont, Roboto, sans-serif" font-size="32" font-weight="800" fill="#ffffff">${initial}</text>
    </g>
    <text x="400" y="248" text-anchor="middle" font-family="system-ui, -apple-system, BlinkMacSystemFont, Roboto, sans-serif" font-size="${compFontSize}" font-weight="800" fill="#ffffff">
      ${displayComp}
    </text>
    <text x="400" y="286" text-anchor="middle" font-family="system-ui, -apple-system, BlinkMacSystemFont, Roboto, sans-serif" font-size="15" font-weight="600" fill="${palette.textAccent}">
      ${displayTitle.length > 55 ? displayTitle.substring(0, 52) + '...' : displayTitle}
    </text>
    <line x1="40" y1="350" x2="760" y2="350" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
    <g transform="translate(40, 374)">
      <path d="M7 1l6 2.5v4c0 3.7-2.6 7-6 8-3.4-1-6-4.3-6-8v-4L7 1z" fill="none" stroke="#38bdf8" stroke-width="1.6"/>
      <text x="22" y="13" font-family="system-ui, -apple-system, BlinkMacSystemFont, Roboto, sans-serif" font-size="12" font-weight="600" fill="rgba(255,255,255,0.75)">
        TERVERIFIKASI KERJAHUB PORTAL
      </text>
      <text x="720" y="13" text-anchor="end" font-family="system-ui, -apple-system, BlinkMacSystemFont, Roboto, sans-serif" font-size="12" font-weight="600" fill="#34d399">
        BEBAS BIAYA SELEKSI 100%
      </text>
    </g>
  </svg>`;

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

window.handlePublicPosterError = function (imgEl, jobId) {
  if (!imgEl) return;
  imgEl.onerror = null;
  const job = (rawAllJobs || []).find(j => Number(j.id) === Number(jobId)) || (window.rawAllJobs || []).find(j => Number(j.id) === Number(jobId));
  imgEl.src = generateCompanyBannerDataUrl(job || { company_name: 'KerjaHub', title: 'Lowongan Kerja' });
};

function getEffectiveJobCover(job) {
  if (!job) return '';
  // 1. Explicit cover_image (from column or contact_value)
  let cover = job.cover_image;
  if (!cover && job.contact_value) {
    try {
      const cv = typeof job.contact_value === 'string' ? JSON.parse(job.contact_value) : job.contact_value;
      if (cv && cv.cover_image) cover = cv.cover_image;
    } catch (e) { }
  }
  if (cover && typeof cover === 'string' && cover.trim()) {
    let p = cover.trim();
    if (p.startsWith('/uploads/')) p = '.' + p;
    return p;
  }
  // 2. Real company photo/logo (headquarters building / official logo)
  const cName = getEffectiveCompanyName(job);
  if (job.company_image && !job.company_image.includes('unsplash.com')) {
    return job.company_image;
  }
  if (window._companyImagesCache) {
    if (window._companyImagesCache[cName]) return window._companyImagesCache[cName];
    if (window._companyImagesCache[job.company_name]) return window._companyImagesCache[job.company_name];
    if (window._companyImagesCache[job.title]) return window._companyImagesCache[job.title];
  }
  // 3. Fallback to manual flyer if present
  if (isManualJobFlyer(job)) {
    let p = String(job.poster_image).trim();
    if (p.startsWith('/uploads/')) p = '.' + p;
    return p;
  }
  // 4. Dynamic corporate SVG branded banner with Company Name
  return generateCompanyBannerDataUrl(job);
}

function getEffectiveJobPoster(job) {
  if (!job) return '';
  // 1. Direct flyer_images array
  if (Array.isArray(job.flyer_images) && job.flyer_images.length > 0) {
    const f = job.flyer_images[0];
    if (f && typeof f === 'string' && f.trim()) {
      let p = f.trim();
      if (p.startsWith('/uploads/')) p = '.' + p;
      return p;
    }
  }
  // 2. Poster image manual flyer
  if (isManualJobFlyer(job)) {
    let p = String(job.poster_image).trim();
    if (p.startsWith('/uploads/')) p = '.' + p;
    return p;
  }
  // 3. Fallback to cover
  return getEffectiveJobCover(job);
}

function openJobPosterById(jobId) {
  if (window.getSelection && window.getSelection().toString().trim().length > 0) return;
  const job = (rawAllJobs || []).find(j => Number(j.id) === Number(jobId)) || (window.rawAllJobs || []).find(j => Number(j.id) === Number(jobId));
  if (!job) return;
  const flyerList = typeof getJobFlyerImages === 'function' ? getJobFlyerImages(job).filter(src => isManualJobFlyer({ poster_image: src })) : [];
  if (flyerList.length > 0) {
    openLightbox(flyerList, `${job.title} - Flyer Rekrutmen`, 0);
  } else {
    const coverSrc = getEffectiveJobCover(job);
    openLightbox(coverSrc, job.title);
  }
}

window.getEffectiveJobCover = getEffectiveJobCover;
window.getEffectiveJobPoster = getEffectiveJobPoster;
window.generateCompanyBannerDataUrl = generateCompanyBannerDataUrl;
window.openJobPosterById = openJobPosterById;
window.isManualJobFlyer = isManualJobFlyer;

// Render Job Cards
function renderJobs(jobs) {
  const container = document.getElementById('jobs-container');
  if (!container) return;

  if (jobs.length === 0) {
    showEmptyState();
    return;
  }

  const cardsHtml = jobs.map(job => {
    const coverSrc = getEffectiveJobCover(job);
    const rawFlyers = Array.isArray(job.flyer_images) && job.flyer_images.length > 0
      ? job.flyer_images
      : (typeof getJobFlyerImages === 'function' ? getJobFlyerImages(job) : []);
    const flyerList = rawFlyers.filter(src => isManualJobFlyer({ poster_image: src }));
    const hasFlyers = flyerList.length > 0;

    const isLocked = isJobLocked(job);
    const initial = job.company_name ? job.company_name.charAt(0).toUpperCase() : 'C';
    const timeAgo = formatTimeAgo(job.created_at);
    const urgencyBadge = calculateUrgencyBadge(job.deadline);

    // Clean official verified pill for users
    const platformPill = '<span class="pill pill-platform pill-official"><i class="fa-solid fa-circle-check"></i> Rekrutmen Resmi</span>';

    // Dynamic skill pills from category & job
    const skillTags = generateSkillPills(job);
    const safeTitle = (job.title || '').replace(/'/g, "\\'");

    return `
      <div class="job-card ${isLocked ? 'job-card-locked' : ''}" data-id="${job.id}">

        <!-- Foto Sampul Kartu / Poster Preview with Lightbox trigger -->
        <div class="job-poster-preview" onclick="${isLocked ? `showLockedNotice('${safeTitle}')` : `openJobPosterById(${job.id})`}">
          <img src="${coverSrc}" alt="${escapeHtml(job.title)}" loading="lazy" decoding="async" onerror="window.handlePublicPosterError && window.handlePublicPosterError(this, ${job.id});">
          ${isLocked ? '<div class="badge-locked-overlay"><i class="fa-solid fa-lock"></i> TELAH DITUTUP (EXPIRED)</div>' : ''}
          ${job.is_featured && !isLocked ? '<div class="badge-featured"><i class="fa-solid fa-star"></i> Unggulan</div>' : ''}
          ${hasFlyers && !isLocked ? `<div class="badge-card-flyer"><i class="fa-regular fa-image"></i> ${flyerList.length > 1 ? flyerList.length + ' Poster' : 'Poster Loker'}</div>` : ''}
          <div class="badge-category">${escapeHtml(job.category)}</div>
          <div class="poster-overlay">
            <span class="poster-badge-btn"><i class="fa-solid ${isLocked ? 'fa-lock' : 'fa-expand'}"></i> ${isLocked ? 'Lowongan Telah Kedaluwarsa' : (hasFlyers ? 'Lihat Poster (' + flyerList.length + ')' : 'Lihat Poster')}</span>
          </div>
        </div>

        <div class="job-card-body">
          <div class="company-row">
            <div class="company-avatar">${initial}</div>
            <div class="company-meta">
              <div class="company-name">${escapeHtml(job.company_name)}</div>
              <div class="job-location"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(job.location || 'Indonesia')}</div>
            </div>
          </div>

          <h3 class="job-title" onclick="${isLocked ? `showLockedNotice('${safeTitle}')` : `openJobDetail(${job.id})`}" title="${isLocked ? 'Lowongan telah ditutup (Expired)' : 'Klik untuk rincian lengkap'}">${escapeHtml(job.title)}</h3>

          <div class="job-badges">
            ${platformPill}
            <span class="pill pill-type"><i class="fa-regular fa-clock"></i> ${escapeHtml(job.job_type)}</span>
            ${job.salary_display ? `<span class="pill pill-salary"><i class="fa-solid fa-money-bill-wave"></i> ${escapeHtml(job.salary_display)}</span>` : ''}
            ${isLocked ? '<span class="pill pill-expired"><i class="fa-solid fa-ban"></i> Lowongan Berakhir / Terkunci</span>' : urgencyBadge}
          </div>

          <!-- CV Match Score Badge (if active) -->
          ${job._matchScore ? `
            <div style="margin-top: 6px;">
              <span class="cv-match-badge"><i class="fa-solid fa-wand-magic-sparkles"></i> Kecocokan CV: ${job._matchScore}%</span>
              ${job._matchedSkills && job._matchedSkills.length > 0 ? `
                <div class="matched-skills-chips">
                  <span class="matched-skills-label">Skill Terdeteksi:</span>
                  ${job._matchedSkills.map(s => `<span class="matched-skill-tag"><i class="fa-solid fa-check"></i> ${escapeHtml(s)}</span>`).join('')}
                </div>
              ` : ''}
            </div>
          ` : ''}

          <!-- Skill Chips -->
          <div class="card-skills-list">
            ${skillTags.map(tag => `<span class="skill-tag-pill" onclick="searchBySkill(event, '${escapeHtml(tag)}')">#${escapeHtml(tag)}</span>`).join('')}
          </div>

          <p class="job-excerpt">${escapeHtml(job.description)}</p>

          <div class="job-card-footer">
            <span class="posted-time"><i class="fa-regular fa-calendar"></i> ${timeAgo}</span>
            <div class="card-actions" style="width: ${isLocked ? '100%' : 'auto'};">
              ${isLocked ? `
                <button type="button" class="btn-locked-disabled" onclick="showLockedNotice('${safeTitle}')" title="Lowongan sudah kedaluwarsa">
                  <i class="fa-solid fa-lock"></i> Lowongan Telah Ditutup (Expired)
                </button>
              ` : `
                <button type="button" class="btn btn-outline btn-sm" onclick="openJobDetail(${job.id})" title="Lihat kualifikasi & deskripsi lengkap">
                  <i class="fa-regular fa-eye"></i> Detail
                </button>
                <button type="button" class="btn btn-primary btn-sm btn-apply-direct" onclick="directApplyJob(${job.id}, event)" title="Buka langsung tautan pendaftaran resmi ${escapeHtml(job.company_name)}">
                  <i class="fa-solid fa-arrow-up-right-from-square"></i> Lamar Langsung
                </button>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const noticeHtml = window.isSearchingOutOfCategory ? `
    <div class="search-out-of-category-notice" style="grid-column: 1 / -1;">
      <span class="search-out-of-cat-text">
        <i class="fa-solid fa-arrows-to-dot" style="color: var(--primary); font-size: 1.15rem;"></i>
        Menampilkan <strong>${jobs.length} lowongan</strong> untuk kata kunci <em>"${escapeHtml(activeFilters.search)}"</em> di <strong>Semua Kategori</strong> (karena tidak ada hasil di kategori <em>${escapeHtml(activeFilters.category)}</em>).
      </span>
      <button type="button" class="btn-clear-category-chip" onclick="resetCategoryFilter()">
        <i class="fa-solid fa-layer-group"></i> Ubah ke Semua Kategori
      </button>
    </div>
  ` : '';

  container.innerHTML = noticeHtml + cardsHtml;
}

// Generate skill pills based on job properties
function generateSkillPills(job) {
  const pills = [];
  if (job.category) {
    if (job.category.includes('Teknologi')) pills.push('Tech', 'Development');
    else if (job.category.includes('Design')) pills.push('Design', 'Creative');
    else if (job.category.includes('Marketing')) pills.push('Marketing', 'Campaign');
    else if (job.category.includes('AI')) pills.push('AI', 'Data');
  }
  if (job.job_type && job.job_type.includes('Remote')) pills.push('WFH');
  if (job.experience_level && job.experience_level.includes('Fresh')) pills.push('FreshGraduate');
  return pills.slice(0, 3);
}

// Smart Date Parser (handles ISO YYYY-MM-DD, DD/MM/YYYY, and Indonesian Date Formats; end-of-day local time)
function parseDateSafe(str) {
  if (!str) return null;
  if (typeof str !== 'string') {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }
  const s = str.trim();
  if (!s) return null;

  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    return new Date(year, month, day, 23, 59, 59, 999);
  }

  const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    return new Date(year, month, day, 23, 59, 59, 999);
  }

  const months = {
    januari: 0, jan: 0, january: 0,
    februari: 1, feb: 1, february: 1,
    maret: 2, mar: 2, march: 2,
    april: 3, apr: 3,
    mei: 4, may: 4,
    juni: 5, jun: 5, june: 5,
    juli: 6, jul: 6, july: 6,
    agustus: 7, agu: 7, ags: 7, august: 7, aug: 7,
    september: 8, sep: 8, sept: 8,
    oktober: 9, okt: 9, oct: 9, october: 9,
    november: 10, nov: 10,
    desember: 11, des: 11, dec: 11, december: 11
  };
  const m = s.match(/(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/);
  if (m) {
    const day = parseInt(m[1], 10);
    const monStr = m[2].toLowerCase();
    const year = parseInt(m[3], 10);
    if (months[monStr] !== undefined) {
      return new Date(year, months[monStr], day, 23, 59, 59, 999);
    }
  }

  if (!/[\/\-:,T]/.test(s)) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  if (!s.includes(':')) d.setHours(23, 59, 59, 999);
  return d;
}

// Job Lock Check: missing/open deadline stays open forever; dated deadline stays open through today and locks tomorrow
function isJobLocked(job) {
  if (!job) return false;
  if (job.status === 'expired' || job.status === 'closed') return true;
  const dObj = parseDateSafe(job.deadline);
  if (!dObj) return false;
  return dObj.getTime() < Date.now();
}

// Urgency badge calculation
function calculateUrgencyBadge(deadlineStr) {
  if (!deadlineStr) return '<span class="pill pill-urgency"><i class="fa-solid fa-circle-check"></i> Terbuka</span>';
  try {
    const deadline = parseDateSafe(deadlineStr);
    if (!deadline) return '<span class="pill pill-urgency"><i class="fa-solid fa-circle-check"></i> Terbuka</span>';
    const now = new Date();
    if (deadline.getTime() < now.getTime()) {
      return '<span class="pill pill-expired" style="background: rgba(239, 68, 68, 0.12); color: #ef4444;"><i class="fa-solid fa-ban"></i> Batas Waktu Terlewat</span>';
    }
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dStart = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate()).getTime();
    const calDays = Math.round((dStart - todayStart) / 86400000);
    if (calDays === 0) {
      return '<span class="pill pill-urgency" style="background: rgba(245, 158, 11, 0.14); color: #b45309;"><i class="fa-solid fa-hourglass-half"></i> Berakhir Hari Ini</span>';
    } else if (calDays <= 7) {
      return `<span class="pill pill-urgency" style="background: rgba(245, 158, 11, 0.12); color: #d97706;"><i class="fa-solid fa-hourglass-half"></i> Sisa ${calDays} Hari</span>`;
    } else {
      return `<span class="pill pill-urgency"><i class="fa-regular fa-calendar-check"></i> Sisa ${calDays} Hari</span>`;
    }
  } catch (e) {
    return '';
  }
}

// Quick Search by Skill Tag
window.searchBySkill = function (event, skill) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.value = skill;
    const clearBtn = document.getElementById('btn-clear-search');
    if (clearBtn) clearBtn.style.display = 'block';
  }
  activeFilters.search = skill;
  applyFiltersAndRender();
  document.getElementById('lowongan')?.scrollIntoView({ behavior: 'smooth' });
};

// Empty State Display
function showEmptyState() {
  const container = document.getElementById('jobs-container');
  if (!container) return;

  const totalVisibleInPortal = (rawAllJobs || []).filter(isJobPubliclyVisible).length;
  if (totalVisibleInPortal === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <i class="fa-solid fa-briefcase" style="color: var(--primary);"></i>
        </div>
        <h3 class="empty-title">Belum Ada Lowongan Tersedia</h3>
        <p class="empty-desc">
          Saat ini belum ada lowongan kerja yang dipublikasikan di portal. Silakan periksa kembali secara berkala untuk info rekrutmen terbaru.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">
        <i class="fa-solid fa-magnifying-glass" style="color: var(--primary);"></i>
      </div>
      <h3 class="empty-title">Tidak Ada Lowongan yang Sesuai</h3>
      <p class="empty-desc">
        Coba gunakan kata kunci pencarian yang berbeda atau reset filter untuk melihat semua poster rekrutmen resmi yang tersedia.
      </p>
      <button class="btn btn-primary" onclick="resetAllFilters()">
        <i class="fa-solid fa-rotate-left"></i> Tampilkan Semua Lowongan
      </button>
    </div>
  `;
}

// Lightbox modal for posters (supports multi-flyer Prev/Next sliding)
let lightboxSlides = [];
let lightboxSlideIndex = 0;
let lightboxBaseTitle = 'Poster Lowongan';

function renderLightboxSlide() {
  const lbImg = document.getElementById('lightbox-img');
  const lbTitle = document.getElementById('lightbox-title');
  const lbDownload = document.getElementById('lightbox-download');
  const prevBtn = document.getElementById('lightbox-prev-btn');
  const nextBtn = document.getElementById('lightbox-next-btn');

  const total = lightboxSlides.length;
  const src = lightboxSlides[lightboxSlideIndex] || '';
  if (lbImg && src) lbImg.src = src;
  if (lbDownload && src) lbDownload.href = src;
  if (lbTitle) {
    lbTitle.textContent = total > 1
      ? `${lightboxBaseTitle} (Slide ${lightboxSlideIndex + 1}/${total})`
      : lightboxBaseTitle;
  }
  const showNav = total > 1 ? 'flex' : 'none';
  if (prevBtn) prevBtn.style.display = showNav;
  if (nextBtn) nextBtn.style.display = showNav;
}

window.prevLightboxSlide = function (event) {
  if (event) event.stopPropagation();
  if (lightboxSlides.length <= 1) return;
  lightboxSlideIndex = (lightboxSlideIndex - 1 + lightboxSlides.length) % lightboxSlides.length;
  renderLightboxSlide();
};

window.nextLightboxSlide = function (event) {
  if (event) event.stopPropagation();
  if (lightboxSlides.length <= 1) return;
  lightboxSlideIndex = (lightboxSlideIndex + 1) % lightboxSlides.length;
  renderLightboxSlide();
};

function openLightbox(imgSrcOrList, title, startIdx = 0) {
  const lb = document.getElementById('poster-lightbox');
  if (!lb) return;

  const list = Array.isArray(imgSrcOrList)
    ? imgSrcOrList.filter(Boolean)
    : (imgSrcOrList ? [imgSrcOrList] : []);
  if (list.length === 0) return;

  lightboxSlides = list;
  lightboxSlideIndex = Math.max(0, Math.min(startIdx || 0, list.length - 1));
  lightboxBaseTitle = (title || 'Poster Lowongan').replace(/\s*\(Slide \d+(?:\/\d+)?\)$/i, '').trim();

  renderLightboxSlide();
  lb.classList.add('active');
}

// ==============================================================
// MULTI-FLYER AUTO-SLIDING CAROUSEL ENGINE
// ==============================================================
let activeJobFlyerSlide = 0;
let jobFlyerCarouselTimer = null;
let currentJobFlyerImages = [];
let currentJobCarouselJobId = null;
let isJobCarouselPaused = false;

function getJobFlyerImages(job) {
  const images = [];
  const pushUnique = (img) => {
    if (!img || typeof img !== 'string') return;
    let clean = img.trim();
    if (!clean) return;
    if (clean.startsWith('/uploads/')) clean = '.' + clean;
    if (!images.includes(clean)) images.push(clean);
  };
  if (!job) return images;

  // 1. Direct flyer_images array or JSON string
  if (Array.isArray(job.flyer_images) && job.flyer_images.length > 0) {
    job.flyer_images.forEach(pushUnique);
  } else if (typeof job.flyer_images === 'string' && job.flyer_images.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(job.flyer_images);
      if (Array.isArray(parsed)) parsed.forEach(pushUnique);
    } catch (e) { }
  }

  // 2. Check contact_value JSON
  if (images.length === 0 && job.contact_value) {
    try {
      const cv = typeof job.contact_value === 'string' ? JSON.parse(job.contact_value) : job.contact_value;
      if (cv && Array.isArray(cv.flyer_images) && cv.flyer_images.length > 0) {
        cv.flyer_images.forEach(pushUnique);
      }
    } catch (e) { }
  }

  // 3. Check poster_image
  if (images.length === 0 && job.poster_image) {
    const p = String(job.poster_image).trim();
    if (p.startsWith('[') && p.endsWith(']')) {
      try {
        const parsed = JSON.parse(p);
        if (Array.isArray(parsed)) parsed.forEach(pushUnique);
      } catch (e) { }
    } else if (p) {
      pushUnique(p);
    }
  }

  // 4. Fallback if still empty
  if (images.length === 0) {
    const fallbackCover = typeof getEffectiveJobCover === 'function' ? getEffectiveJobCover(job) : '';
    if (fallbackCover) pushUnique(fallbackCover);
  }

  return images;
}

function initJobFlyerCarousel(jobId, images) {
  stopJobFlyerCarousel();
  currentJobCarouselJobId = jobId;
  currentJobFlyerImages = images;
  activeJobFlyerSlide = 0;
  isJobCarouselPaused = false;

  if (!images || images.length <= 1) return;

  // Auto-slide every 3.5 seconds
  jobFlyerCarouselTimer = setInterval(() => {
    if (!isJobCarouselPaused) {
      nextJobSlide(jobId, true);
    }
  }, 3500);
}

function stopJobFlyerCarousel() {
  if (jobFlyerCarouselTimer) {
    clearInterval(jobFlyerCarouselTimer);
    jobFlyerCarouselTimer = null;
  }
}

window.pauseJobFlyerCarousels = function (jobId) {
  isJobCarouselPaused = true;
};

window.resumeJobFlyerCarousels = function (jobId) {
  isJobCarouselPaused = false;
};

window.goToJobSlide = function (jobId, index) {
  if (!currentJobFlyerImages || currentJobFlyerImages.length === 0) return;
  activeJobFlyerSlide = (index + currentJobFlyerImages.length) % currentJobFlyerImages.length;
  updateJobCarouselDOM(jobId);
};

window.nextJobSlide = function (jobId, isAuto = false) {
  if (!currentJobFlyerImages || currentJobFlyerImages.length === 0) return;
  activeJobFlyerSlide = (activeJobFlyerSlide + 1) % currentJobFlyerImages.length;
  updateJobCarouselDOM(jobId);
};

window.prevJobSlide = function (jobId) {
  if (!currentJobFlyerImages || currentJobFlyerImages.length === 0) return;
  activeJobFlyerSlide = (activeJobFlyerSlide - 1 + currentJobFlyerImages.length) % currentJobFlyerImages.length;
  updateJobCarouselDOM(jobId);
};

function updateJobCarouselDOM(jobId) {
  const total = currentJobFlyerImages.length;
  const currentIdx = activeJobFlyerSlide;

  // 1. Update Hero Carousel Slides
  const heroContainer = document.getElementById(`hero-carousel-${jobId}`);
  if (heroContainer) {
    const slides = heroContainer.querySelectorAll('.carousel-slide');
    slides.forEach((sl, i) => {
      sl.classList.toggle('active', i === currentIdx);
    });
    const dots = heroContainer.querySelectorAll('.carousel-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentIdx);
    });
    const counter = document.getElementById(`hero-slide-num-${jobId}`);
    if (counter) counter.textContent = currentIdx + 1;
  }

  // 2. Update Sidebar Carousel Slides
  const sideContainer = document.getElementById(`sidebar-carousel-${jobId}`);
  if (sideContainer) {
    const sideSlides = sideContainer.querySelectorAll('.side-slide');
    sideSlides.forEach((sl, i) => {
      sl.classList.toggle('active', i === currentIdx);
    });
    const sideDots = sideContainer.querySelectorAll('.side-dot');
    sideDots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentIdx);
    });
    const sideCounter = document.getElementById(`side-slide-num-${jobId}`);
    if (sideCounter) sideCounter.textContent = currentIdx + 1;
  }
}

window.openActiveJobLightbox = function (jobId) {
  if (!currentJobFlyerImages || currentJobFlyerImages.length === 0) return;
  openLightbox(currentJobFlyerImages, 'Poster Lowongan', activeJobFlyerSlide);
};

window.downloadActiveJobSlide = function (jobId) {
  if (!currentJobFlyerImages || currentJobFlyerImages.length === 0) return;
  const currentSrc = currentJobFlyerImages[activeJobFlyerSlide] || currentJobFlyerImages[0];
  const a = document.createElement('a');
  a.href = currentSrc;
  a.download = `flyer_loker_slide_${activeJobFlyerSlide + 1}.png`;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

window.openLightboxSlide = function (jobId, slideIndex) {
  if (!currentJobFlyerImages || currentJobFlyerImages.length === 0) return;
  openLightbox(currentJobFlyerImages, 'Poster Lowongan', slideIndex);
};

function formatStructuredDescriptionHtml(rawDesc) {
  const raw = String(rawDesc || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!raw) {
    return '<p class="desc-body-text">Tidak ada deskripsi tambahan.</p>';
  }

  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const bulletRe = /^(?:[-–—•▪▫●○■□✓✔➤➢►▶*]|\d{1,2}[\.\)])(?:\s+\S|(?=[A-Za-zÀ-ÿ]))|^[•▪▫◦●○■□✓✔➤➢►▶*](?=\S)/;
  const headingRe = /^(kualifikasi|persyaratan|requirements?|kriteria|tugas(?:\s*&?\s*tanggung\s*jawab)?|deskripsi(?:\s*pekerjaan)?|benefit|fasilitas)\s*:?$/i;

  const hasListLikeStructure = lines.length >= 3 || lines.some(l => bulletRe.test(l) || headingRe.test(l));
  if (!hasListLikeStructure) {
    return `<p class="desc-body-text">${escapeHtml(raw)}</p>`;
  }

  let htmlParts = [];
  let pendingItems = [];
  let inListSection = false;

  const flushList = () => {
    if (pendingItems.length === 0) return;
    htmlParts.push(`
      <ol class="auto-numbered-list">
        ${pendingItems.map((item, idx) => `
          <li>
            <span class="num-point-badge">${idx + 1}</span>
            <span class="num-point-text">${escapeHtml(item)}</span>
          </li>
        `).join('')}
      </ol>
    `);
    pendingItems = [];
  };

  for (const line of lines) {
    if (headingRe.test(line)) {
      flushList();
      inListSection = true;
      htmlParts.push(`<div class="desc-section-subhead">${escapeHtml(line.replace(/:+$/, ''))}:</div>`);
      continue;
    }

    const isBullet = bulletRe.test(line);
    const cleaned = line
      .replace(/^[\s•▪▫◦●○■□✓✔➤➢►▶\-–—*]+/, '')
      .replace(/^\d{1,2}[\.\)]\s+/, '')
      .trim();

    if (!cleaned) continue;

    if (isBullet || inListSection) {
      pendingItems.push(cleaned);
    } else if (lines.some(l => bulletRe.test(l)) && cleaned.length < 130) {
      // Short requirement-style lines interspersed with dashed lines
      pendingItems.push(cleaned);
    } else {
      flushList();
      htmlParts.push(`<p class="desc-body-text" style="margin-bottom: 10px;">${escapeHtml(cleaned)}</p>`);
    }
  }

  flushList();
  return htmlParts.join('') || `<p class="desc-body-text">${escapeHtml(raw)}</p>`;
}

async function openJobDetail(jobId) {
  if (window.getSelection && window.getSelection().toString().trim().length > 0) return;
  let rawJob = rawAllJobs.find(j => Number(j.id) === Number(jobId));
  if (!rawJob && jobId) {
    try {
      const { ok, data: fetchedJob } = await safeFetchJson(getApiEndpoint(`/api/jobs/${jobId}`));
      if (ok && fetchedJob) {
        rawJob = fetchedJob;
        rawAllJobs.unshift(rawJob);
      } else if (sbClient) {
        const { data: sbJobs } = await sbClient.from('jobs').select('*').eq('id', jobId).limit(1);
        if (sbJobs && sbJobs.length > 0) {
          rawJob = sbJobs[0];
          rawAllJobs.unshift(rawJob);
        }
      }
    } catch (e) { }
  }
  if (!rawJob) return;

  const job = typeof window.cleanJobData === 'function' ? window.cleanJobData(rawJob) : rawJob;

  // Strict check: if job is locked / expired, visitor CANNOT open detail modal
  if (isJobLocked(job)) {
    showLockedNotice(job.title);
    return;
  }

  const modal = document.getElementById('job-detail-modal');
  const content = document.getElementById('job-detail-content');
  if (!modal || !content) return;

  const nextViews = (Number(rawJob.views_count || job.views_count || 0)) + 1;
  rawJob.views_count = nextViews;
  job.views_count = nextViews;

  // Increment views count in Supabase Cloud
  if (sbClient) {
    sbClient.from('jobs').update({ views_count: nextViews }).eq('id', job.id).then();
  }
  if (typeof renderPopularCategoriesByViews === 'function') {
    renderPopularCategoriesByViews();
  }

  const flyerImages = getJobFlyerImages(job);
  const heroCoverSrc = getEffectiveJobCover(job);
  const isMultiFlyer = flyerImages.length > 1;
  const companyInitial = (job.company_name || 'K').trim().charAt(0).toUpperCase();
  const hasRealFlyer = flyerImages.some(src => isManualJobFlyer({ poster_image: src }));
  const flyerBtnLabel = flyerImages.length > 1 ? `Lihat ${flyerImages.length} Poster` : 'Lihat Poster';

  const contacts = extractJobContacts(job);
  const contactBtnHtml = renderContactButton(job);

  const reqs = parseStructuredList(job.requirements);
  const resps = parseStructuredList(job.responsibilities);
  const bens = parseStructuredList(job.benefits);
  const formattedDescHtml = formatStructuredDescriptionHtml(job.description);

  // Pre-formatted intro template for job seekers
  const waTemplate = `Halo Bapak/Ibu HRD ${job.company_name},\n\nPerkenalkan saya [Nama Anda]. Saya bermaksud mengajukan lamaran kerja untuk posisi ${job.title}.\n\nBersama pesan ini, saya siap melampirkan berkas CV dan Portofolio terbaru saya sebagai bahan pertimbangan.\n\nMohon informasi mengenai tahapan proses seleksi selanjutnya. Terima kasih banyak atas perhatian dan kesempatannya.`;

  const safeTitle = (job.title || '').replace(/'/g, "\\'");
  const safeCompany = (job.company_name || '').replace(/'/g, "\\'");

  content.innerHTML = `
    <!-- Sticky Header Banner Sampul Lowongan (Frozen on Scroll, Clean Gradient Backdrop + Lihat Flyer Action) -->
    <div class="modal-hero-banner" id="hero-banner-${job.id}">
      <div class="modal-banner-overlay">
        <div class="modal-hero-top-pills">
          <div class="modal-hero-pills-left">
            <span class="mh-pill open"><i class="fa-solid fa-circle-check"></i> Sedang Dibuka</span>
            <span class="mh-pill type"><i class="fa-regular fa-clock"></i> ${escapeHtml(job._clean_status || job.job_type || 'Full Time')}</span>
            ${job.salary_display ? `<span class="mh-pill open"><i class="fa-solid fa-money-bill-wave"></i> ${escapeHtml(job.salary_display)}</span>` : ''}
            <span class="mh-pill views"><i class="fa-regular fa-eye"></i> ${nextViews.toLocaleString('id-ID')}x Dilihat</span>
          </div>
          <div class="modal-hero-actions-right">
            <button type="button" class="mh-btn-flyer" onclick="openActiveJobLightbox(${job.id})" title="Buka & Perbesar Flyer Lowongan">
              <i class="fa-regular fa-images"></i> <span>${flyerBtnLabel}</span>
            </button>
            <button type="button" class="modal-close-btn modal-sticky-close" title="Tutup Modal">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
        <div class="modal-hero-glass">
          <div class="modal-hero-avatar">${escapeHtml(companyInitial)}</div>
          <div class="modal-header-info">
            <div class="modal-hero-company"><i class="fa-solid fa-building"></i> ${escapeHtml(job.company_name)}</div>
            <h2>${escapeHtml(job.title)}</h2>
            <div class="modal-header-meta">
              <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(job.location || 'Indonesia')}</span>
              <span><i class="fa-solid fa-tag"></i> ${escapeHtml(job.category)}</span>
              ${(job._clean_education || job.experience_level) ? `<span><i class="fa-solid fa-graduation-cap"></i> ${escapeHtml(job._clean_education || job.experience_level)}</span>` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-body">
      <div class="detail-grid-layout">
        <div class="detail-main">
          
          <!-- Keterangan & Deskripsi Posisi -->
          <div class="detail-section">
            <h4><i class="fa-solid fa-file-lines"></i> Keterangan & Deskripsi Posisi</h4>
            <div class="desc-meta-chips">
              <div class="desc-meta-chip">
                <i class="fa-solid fa-briefcase"></i>
                <span><strong>Status:</strong> ${escapeHtml(job._clean_status || job.job_type || 'Full time')}</span>
              </div>
              <div class="desc-meta-chip">
                <i class="fa-solid fa-graduation-cap"></i>
                <span><strong>Pendidikan:</strong> ${escapeHtml(job._clean_education || job.experience_level || 'Sesuai Kualifikasi')}</span>
              </div>
              <div class="desc-meta-chip">
                <i class="fa-solid fa-location-dot"></i>
                <span><strong>Penempatan:</strong> ${escapeHtml(job.location || 'Indonesia')}</span>
              </div>
            </div>
            <div class="desc-body-box">
              ${formattedDescHtml}
            </div>
          </div>

          <!-- Tanggung Jawab -->
          ${resps.length > 0 ? `
            <div class="detail-section">
              <h4><i class="fa-solid fa-list-check"></i> Tanggung Jawab Pekerjaan</h4>
              <ol class="auto-numbered-list auto-numbered-emerald">
                ${resps.map((r, idx) => `
                  <li>
                    <span class="num-point-badge">${idx + 1}</span>
                    <span class="num-point-text">${escapeHtml(r)}</span>
                  </li>
                `).join('')}
              </ol>
            </div>
          ` : ''}

          <!-- Interactive Kualifikasi Checklist (Auto-Numbered Eye-Catching Design) -->
          ${reqs.length > 0 ? `
            <div class="detail-section">
              <h4><i class="fa-solid fa-user-check"></i> Kualifikasi & Persyaratan</h4>
              <div class="interactive-check-box">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted);">
                    <i class="fa-solid fa-calculator"></i> Evaluasi Kesesuaian Profil Anda:
                  </span>
                  <span id="match-score-text" style="font-size: 0.82rem; font-weight: 800; color: var(--primary);">
                    0 / ${reqs.length} Kualifikasi Terpenuhi (0%)
                  </span>
                </div>
                <div class="check-meter-bar">
                  <div class="check-meter-fill" id="match-score-fill" style="width: 0%;"></div>
                </div>
                <div class="check-list-numbered-grid" style="margin-top: 12px;">
                  ${reqs.map((req, i) => `
                    <label class="check-list-item check-list-numbered" id="check-item-${i}">
                      <span class="check-item-num">${i + 1}</span>
                      <span class="check-item-text">${escapeHtml(req)}</span>
                      <input type="checkbox" onchange="updateMatchScore(${reqs.length})">
                    </label>
                  `).join('')}
                </div>
              </div>
            </div>
          ` : ''}

          <!-- Benefit -->
          ${bens.length > 0 ? `
            <div class="detail-section">
              <h4><i class="fa-solid fa-gift"></i> Benefit & Fasilitas</h4>
              <div class="benefits-pills">
                ${bens.map(b => `<div class="benefit-tag"><i class="fa-solid fa-check-circle"></i> ${escapeHtml(b)}</div>`).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Template Pesan Lamaran ke HRD -->
          <div class="chat-template-card">
            <div class="chat-template-header">
              <span style="font-size: 0.84rem; font-weight: 800; color: var(--text-main);">
                <i class="fa-solid fa-comment-dots" style="color: var(--primary);"></i> Template Pesan Perkenalan ke HRD:
              </span>
              <button type="button" class="btn-copy-template" onclick="copyApplicationTemplate('${safeTitle}', '${safeCompany}')">
                <i class="fa-regular fa-copy"></i> Salin Pesan
              </button>
            </div>
            <div class="chat-template-text" id="wa-template-box">${escapeHtml(waTemplate)}</div>
            <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 6px;">
              * Salin pesan di atas dan ganti <code>[Nama Anda]</code> sebelum mengirim ke kontak perekrut.
            </div>
          </div>

        </div>

        <!-- Sidebar Info -->
        <div class="detail-sidebar">
          
          <!-- Primary CTA Buttons (WhatsApp / Email / Website Multi-Channel) -->
          ${contactBtnHtml}

          <!-- Poster Showcase (Auto-Sliding Carousel if > 1 flyer) -->
          <div class="poster-showcase-box ${isMultiFlyer ? 'sidebar-flyer-carousel' : ''}" id="sidebar-carousel-${job.id}">
            <div class="poster-showcase-heading" style="text-align: center; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; margin-bottom: 10px;">
              <span style="font-size: 0.82rem; font-weight: 800; color: var(--text-main); display: inline-flex; align-items: center; justify-content: center; gap: 6px; letter-spacing: 0.5px;">
                <i class="fa-solid fa-images" style="color: var(--primary);"></i> ${flyerImages.some(src => isManualJobFlyer({ poster_image: src })) ? 'POSTER REKRUTMEN RESMI' : 'FOTO & FLYER RESMI'}
              </span>
              ${isMultiFlyer ? `
                <span class="badge-slide-count" style="font-size: 0.72rem; color: var(--primary); font-weight: 800; background: rgba(79, 70, 229, 0.08); border: 1px solid rgba(79, 70, 229, 0.2); border-radius: 999px; padding: 2px 10px; display: inline-flex; align-items: center; gap: 4px;">
                  <i class="fa-solid fa-layer-group" style="font-size: 0.65rem;"></i> Slide <span id="side-slide-num-${job.id}">1</span> dari ${flyerImages.length}
                </span>
              ` : ''}
            </div>
            ${isMultiFlyer ? `
              <div class="side-carousel-wrapper" onmouseenter="pauseJobFlyerCarousels(${job.id})" onmouseleave="resumeJobFlyerCarousels(${job.id})">
                <div class="side-carousel-track">
                  ${flyerImages.map((src, i) => `
                    <div class="side-slide ${i === 0 ? 'active' : ''}" data-index="${i}">
                      <img src="${src}" alt="Poster Slide ${i + 1}" onclick="openLightboxSlide(${job.id}, ${i})" onerror="window.handlePublicPosterError && window.handlePublicPosterError(this, ${job.id});">
                    </div>
                  `).join('')}
                </div>
                <button type="button" class="side-nav-btn prev" onclick="event.stopPropagation(); prevJobSlide(${job.id})"><i class="fa-solid fa-chevron-left"></i></button>
                <button type="button" class="side-nav-btn next" onclick="event.stopPropagation(); nextJobSlide(${job.id})"><i class="fa-solid fa-chevron-right"></i></button>
              </div>
              <div class="side-carousel-dots">
                ${flyerImages.map((_, i) => `<span class="side-dot ${i === 0 ? 'active' : ''}" onclick="event.stopPropagation(); goToJobSlide(${job.id}, ${i})"></span>`).join('')}
              </div>
            ` : `
              <img src="${flyerImages[0] || heroCoverSrc}" alt="Foto Lowongan" onclick="openJobPosterById(${job.id})" onerror="window.handlePublicPosterError && window.handlePublicPosterError(this, ${job.id});">
            `}
            <div style="margin-top: 10px; display: flex; gap: 8px; justify-content: center;">
              <button type="button" class="btn btn-outline btn-sm" onclick="openActiveJobLightbox(${job.id})">
                <i class="fa-solid fa-expand"></i> Perbesar
              </button>
              <button type="button" class="btn btn-outline btn-sm" onclick="downloadActiveJobSlide(${job.id})">
                <i class="fa-solid fa-download"></i> Unduh Foto
              </button>
            </div>
          </div>

          <!-- Ringkasan Kartu -->
          <div class="sidebar-card">
            <div class="sidebar-card-title">Ringkasan Lowongan</div>
            
            <div class="info-item">
              <i class="fa-solid fa-money-bill-wave"></i>
              <div>
                <div class="info-label">Gaji Ditawarkan</div>
                <div class="info-val" style="color: var(--success); font-weight: 700;">${escapeHtml(job.salary_display || 'Kompetitif')}</div>
              </div>
            </div>

            <div class="info-item">
              <i class="fa-regular fa-clock"></i>
              <div>
                <div class="info-label">Tipe Pekerjaan</div>
                <div class="info-val">${escapeHtml(job.job_type)}</div>
              </div>
            </div>

            <div class="info-item">
              <i class="fa-solid fa-briefcase"></i>
              <div>
                <div class="info-label">Tingkat Pengalaman</div>
                <div class="info-val">${escapeHtml(job.experience_level || 'Semua Tingkat')}</div>
              </div>
            </div>

            <div class="info-item">
              <i class="fa-solid fa-calendar-xmark" style="color: #ef4444;"></i>
              <div>
                <div class="info-label">Batas Waktu Rekrutmen</div>
                <div class="info-val">${escapeHtml(contacts.deadline_display || job.deadline || 'Terbuka Selama Lowongan Aktif')}</div>
              </div>
            </div>

            ${contacts.apply_info ? `
              <div class="info-item apply-guide-box">
                <div class="info-label">
                  <i class="fa-solid fa-paper-plane"></i> Petunjuk Cara Melamar
                </div>
                <div class="info-val">${escapeHtml(contacts.apply_info)}</div>
              </div>
            ` : ''}

            ${contacts.whatsapp ? `
              <div class="info-item">
                <i class="fa-brands fa-whatsapp" style="color: #25d366;"></i>
                <div>
                  <div class="info-label">WhatsApp Perekrut</div>
                  <div class="info-val">
                    <a href="javascript:void(0)" onclick="triggerWhatsAppChat('${contacts.whatsapp}', '${safeCompany}', '${safeTitle}')" style="color: #16a34a; font-weight: 700;">
                      ${escapeHtml(contacts.whatsapp)}
                    </a>
                  </div>
                </div>
              </div>
            ` : ''}

            ${contacts.email ? `
              <div class="info-item">
                <i class="fa-solid fa-envelope" style="color: #ea4335;"></i>
                <div>
                  <div class="info-label">Email Rekrutmen</div>
                  <div class="info-val" style="word-break: break-all;">
                    <a href="javascript:void(0)" onclick="triggerEmailApplication('${contacts.email}', '${safeCompany}', '${safeTitle}')" style="color: #ea4335; font-weight: 700; text-decoration: underline;" title="Klik untuk membuka langsung di Gmail Web">
                      <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.72rem; margin-right: 4px;"></i>${escapeHtml(contacts.email)}
                    </a>
                  </div>
                </div>
              </div>
            ` : ''}

            ${contacts.website_url ? `
              <div class="info-item">
                <i class="fa-solid fa-globe" style="color: #0284c7;"></i>
                <div>
                  <div class="info-label">Tautan / Web Resmi</div>
                  <div class="info-val" style="word-break: break-all;">
                    <a href="${contacts.website_url.startsWith('http') ? contacts.website_url : 'https://' + contacts.website_url}" target="_blank" rel="noopener noreferrer" style="color: #0284c7; font-weight: 600;">
                      ${escapeHtml(contacts.website_url)}
                    </a>
                  </div>
                </div>
              </div>
            ` : ''}

          </div>

          <!-- Share Section -->
          <div class="share-box">
            <div class="share-box-title">
              <i class="fa-solid fa-share-nodes"></i> Bagikan Info Lowongan Ini
            </div>
            <div class="share-btns">
              <button type="button" class="share-btn share-wa" onclick="shareWhatsApp('${safeTitle}', '${safeCompany}', ${job.id})" title="Bagikan ke WhatsApp">
                <i class="fa-brands fa-whatsapp"></i> WhatsApp
              </button>
              <button type="button" class="share-btn share-copy" onclick="copyJobLink(${job.id})" title="Salin Tautan">
                <i class="fa-regular fa-copy"></i> Salin Tautan
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;

  modal.classList.add('active');

  // Initialize auto-sliding carousel if multiple flyer slides exist
  if (isMultiFlyer) {
    initJobFlyerCarousel(job.id, flyerImages);
  }
}


// Notice for Locked / Expired Jobs
window.showLockedNotice = function (jobTitle) {
  showToast('error', `Lowongan untuk posisi "${jobTitle || 'Pekerjaan ini'}" telah berakhir dan dikunci oleh pihak rekruter. Anda tidak dapat membuka detail atau mengajukan lamaran baru.`);
};

// Interactive Checklist Match Score
window.updateMatchScore = function (totalReqs) {
  if (totalReqs <= 0) return;
  const checked = document.querySelectorAll('.check-list-item input[type="checkbox"]:checked').length;
  const pct = Math.round((checked / totalReqs) * 100);

  const fillEl = document.getElementById('match-score-fill');
  const textEl = document.getElementById('match-score-text');

  if (fillEl) fillEl.style.width = pct + '%';
  if (textEl) {
    textEl.textContent = `${checked} / ${totalReqs} Kualifikasi Terpenuhi (${pct}%)`;
    if (pct >= 80) textEl.style.color = 'var(--success)';
    else if (pct >= 50) textEl.style.color = 'var(--primary)';
    else textEl.style.color = '#f59e0b';
  }

  // Strike-through checked items
  document.querySelectorAll('.check-list-item').forEach(item => {
    const cb = item.querySelector('input[type="checkbox"]');
    if (cb && cb.checked) {
      item.classList.add('checked');
    } else {
      item.classList.remove('checked');
    }
  });
};

// Copy Application Template
window.copyApplicationTemplate = function (title, company) {
  const box = document.getElementById('wa-template-box');
  const text = box ? box.textContent : `Halo HRD ${company}, saya bermaksud mengajukan lamaran kerja untuk posisi ${title}. Bersama pesan ini saya siap melampirkan berkas CV saya. Terima kasih.`;
  navigator.clipboard.writeText(text).then(() => {
    showToast('success', 'Template pesan lamaran berhasil disalin ke clipboard.');
  });
};

// Universal Contact & Direct Apply Extractor
function extractJobContacts(job) {
  if (!job) return { whatsapp: '', email: '', website_url: '', direct_apply_url: '', direct_type: 'none' };

  let wa = (job.whatsapp || '').trim();
  let email = (job.email || '').trim();
  let website = (job.website_url || job.official_url || job.url || job.website || '').trim();
  let applyInfo = job.apply_info || '';
  let deadlineDisplay = job.deadline_display || '';

  // Helper to parse JSON safely
  function parseJsonSafely(val) {
    if (!val) return null;
    if (typeof val === 'object') return val;
    const str = String(val).trim();
    if (str.startsWith('{') && str.endsWith('}')) {
      try {
        return JSON.parse(str);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  // 1. If website_url itself is a JSON string, unpack it
  const parsedWeb = parseJsonSafely(website);
  if (parsedWeb) {
    if (parsedWeb.url || parsedWeb.website || parsedWeb.website_url || parsedWeb.link) {
      website = (parsedWeb.url || parsedWeb.website || parsedWeb.website_url || parsedWeb.link).trim();
    }
    if (parsedWeb.whatsapp && !wa) wa = parsedWeb.whatsapp.trim();
    if (parsedWeb.email && !email) email = parsedWeb.email.trim();
  }

  // 2. Parse contact_value
  if (job.contact_value) {
    const parsedContact = parseJsonSafely(job.contact_value);
    if (parsedContact) {
      if ((parsedContact.url || parsedContact.website || parsedContact.website_url || parsedContact.link) && (!website || website.startsWith('{'))) {
        website = (parsedContact.url || parsedContact.website || parsedContact.website_url || parsedContact.link).trim();
      }
      if (parsedContact.whatsapp && !wa) wa = parsedContact.whatsapp.trim();
      if (parsedContact.email && !email) email = parsedContact.email.trim();
      if (parsedContact.apply_info && !applyInfo) applyInfo = parsedContact.apply_info;
      if (parsedContact.deadline_display && !deadlineDisplay) deadlineDisplay = parsedContact.deadline_display;
    } else {
      const raw = String(job.contact_value).trim();
      const type = job.contact_type || '';
      if (type === 'whatsapp' && !wa) wa = raw;
      else if (type === 'email' && !email) email = raw;
      else if ((type === 'link' || type === 'website') && (!website || website.startsWith('{'))) website = raw;
      else {
        if (raw.includes('@') && !email) email = raw;
        else if (raw.match(/^(https?:\/\/|[a-z0-9-]+\.[a-z]{2,})/i) && (!website || website.startsWith('{'))) website = raw;
        else if (raw.match(/^[0-9+ -]{7,20}$/) && !wa) wa = raw;
      }
    }
  }

  // Clean raw JSON string remnants if any still linger in website
  if (website.startsWith('{') && website.includes('http')) {
    const m = website.match(/https?:\/\/[^"\s\\}]+/);
    if (m) website = m[0];
  }

  // If website points to our own portal or localhost, it is NOT the company's apply URL
  const currentHost = (typeof window !== 'undefined' && window.location && window.location.hostname) ? window.location.hostname : '';
  const isSelfPortalUrl = website.includes('job-portal') || website.includes('localhost') || website.includes('127.0.0.1') || website.includes('kitakerja.biz.id') || (currentHost && website.includes(currentHost)) || website.includes('?job=');
  if (isSelfPortalUrl) {
    website = '';
  }

  // If website contains an unresolvable Google News / Bing tracking link or is missing, resolve to direct genuine career portal
  const isGenericNewsUrl = !website || website.startsWith('{') || website.includes('news.google.com') || website.includes('bing.com/news');
  const comp = (job.company_name || '').toLowerCase();
  const title = (job.title || '').toLowerCase();

  if (isGenericNewsUrl) {
    if (comp.includes('bank syariah indonesia') || comp.includes('bsi')) {
      website = 'https://rekrutmen.bankbsi.co.id';
    } else if (comp.includes('kai services') || comp.includes('reska')) {
      website = 'https://karir.reska.id';
    } else if (comp.includes('goto') || comp.includes('gojek') || comp.includes('tokopedia')) {
      website = 'https://careers.gotocompany.com';
    } else if (comp.includes('kai') || comp.includes('kereta api')) {
      website = 'https://recruitment.kai.id';
    } else if (comp.includes('patra drilling') || comp.includes('pdc') || title.includes('patra drilling')) {
      website = 'https://karir.pertamina-pdc.com';
    } else if (comp.includes('bukajobs') || (job.source_platform || '').includes('bukajobs') || (job.source_label || '').includes('bukajobs')) {
      website = 'https://bukajobs.com';
    } else if (comp.includes('bca') || comp.includes('central asia')) {
      website = 'https://karir.bca.co.id';
    } else if (comp.includes('toyota') || comp.includes('tmmin')) {
      website = 'https://recruitment.toyota.co.id';
    } else if (comp.includes('astra honda') || comp.includes('ahm')) {
      website = 'https://recruitment.astra-honda.com';
    } else if (comp.includes('telkom')) {
      website = 'https://careers.telkom.co.id';
    } else if (comp.includes('bri') || comp.includes('rakyat indonesia')) {
      website = 'https://e-recruitment.bri.co.id';
    } else if (comp.includes('mayora')) {
      website = 'https://mayorakarir.com';
    } else if (comp.includes('kalbe')) {
      website = 'https://careers.kalbe.co.id';
    } else if (comp.includes('yamaha')) {
      website = 'https://www.yamaha-motor.co.id/career';
    } else if (comp.includes('indofood') || comp.includes('indolakto')) {
      website = 'https://careers.indofood.com';
    } else if (comp.includes('shopee')) {
      website = 'https://careers.shopee.co.id';
    } else if (comp.includes('krakatau')) {
      website = 'https://krakatausteel.com/career';
    } else if (comp.includes('rhythm')) {
      website = 'https://www.rhythm.co.jp';
    } else if (comp.includes('bumn')) {
      website = 'https://rekrutmenbersama.fhcibumn.id';
    }
  }

  // Ensure website has proper protocol
  if (website && !website.startsWith('http://') && !website.startsWith('https://')) {
    website = `https://${website}`;
  }

  // Determine direct apply URL
  let directApplyUrl = '';
  let directType = 'none';

  if (website) {
    directApplyUrl = website;
    directType = 'website';
  } else if (wa) {
    directApplyUrl = wa;
    directType = 'whatsapp';
  } else if (email) {
    directApplyUrl = email;
    directType = 'email';
  }

  return {
    whatsapp: wa,
    email: email,
    website_url: website,
    direct_apply_url: directApplyUrl,
    direct_type: directType,
    apply_info: applyInfo,
    deadline_display: deadlineDisplay
  };
}

function isMobileDeviceClient() {
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
  const touchCapable = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1 && typeof window !== 'undefined' && window.innerWidth <= 1024;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || touchCapable;
}

function openExternalUrlSafely(url) {
  if (!url) return false;
  let opened = null;
  try {
    opened = window.open(url, '_blank');
    if (opened) {
      try { opened.opener = null; } catch (e) { }
      return true;
    }
  } catch (e) { }

  try {
    window.location.assign(url);
    return true;
  } catch (e) {
    window.location.href = url;
    return true;
  }
}

// 1-Click Direct Apply Launcher (Bypass modal for immediate application)
window.directApplyJob = function (jobId, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  const job = (rawAllJobs || []).find(j => String(j.id) === String(jobId));
  if (!job) {
    showToast('error', 'Data lowongan tidak ditemukan.');
    return;
  }

  if (isJobLocked(job)) {
    showLockedNotice(job.title || 'Lowongan');
    return;
  }

  const contacts = extractJobContacts(job);
  const comp = job.company_name || 'Perusahaan';
  const title = job.title || 'Posisi Lowongan';

  if (contacts.website_url) {
    showToast('info', `Membuka portal pendaftaran resmi ${comp}...`);
    openExternalUrlSafely(contacts.website_url);
  } else if (contacts.whatsapp) {
    showToast('info', `Menghubungkan langsung ke WhatsApp HRD ${comp}...`);
    triggerWhatsAppChat(contacts.whatsapp, comp, title);
  } else if (contacts.email) {
    showToast('info', `Membuka draf lamaran email HRD ${comp}...`);
    triggerEmailApplication(contacts.email, comp, title);
  } else {
    // Fallback to detail modal if no contact channel found
    openJobDetail(jobId);
  }

  // Increment view count safely in background without blocking mobile gesture navigation
  try {
    if (sbClient && job.id) {
      Promise.resolve(
        sbClient.from('jobs').update({ views_count: (job.views_count || 0) + 1 }).eq('id', job.id)
      ).catch(() => { });
    }
  } catch (e) { }
};

// Render Multi-Channel Contact Buttons
function renderContactButton(job) {
  if (isJobLocked(job)) {
    return `
      <div class="locked-contact-card" style="padding: 16px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; text-align: center; margin-bottom: 12px;">
        <i class="fa-solid fa-lock" style="font-size: 1.5rem; color: #ef4444; margin-bottom: 8px;"></i>
        <div style="font-weight: 700; color: #991b1b; font-size: 0.95rem;">Pendaftaran Lowongan Telah Ditutup</div>
        <div style="font-size: 0.8rem; color: #b91c1c; margin-top: 4px;">Batas pengumpulan berkas lamaran telah berakhir pada ${escapeHtml(job.deadline || 'periode sebelumnya')}. Silakan cek lowongan aktif lainnya.</div>
      </div>
    `;
  }

  const contacts = extractJobContacts(job);
  const buttons = [];

  const safeTitle = (job.title || '').replace(/'/g, "\\'");
  const safeCompany = (job.company_name || '').replace(/'/g, "\\'");

  // 1. WhatsApp Button (Direct Web & Mobile trigger)
  if (contacts.whatsapp) {
    buttons.push(`
      <div class="contact-channel-item">
        <button type="button" class="btn-wa-direct" onclick="triggerWhatsAppChat('${contacts.whatsapp}', '${safeCompany}', '${safeTitle}')" title="Hubungi langsung via WhatsApp Web atau Aplikasi">
          <i class="fa-brands fa-whatsapp" style="font-size: 1.2rem;"></i> <span>Hubungi Rekruter via WhatsApp</span>
        </button>
        <div class="contact-address-box">
          <span class="contact-address-label"><i class="fa-brands fa-whatsapp" style="color: #16a34a;"></i> No. WA:</span>
          <span class="contact-address-val">${escapeHtml(contacts.whatsapp)}</span>
          <button type="button" class="contact-address-copy" onclick="copyToClipboard('${contacts.whatsapp}', 'Nomor WhatsApp berhasil disalin ke clipboard')" title="Salin Nomor WA">
            <i class="fa-regular fa-copy"></i> Salin
          </button>
        </div>
      </div>
    `);
  }

  // 2. Email Button (Clean non-overflow label + wrapped email pill + Quick Providers)
  if (contacts.email) {
    buttons.push(`
      <div class="contact-channel-item">
        <button type="button" class="btn-email-direct" onclick="triggerEmailApplication('${contacts.email}', '${safeCompany}', '${safeTitle}')" title="Klik untuk langsung membuka Gmail Web & mengisi draf lamaran ke ${escapeHtml(contacts.email)}">
          <i class="fa-solid fa-envelope" style="font-size: 1.1rem;"></i> <span>Kirim Lamaran via Email</span>
        </button>
        <div class="contact-address-box contact-address-email">
          <span class="contact-address-label"><i class="fa-regular fa-envelope"></i> Tujuan:</span>
          <span class="contact-address-val" title="${escapeHtml(contacts.email)}">${escapeHtml(contacts.email)}</span>
          <button type="button" class="contact-address-copy" onclick="copyToClipboard('${contacts.email}', 'Alamat email rekruter berhasil disalin ke clipboard')" title="Salin Alamat Email">
            <i class="fa-regular fa-copy"></i> Salin
          </button>
        </div>
        <div class="email-providers-quick-row">
          <span class="ep-label"><i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.68rem;"></i> Buka di:</span>
          <button type="button" class="ep-pill ep-gmail" onclick="openWebmail('gmail', '${contacts.email}', '${safeCompany}', '${safeTitle}')" title="Buka Gmail Web">
            <i class="fa-brands fa-google" style="color: #ea4335;"></i> Gmail
          </button>
          <button type="button" class="ep-pill ep-outlook" onclick="openWebmail('outlook', '${contacts.email}', '${safeCompany}', '${safeTitle}')" title="Buka Outlook / Hotmail Web">
            <i class="fa-brands fa-microsoft" style="color: #0078d4;"></i> Outlook
          </button>
          <button type="button" class="ep-pill ep-yahoo" onclick="openWebmail('yahoo', '${contacts.email}', '${safeCompany}', '${safeTitle}')" title="Buka Yahoo Mail">
            <i class="fa-brands fa-yahoo" style="color: #6001d2;"></i> Yahoo
          </button>
          <button type="button" class="ep-pill ep-client" onclick="openWebmail('mailto', '${contacts.email}', '${safeCompany}', '${safeTitle}')" title="Buka Aplikasi Email Bawaan PC/HP">
            <i class="fa-solid fa-laptop"></i> App
          </button>
          <button type="button" class="ep-pill ep-copy" onclick="copyToClipboard('${contacts.email}', 'Alamat email rekruter berhasil disalin ke clipboard')" title="Salin Alamat Email">
            <i class="fa-regular fa-copy"></i> Salin
          </button>
        </div>
      </div>
    `);
  }

  // 3. Website / Portal / Medsos Direct Link Button (Prominent & High-Trust)
  if (contacts.website_url) {
    const webUrl = contacts.website_url.startsWith('http') ? contacts.website_url : `https://${contacts.website_url}`;
    const sp = (job.source_platform || '').toLowerCase();
    const compLower = (job.company_name || '').toLowerCase();
    let btnClass = 'btn-web-direct';
    let btnIcon = 'fa-solid fa-arrow-up-right-from-square';
    let btnText = 'Lamar di Website Resmi Perusahaan';

    if (webUrl.includes('bukajobs.com') || sp === 'bukajobs') {
      btnClass = 'btn-web-direct btn-bukajobs-direct';
      btnIcon = 'fa-solid fa-arrow-up-right-from-square';
      btnText = 'Lamar Langsung di Bukajobs';
    } else if (webUrl.includes('pertamina-pdc.com') || compLower.includes('patra drilling') || compLower.includes('pdc')) {
      btnClass = 'btn-web-direct btn-pertamina-direct';
      btnIcon = 'fa-solid fa-arrow-up-right-from-square';
      btnText = 'Lamar di Portal Rekrutmen PDC';
    } else if (webUrl.includes('karir.bca.co.id') || compLower.includes('bca')) {
      btnClass = 'btn-web-direct btn-bca-direct';
      btnIcon = 'fa-solid fa-arrow-up-right-from-square';
      btnText = 'Lamar di Portal Karir BCA';
    } else if (webUrl.includes('linkedin.com') || sp === 'linkedin') {
      btnClass = 'btn-web-direct btn-linkedin-direct';
      btnIcon = 'fa-brands fa-linkedin';
      btnText = 'Buka Lowongan Resmi di LinkedIn';
    } else if (webUrl.includes('instagram.com') || sp === 'instagram') {
      btnClass = 'btn-web-direct btn-instagram-direct';
      btnIcon = 'fa-brands fa-instagram';
      btnText = 'Buka Lowongan Resmi di Instagram';
    } else if (webUrl.includes('facebook.com') || sp === 'facebook') {
      btnClass = 'btn-web-direct btn-facebook-direct';
      btnIcon = 'fa-brands fa-facebook';
      btnText = 'Buka Lowongan Resmi di Facebook';
    }

    buttons.push(`
      <div style="width: 100%;">
        <a href="${webUrl}" target="_blank" rel="noopener noreferrer" class="${btnClass}" title="${btnText} (${escapeHtml(job.company_name)})">
          <i class="${btnIcon}"></i> ${btnText}
        </a>
        <div style="margin-top: 6px; font-size: 0.74rem; color: #047857; text-align: center; display: flex; align-items: center; justify-content: center; gap: 5px;">
          <i class="fa-solid fa-shield-check"></i> Tautan Resmi & Langsung ke Portal Rekrutmen Terverifikasi
        </div>
      </div>
    `);
  }

  if (buttons.length > 0) {
    return `<div class="modal-contact-channels">${buttons.join('')}</div>`;
  }

  return `
    <button type="button" class="btn btn-primary" style="width: 100%; padding: 14px; font-size: 1rem;" onclick="copyJobLink(${job.id})">
      <i class="fa-solid fa-share-nodes"></i> Bagikan Lowongan Ini
    </button>
  `;
}

// Reliable WhatsApp Chat Launcher
window.triggerWhatsAppChat = function (phone, companyName, jobTitle) {
  if (!phone) {
    showToast('error', 'Nomor WhatsApp perekrut tidak tersedia.');
    return;
  }

  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  } else if (clean.startsWith('8')) {
    clean = '62' + clean;
  } else if (!clean.startsWith('62') && clean.length <= 11) {
    clean = '62' + clean;
  }

  const textMsg = encodeURIComponent(
    `Halo Bapak/Ibu HRD ${companyName || 'Perusahaan'},\n\nPerkenalkan saya [Nama Anda]. Saya bermaksud mengajukan lamaran kerja untuk posisi ${jobTitle || 'Pekerjaan'}.\n\nBersama pesan ini, saya siap melampirkan berkas CV dan Portofolio terbaru saya sebagai bahan pertimbangan.\n\nMohon informasi mengenai tahapan proses seleksi selanjutnya. Terima kasih banyak atas perhatian dan kesempatannya.`
  );

  const waUrl = `https://api.whatsapp.com/send?phone=${clean}&text=${textMsg}`;
  openExternalUrlSafely(waUrl);
};

function buildEmailApplyDraft(companyName, jobTitle) {
  const subject = `Lamaran Pekerjaan: ${jobTitle || 'Posisi'} - [Nama Anda]`;
  const body = `Halo Tim HRD / Rekrutmen ${companyName || 'Perusahaan'},\n\nPerkenalkan saya [Nama Anda]. Saya bermaksud mengajukan lamaran kerja untuk posisi ${jobTitle || 'Pekerjaan'}.\n\nBersama email ini saya melampirkan berkas Curriculum Vitae (CV) dan Portofolio terbaru saya untuk dijadikan bahan pertimbangan.\n\nBesar harapan saya untuk dapat mengikuti tahapan proses seleksi selanjutnya. Terima kasih banyak atas waktu dan kesempatan yang diberikan.\n\nSalam hormat,\n[Nama Anda]\n[Nomor WhatsApp / Kontak]`;
  return { subject, body };
}

function openNativeMailtoClient(email, companyName, jobTitle) {
  const cleanEmail = String(email || '').trim();
  if (!cleanEmail) return;
  const { subject, body } = buildEmailApplyDraft(companyName, jobTitle);
  const mailtoUrl = `mailto:${cleanEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const link = document.createElement('a');
  link.href = mailtoUrl;
  link.style.display = 'none';
  document.body.appendChild(link);
  try {
    link.click();
  } catch (e) {
    window.location.href = mailtoUrl;
  }
  link.remove();
  showToast('info', `Membuka aplikasi Email/Gmail perangkat Anda ke ${cleanEmail}...`);
}

// Direct Webmail Home Launcher (Gmail Desktop, Native Mailto on Mobile/HP, Outlook, Yahoo)
window.openWebmail = function (provider, email, companyName, jobTitle) {
  const cleanEmail = String(email || '').trim();
  if (!cleanEmail) {
    showToast('error', 'Alamat email rekruter tidak tersedia.');
    return;
  }

  // Native Mailto: reliable on mobile phones (where desktop Gmail Web ?view=cm fails) or when 'mailto' chosen
  if (provider === 'mailto' || (provider === 'gmail' && isMobileDeviceClient())) {
    openNativeMailtoClient(cleanEmail, companyName, jobTitle);
    return;
  }

  const { subject, body } = buildEmailApplyDraft(companyName, jobTitle);
  const encEmail = encodeURIComponent(cleanEmail);
  const encSub = encodeURIComponent(subject);
  const encBody = encodeURIComponent(body);

  let targetUrl = '';
  let providerName = '';

  if (provider === 'gmail') {
    targetUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encEmail}&su=${encSub}&body=${encBody}`;
    providerName = 'Gmail Web';
  } else if (provider === 'outlook') {
    targetUrl = `https://outlook.live.com/mail/0/deeplink/compose?to=${encEmail}&subject=${encSub}&body=${encBody}`;
    providerName = 'Outlook / Hotmail Web';
  } else if (provider === 'yahoo') {
    targetUrl = `https://compose.mail.yahoo.com/?to=${encEmail}&subj=${encSub}&body=${encBody}`;
    providerName = 'Yahoo Mail Web';
  }

  if (targetUrl) {
    openExternalUrlSafely(targetUrl);
    showToast('success', `Membuka ${providerName} untuk lamaran ke ${cleanEmail}...`);
  }
};

window.triggerEmailApplication = function (email, companyName, jobTitle) {
  // Mobile/HP -> Native Mailto (Gmail App / Apple Mail); Desktop/PC -> Gmail Web Compose
  if (isMobileDeviceClient()) {
    window.openWebmail('mailto', email, companyName, jobTitle);
  } else {
    window.openWebmail('gmail', email, companyName, jobTitle);
  }
};

// Clipboard Helper
window.copyToClipboard = function (text, successMsg) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showToast('info', successMsg || 'Berhasil disalin ke clipboard.');
  }).catch(() => {
    showToast('info', text);
  });
};

// Sharing helpers
function shareWhatsApp(title, company, id) {
  const url = id ? (window.location.origin + window.location.pathname + `?job=${id}`) : window.location.href;
  const text = encodeURIComponent(`*INFORMASI LOWONGAN KERJA RESMI*\n\nPosisi: *${title}*\nPerusahaan: *${company || '-'}*\n\nLihat poster dan kontak perekrut resmi di:\n${url}`);
  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank', 'noopener,noreferrer');
}

function copyJobLink(id) {
  const url = window.location.origin + window.location.pathname + `?job=${id}`;
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    navigator.clipboard.writeText(url).then(() => {
      showToast('info', 'Tautan info lowongan berhasil disalin ke clipboard.');
    }).catch(() => {
      window.prompt('Salin tautan lowongan ini:', url);
    });
  } else {
    window.prompt('Salin tautan lowongan ini:', url);
  }
}

function formatTimeAgo(dateString) {
  if (!dateString) return 'Baru saja';
  const now = new Date();
  const date = new Date(dateString);
  const diffInSec = Math.floor((now - date) / 1000);

  if (diffInSec < 60) return 'Baru saja';
  const diffInMin = Math.floor(diffInSec / 60);
  if (diffInMin < 60) return `${diffInMin} mnt lalu`;
  const diffInHour = Math.floor(diffInSec / 60);
  if (diffInHour < 24) return `${diffInHour} jam lalu`;
  const diffInDays = Math.floor(diffInHour / 24);
  if (diffInDays === 1) return 'Kemarin';
  if (diffInDays < 30) return `${diffInDays} hari lalu`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(type, message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  let icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-circle-exclamation';
  if (type === 'info') icon = 'fa-circle-info';

  toast.innerHTML = `
    <i class="fa-solid ${icon}" style="font-size: 1.2rem;"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==============================================================
// SMART AI CV MATCHER IMPLEMENTATION
// ==============================================================
window.activeCvKeywords = null;

const SKILL_KEYWORDS_DICT = [
  'react', 'vue', 'angular', 'node', 'nodejs', 'express', 'javascript', 'typescript', 'php', 'laravel',
  'python', 'django', 'fastapi', 'java', 'spring', 'kotlin', 'flutter', 'android', 'ios', 'swift',
  'html', 'css', 'tailwind', 'bootstrap', 'sass', 'sql', 'mysql', 'postgresql', 'postgres', 'mongodb',
  'redis', 'docker', 'kubernetes', 'aws', 'cloud', 'git', 'github', 'api', 'rest api', 'graphql',
  'ui', 'ux', 'ui/ux', 'figma', 'adobe', 'photoshop', 'illustrator', 'canva', 'prototyping', 'design system',
  'marketing', 'digital marketing', 'social media', 'content creator', 'copywriter', 'copywriting', 'seo', 'sem',
  'meta ads', 'facebook ads', 'instagram ads', 'tiktok ads', 'google ads', 'sales', 'business development',
  'data', 'data analyst', 'data science', 'machine learning', 'deep learning', 'ai', 'prompt engineering', 'llm',
  'excel', 'powerbi', 'tableau', 'accounting', 'finance', 'administrasi', 'customer service', 'support', 'hr', 'hrd',
  'operator produksi', 'warehouse', 'gudang', 'forklift', 'quality control', 'qc', 'qa', 'ppic', 'teknisi',
  'welder', 'cnc', 'wms', 'k3', 'hse', 'logistik', 'supply chain', 'microsoft office', 'maintenance', 'elektrik'
];

const STOPWORDS = new Set([
  'dan', 'atau', 'untuk', 'dengan', 'yang', 'dari', 'pada', 'dalam', 'sebagai', 'staff', 'staf',
  'junior', 'senior', 'lead', 'officer', 'specialist', 'associate', 'intern', 'magang', 'lowongan',
  'kerja', 'terbaru', 'bumn', 'swasta', 'resmi', 'tahun', '2025', '2026', 'full', 'time', 'part'
]);

function setupCvMatcher() {
  const dropzone = document.getElementById('cv-dropzone');
  const fileInput = document.getElementById('cv-file-input');
  const browseBtn = document.getElementById('btn-browse-cv');
  const pasteInput = document.getElementById('cv-paste-input');
  const analyzeBtn = document.getElementById('btn-analyze-cv');
  const resetCvBtn = document.getElementById('btn-reset-cv');

  if (browseBtn && fileInput) {
    browseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', (e) => {
      if (e.target === fileInput || e.target.closest('#btn-browse-cv')) return;
      fileInput.click();
    });

    // Drag & Drop
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.style.borderColor = 'var(--primary)';
        dropzone.style.background = 'rgba(99, 102, 241, 0.12)';
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.style.borderColor = '';
        dropzone.style.background = '';
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        handleCvFileUpload(files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleCvFileUpload(e.target.files[0]);
      }
    });
  }

  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', () => {
      const text = pasteInput ? pasteInput.value.trim() : '';
      if (!text) {
        showToast('error', 'Silakan tempel ringkasan CV / resume atau unggah file dokumen Anda terlebih dahulu.');
        return;
      }
      runCvAnalysis(text, 'Teks Input Resume');
    });
  }

  if (resetCvBtn) {
    resetCvBtn.addEventListener('click', () => {
      resetCvMatcher();
    });
  }
}

async function handleCvFileUpload(file) {
  const titleEl = document.getElementById('cv-drop-title');
  const subtitleEl = document.getElementById('cv-drop-subtitle');
  if (titleEl) titleEl.textContent = `Memproses: ${file.name}...`;
  if (subtitleEl) subtitleEl.textContent = 'Mengekstrak teks & menganalisis keahlian dengan AI...';

  try {
    let text = '';
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'pdf') {
      if (window.pdfjsLib) {
        if (window.pdfjsLib.GlobalWorkerOptions && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = './vendor/pdfjs/pdf.worker.min.js';
        }
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        const maxPages = Math.min(pdf.numPages, 5);
        for (let i = 1; i <= maxPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          fullText += pageText + ' ';
        }
        text = fullText;
      } else {
        text = await file.text();
      }
    } else if (ext === 'txt') {
      text = await file.text();
    } else {
      try {
        text = await file.text();
      } catch (e) {
        text = file.name.replace(/[^a-zA-Z0-9 ]/g, ' ');
      }
    }

    if (!text || text.trim().length < 20) {
      text = file.name.replace(/[^a-zA-Z0-9 ]/g, ' ');
    }

    if (titleEl) titleEl.textContent = `Dokumen: ${file.name}`;
    if (subtitleEl) subtitleEl.textContent = 'Analisis selesai! Lowongan telah diurutkan berdasarkan relevansi.';
    const pasteInput = document.getElementById('cv-paste-input');
    if (pasteInput && text.length > 30) {
      pasteInput.value = text.slice(0, 300) + '...';
    }

    runCvAnalysis(text, file.name);
  } catch (err) {
    console.error('CV File Read Error:', err);
    if (titleEl) titleEl.textContent = 'Gagal membaca isi dokumen otomatis';
    if (subtitleEl) subtitleEl.textContent = 'Silakan coba tempel (paste) teks CV Anda pada kolom di bawah.';
    showToast('error', 'Gagal memindai berkas otomatis. Silakan tempel teks CV Anda pada kolom teks di bawah.');
  }
}

function runCvAnalysis(rawText, sourceName) {
  const lower = (rawText || '').toLowerCase();

  // Detect candidate skills
  const candidateSkills = [];
  SKILL_KEYWORDS_DICT.forEach(skill => {
    const regex = new RegExp(`(^|[^a-z0-9])${skill.replace(/[+*?^$.()|[\]{}\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i');
    if (regex.test(lower)) {
      candidateSkills.push(skill);
    }
  });

  // Calculate score for each job
  let matchCount = 0;
  rawAllJobs.forEach(job => {
    const jobText = [
      job.title,
      job.category,
      job.job_type,
      job.location,
      job.description,
      Array.isArray(job.requirements) ? job.requirements.join(' ') : job.requirements,
      Array.isArray(job.responsibilities) ? job.responsibilities.join(' ') : job.responsibilities
    ].join(' ').toLowerCase();

    const matchedForThisJob = [];
    candidateSkills.forEach(skill => {
      const reg = new RegExp(`(^|[^a-z0-9])${skill.replace(/[+*?^$.()|[\]{}\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i');
      if (reg.test(jobText)) {
        matchedForThisJob.push(skill);
      }
    });

    // STRICT SCORING: Only score jobs with genuine skill or role title match
    const titleWords = (job.title || '').toLowerCase().split(/[\s/&-]+/).filter(w => w.length >= 4 && !STOPWORDS.has(w));
    const hasTitleWord = titleWords.some(w => lower.includes(w));

    if (matchedForThisJob.length === 0 && !hasTitleWord) {
      job._matchScore = 0;
      job._matchedSkills = [];
      return;
    }

    let score = 0;
    if (matchedForThisJob.length > 0) {
      score += Math.min(matchedForThisJob.length * 18, 55);
    }
    if (hasTitleWord) {
      score += 30;
    }
    if (job.category && lower.includes(job.category.toLowerCase().split('&')[0].trim())) {
      score += 10;
    }

    score = Math.min(Math.max(score, 45), 98);
    job._matchScore = score;
    job._matchedSkills = matchedForThisJob.slice(0, 5);

    if (job._matchScore >= 45) matchCount++;
  });

  window.activeCvKeywords = candidateSkills;

  // Show Match Status Bar
  const statusBar = document.getElementById('cv-match-status-bar');
  const statusTitle = document.getElementById('cv-match-title');
  const statusSubtitle = document.getElementById('cv-match-subtitle');
  if (statusBar) {
    statusBar.style.display = 'flex';
    if (statusTitle) statusTitle.textContent = `Analisis CV Selesai (${candidateSkills.length} Keahlian Terdeteksi)`;
    if (statusSubtitle) {
      statusSubtitle.textContent = `Menemukan ${matchCount} lowongan relevan dengan profil Anda dari ${sourceName || 'dokumen'}. Diurutkan dari yang paling cocok.`;
    }
  }

  showToast('success', `CV berhasil dianalisis! Menampilkan lowongan teratas yang paling sesuai.`);
  applyFiltersAndRender();

  // Scroll to lowongan
  const lowonganSec = document.getElementById('lowongan');
  if (lowonganSec) {
    lowonganSec.scrollIntoView({ behavior: 'smooth' });
  }
}

function resetCvMatcher() {
  window.activeCvKeywords = null;
  rawAllJobs.forEach(j => {
    delete j._matchScore;
    delete j._matchedSkills;
  });

  const statusBar = document.getElementById('cv-match-status-bar');
  if (statusBar) statusBar.style.display = 'none';

  const titleEl = document.getElementById('cv-drop-title');
  const subtitleEl = document.getElementById('cv-drop-subtitle');
  if (titleEl) titleEl.textContent = 'Pilih Berkas CV Anda (PDF, DOCX, TXT)';
  if (subtitleEl) subtitleEl.textContent = 'Klik di sini untuk menjelajah dokumen atau seret & lepas berkas langsung ke area ini';

  const pasteInput = document.getElementById('cv-paste-input');
  if (pasteInput) pasteInput.value = '';

  const fileInput = document.getElementById('cv-file-input');
  if (fileInput) fileInput.value = '';

  showToast('info', 'Filter CV telah direset. Menampilkan urutan default.');
  applyFiltersAndRender();
}
