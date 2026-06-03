/**
 * illustrations.js — Illustrations légères pour les anecdotes.
 * Utilise une image directe si elle est fiable, sinon génère un SVG local.
 */

const CATEGORY_STYLES = [
  {
    match: ['sport', 'loisirs'],
    label: 'Sport',
    bg: ['#EFE4D2', '#F6EFE3', '#D9B54A'],
    accent: '#2F766D',
    motif: 'terrain',
  },
  {
    match: ['histoire', 'géographie', 'geographie', 'monde', 'international'],
    label: 'Géographie',
    bg: ['#EFE4D2', '#F7F1E8', '#B8D1D2'],
    accent: '#B8482A',
    motif: 'cartes',
  },
  {
    match: ['arts', 'médias', 'medias', 'culture', 'prix'],
    label: 'Arts',
    bg: ['#EFE4D2', '#FFF7ED', '#8A7BB8'],
    accent: '#D46A3D',
    motif: 'scene',
  },
  {
    match: ['sciences', 'nature', 'technologie', 'santé', 'sante', 'espace'],
    label: 'Sciences',
    bg: ['#E8F0EC', '#F6F3EA', '#7BA6A8'],
    accent: '#2F766D',
    motif: 'orbites',
  },
  {
    match: ['société', 'societe', 'politique', 'économie', 'economie'],
    label: 'Société',
    bg: ['#EFE4D2', '#F7EEE0', '#C8895C'],
    accent: '#4A3A2A',
    motif: 'ville',
  },
];

const DEFAULT_STYLE = {
  label: 'Quiz',
  bg: ['#EFE4D2', '#F7F0E6', '#D8C9B5'],
  accent: '#B8482A',
  motif: 'cartes',
};

function cleanText(value, max = 34) {
  return String(value || 'Le saviez-vous ?')
    .replace(/[&<>"']/g, '')
    .trim()
    .slice(0, max);
}

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function styleForQuestion(question = {}) {
  const haystack = normalize(`${question.cat || ''} ${question.category || ''} ${question.categorie || ''}`);
  return CATEGORY_STYLES.find(style => style.match.some(word => haystack.includes(normalize(word)))) || DEFAULT_STYLE;
}

function isDirectImageUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url, location.href);
    const path = parsed.pathname.toLowerCase();
    if (parsed.hostname.includes('commons.wikimedia.org') && path.includes('/wiki/')) return false;
    if (parsed.hostname.includes('wikimedia.org') && path.includes('special:mediasearch')) return false;
    return (
      /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(path) ||
      parsed.hostname.includes('images.unsplash.com') ||
      parsed.hostname.includes('source.unsplash.com')
    );
  } catch(e) {
    return false;
  }
}

function motifSvg(type, accent) {
  if (type === 'terrain') {
    return `
      <path d="M90 78h720v364H90z" fill="none" stroke="${accent}" stroke-width="8" opacity=".18"/>
      <circle cx="450" cy="260" r="86" fill="none" stroke="${accent}" stroke-width="8" opacity=".16"/>
      <path d="M450 78v364M90 260h720" stroke="${accent}" stroke-width="6" opacity=".12"/>`;
  }
  if (type === 'scene') {
    return `
      <path d="M120 394h660" stroke="${accent}" stroke-width="10" stroke-linecap="round" opacity=".22"/>
      <path d="M190 130l120 264M710 130L590 394" stroke="${accent}" stroke-width="7" opacity=".14"/>
      <circle cx="260" cy="180" r="52" fill="${accent}" opacity=".13"/>
      <circle cx="640" cy="180" r="52" fill="${accent}" opacity=".13"/>`;
  }
  if (type === 'orbites') {
    return `
      <circle cx="450" cy="260" r="44" fill="${accent}" opacity=".22"/>
      <ellipse cx="450" cy="260" rx="270" ry="92" fill="none" stroke="${accent}" stroke-width="8" opacity=".15"/>
      <ellipse cx="450" cy="260" rx="270" ry="92" fill="none" stroke="${accent}" stroke-width="8" opacity=".12" transform="rotate(58 450 260)"/>
      <circle cx="642" cy="204" r="18" fill="${accent}" opacity=".45"/>`;
  }
  if (type === 'ville') {
    return `
      <path d="M154 404V250h78v154M262 404V190h98v214M390 404V236h72v168M500 404V158h112v246M650 404V226h96v178" fill="${accent}" opacity=".13"/>
      <path d="M120 404h660" stroke="${accent}" stroke-width="9" stroke-linecap="round" opacity=".2"/>`;
  }
  return `
    <path d="M98 338C210 174 334 158 470 268s248 94 334-72" fill="none" stroke="${accent}" stroke-width="10" stroke-linecap="round" opacity=".16"/>
    <path d="M96 214C220 96 354 124 468 214s216 122 338 20" fill="none" stroke="${accent}" stroke-width="8" stroke-linecap="round" opacity=".12"/>
    <circle cx="690" cy="148" r="84" fill="${accent}" opacity=".12"/>`;
}

function makeQuestionIllustrationUrl(question = {}) {
  const style = styleForQuestion(question);
  const answer = question.opts?.[question.c] || question.wikidataLabel || question.reponseCorrecte || question.imageAlt || style.label;
  const title = cleanText(answer);
  const cat = cleanText((question.cat || style.label).split('·')[0], 24).toUpperCase();
  const [a, b, c] = style.bg;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 520" role="img" aria-label="${title}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="${a}"/>
          <stop offset=".55" stop-color="${b}"/>
          <stop offset="1" stop-color="${c}"/>
        </linearGradient>
        <pattern id="grain" width="92" height="92" patternUnits="userSpaceOnUse" patternTransform="rotate(34)">
          <rect width="36" height="92" fill="rgba(30,22,12,.045)"/>
        </pattern>
      </defs>
      <rect width="900" height="520" rx="34" fill="url(#bg)"/>
      <rect width="900" height="520" fill="url(#grain)"/>
      ${motifSvg(style.motif, style.accent)}
      <rect x="56" y="62" width="260" height="46" rx="23" fill="rgba(255,253,248,.72)" stroke="rgba(30,22,12,.08)"/>
      <text x="82" y="92" fill="#6f5a41" font-family="Verdana, sans-serif" font-size="16" font-weight="900" letter-spacing="5">${cat}</text>
      <text x="70" y="302" fill="#211911" font-family="Georgia, serif" font-size="60" font-weight="900">${title}</text>
      <path d="M70 336h360" stroke="${style.accent}" stroke-width="8" stroke-linecap="round" opacity=".78"/>
      <text x="70" y="390" fill="#6f5a41" font-family="Verdana, sans-serif" font-size="18" font-weight="800" letter-spacing="7">LE SAVIEZ-VOUS ?</text>
    </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function getQuestionIllustration(question = {}) {
  const direct = isDirectImageUrl(question.imageUrl) ? question.imageUrl : '';
  const credit = [question.imageCredit, question.imageSource]
    .filter(Boolean)
    .join(' / ');
  return {
    url: direct || makeQuestionIllustrationUrl(question),
    alt: question.imageAlt || question.opts?.[question.c] || question.cat || 'Illustration de la question',
    credit,
    source: question.imageSource || '',
    license: question.imageLicense || '',
    generated: !direct,
  };
}

function stripHtml(value) {
  const div = document.createElement('div');
  div.innerHTML = String(value || '');
  return div.textContent.trim();
}

function cacheKey(question = {}) {
  const keyword = question.imageKeyword || question.imageAlt || question.opts?.[question.c] || question.cat || question.q || '';
  return `qpuc_img_${normalize(keyword).replace(/[^a-z0-9]+/g, '_').slice(0, 80)}`;
}

function isUsableCommonsResult(page) {
  const info = page?.imageinfo?.[0];
  if (!info?.thumburl && !info?.url) return false;
  const mime = String(info.mime || '');
  return mime.startsWith('image/') && !mime.includes('svg');
}

async function fetchCommonsIllustration(question = {}) {
  const keyword = question.imageKeyword || question.imageAlt || question.opts?.[question.c] || question.q;
  if (!keyword) return null;

  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrnamespace: '6',
    gsrsearch: String(keyword),
    gsrlimit: '8',
    prop: 'imageinfo',
    iiprop: 'url|mime|extmetadata',
    iiurlwidth: '900',
  });

  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { cache: 'force-cache' });
  if (!response.ok) return null;
  const data = await response.json();
  const pages = Object.values(data.query?.pages || {});
  const page = pages.find(isUsableCommonsResult);
  const info = page?.imageinfo?.[0];
  if (!info) return null;

  const meta = info.extmetadata || {};
  const artist = stripHtml(meta.Artist?.value || meta.Credit?.value || '');
  const license = stripHtml(meta.LicenseShortName?.value || meta.UsageTerms?.value || '');
  const objectName = stripHtml(meta.ObjectName?.value || page.title || '');

  return {
    url: info.thumburl || info.url,
    alt: question.imageAlt || objectName || question.opts?.[question.c] || 'Illustration de la question',
    credit: [artist || 'Wikimedia Commons', 'Wikimedia Commons'].filter(Boolean).join(' / '),
    source: 'Wikimedia Commons',
    license,
    generated: false,
  };
}

async function resolveQuestionIllustration(question = {}) {
  const direct = getQuestionIllustration(question);
  if (!direct.generated) return direct;

  const key = cacheKey(question);
  try {
    const cached = sessionStorage.getItem(key);
    if (cached) return JSON.parse(cached);
  } catch(e) {}

  try {
    const commons = await fetchCommonsIllustration(question);
    if (commons?.url) {
      try { sessionStorage.setItem(key, JSON.stringify(commons)); } catch(e) {}
      return commons;
    }
  } catch(e) {}

  return direct;
}

export { getQuestionIllustration, resolveQuestionIllustration, makeQuestionIllustrationUrl, isDirectImageUrl };
