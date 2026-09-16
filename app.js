const GROUPS = {
  missbruk: { label: 'Grupp 1', title: 'Missbruks- och beroendevård' },
  forlossning: { label: 'Grupp 2', title: 'Förlossningsvård' },
  overgang: { label: 'Grupp 3', title: 'Övergång till vuxensjukvård' }
};

function siteBase() {
  if (location.protocol === 'http:' || location.protocol === 'https:') {
    const u = new URL(location.href);
    u.search = '';
    u.hash = '';
    return u.href;
  }
  return 'https://mihagley.github.io/Sep-registerdata-workshop/';
}

function urlFor(params = {}) {
  const u = new URL(siteBase());
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') u.searchParams.set(key, value);
  });
  return u.href;
}

function groupUrl(key) {
  return urlFor({ uppgift: key });
}

function navigate(params = {}) {
  const u = new URL(siteBase());
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') u.searchParams.set(key, value);
  });
  history.pushState({}, '', u.pathname + u.search + u.hash);
  render();
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function showHome() { navigate(); }
function showFacilitator() { navigate({ ledare: '1' }); }
function showGroup(key) { navigate({ uppgift: key }); }
function openReference(filter = 'all', from = '') { navigate({ referens: filter, from }); }
function openExample(from = '') { navigate({ exempel: '1', from }); }

function backFromReference() {
  const from = new URLSearchParams(location.search).get('from');
  if (from && GROUPS[from]) showGroup(from); else showHome();
}

function backFromExample() {
  const from = new URLSearchParams(location.search).get('from');
  if (from && GROUPS[from]) showGroup(from); else showHome();
}

function setStatus(message) {
  const el = document.getElementById('status');
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  clearTimeout(window.__statusTimer);
  window.__statusTimer = setTimeout(() => { el.hidden = true; }, 1600);
}

async function copyText(text, successMessage = 'Länken är kopierad') {
  try {
    await navigator.clipboard.writeText(text);
    setStatus(successMessage);
  } catch (err) {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    document.body.removeChild(area);
    setStatus(successMessage);
  }
}

function copyGroupLink(key) { copyText(groupUrl(key)); }
function printPage() { window.print(); }

function setReferenceFilter(filter) {
  const valid = ['missbruk', 'forlossning', 'overgang', 'all'];
  if (!valid.includes(filter)) filter = 'all';

  document.querySelectorAll('[data-filter]').forEach(btn => {
    const active = btn.dataset.filter === filter;
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  document.querySelectorAll('.register-card').forEach(card => {
    const groups = (card.dataset.groups || '').split(/\s+/).filter(Boolean);
    card.hidden = filter !== 'all' && !groups.includes(filter);
  });

  document.querySelectorAll('.source-category').forEach(section => {
    const visible = [...section.querySelectorAll('.register-card')].some(card => !card.hidden);
    section.hidden = !visible;
  });

  const title = document.getElementById('reference-filter-title');
  if (title) {
    title.textContent = filter === 'all' ? 'Alla källor' : `Relevanta källor för ${GROUPS[filter].label}`;
  }
}

function buildQRCodes() {
  document.querySelectorAll('[data-qr-group]').forEach(box => {
    const key = box.dataset.qrGroup;
    box.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
      new QRCode(box, { text: groupUrl(key), width: 150, height: 150, correctLevel: QRCode.CorrectLevel.M });
    } else {
      box.textContent = 'QR-koden kunde inte laddas. Använd direktlänken nedan.';
    }
  });
  document.querySelectorAll('[data-url-group]').forEach(el => {
    el.textContent = groupUrl(el.dataset.urlGroup);
  });
}

function render() {
  const params = new URLSearchParams(location.search);
  const group = params.get('uppgift');
  const reference = params.get('referens');
  const facilitator = params.get('ledare');
  const example = params.get('exempel');

  document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));

  let activeId = 'landing';
  let title = 'Workshop – Registerdataanalys';

  if (facilitator === '1') {
    activeId = 'facilitator';
    title = 'Workshopledare – Registerdataanalys';
  } else if (reference) {
    activeId = 'reference';
    title = 'Registerreferens – Registerdataanalys';
  } else if (example === '1') {
    activeId = 'example';
    title = 'Analogt exempel – Registerdataanalys';
  } else if (group && GROUPS[group]) {
    activeId = group;
    title = `${GROUPS[group].label}: ${GROUPS[group].title}`;
  }

  const active = document.getElementById(activeId);
  if (active) active.classList.add('active');
  document.title = title;

  if (activeId === 'reference') {
    setReferenceFilter(reference || 'all');
    const from = params.get('from');
    const back = document.getElementById('reference-back-label');
    if (back) back.textContent = from && GROUPS[from] ? `← Tillbaka till ${GROUPS[from].label}` : '← Till startsidan';
  }

  if (activeId === 'facilitator') buildQRCodes();
}

window.addEventListener('popstate', render);
window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => setReferenceFilter(btn.dataset.filter));
  });
  render();
});

window.showHome = showHome;
window.showFacilitator = showFacilitator;
window.showGroup = showGroup;
window.openReference = openReference;
window.openExample = openExample;
window.backFromReference = backFromReference;
window.backFromExample = backFromExample;
window.copyGroupLink = copyGroupLink;
window.printPage = printPage;
