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
  window.__statusTimer = window.setTimeout(() => { el.hidden = true; }, 1600);
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

function replaceVisibleText(oldText, newText) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    if (node.nodeValue.includes(oldText)) {
      node.nodeValue = node.nodeValue.replaceAll(oldText, newText);
    }
  });
}

function addWorkshopEnhancements() {
  // Den tidigare "Gemensam princip" konkurrerade visuellt med själva arbetsgången.
  const principle = document.querySelector('#landing .principle');
  if (principle) principle.hidden = true;

  // Bakgrund och rapport ska möta deltagaren innan huvudfrågan.
  ['missbruk', 'forlossning', 'overgang'].forEach(key => {
    const section = document.getElementById(key);
    const header = section?.querySelector('.group-head');
    const background = section?.querySelector('details.background');
    if (header && background) {
      header.insertAdjacentElement('afterend', background);
      background.open = true;
    }
  });

  // Gör leveransrutorna skrivbara och spara lokalt i deltagarens webbläsare.
  document.querySelectorAll('.deliverable .answer-row').forEach((row, index) => {
    const old = row.querySelector('span');
    if (!old || row.querySelector('textarea')) return;
    const group = row.closest('.view')?.id || 'workshop';
    const label = (row.querySelector('b')?.textContent || `Svar ${index + 1}`).replace(':', '').trim();
    const key = `registerworkshop:${group}:${label}`;
    const textarea = document.createElement('textarea');
    textarea.className = 'answer-input';
    textarea.rows = 3;
    textarea.placeholder = 'Skriv ert svar här…';
    textarea.setAttribute('aria-label', label);
    try { textarea.value = localStorage.getItem(key) || ''; } catch (e) {}
    textarea.addEventListener('input', () => {
      try { localStorage.setItem(key, textarea.value); } catch (e) {}
    });
    old.replaceWith(textarea);
  });

  // Avsluta redovisningen med reflektion i stället för problemfokus.
  replaceVisibleText('Det största problemet med designen', 'Reflektion: vad lärde vi oss av uppgiften?');
  replaceVisibleText('40 sek största problem', '40 sek reflektion om uppgiften');
  replaceVisibleText('40 sek största problem.', '40 sek reflektion om uppgiften.');

  // Lägg till Företagsregistret/arbetsställen i referensen.
  const scbCards = document.querySelector('.source-category[data-category="scb"] .source-cards');
  if (scbCards && !document.getElementById('foretagsregistret-card')) {
    const article = document.createElement('article');
    article.className = 'register-card';
    article.id = 'foretagsregistret-card';
    article.dataset.groups = 'forlossning';
    article.innerHTML = `
      <h3>Företagsregistret / arbetsställen</h3>
      <dl>
        <dt>Innehåller</dt><dd>Företag och deras arbetsställen, bland annat adress, bransch och arbetsställeidentitet.</dd>
        <dt>Enhet</dt><dd>Företag eller arbetsställe.</dd>
        <dt>Länkas via</dt><dd>Organisationsnummer samt arbetsställenummer/CFAR-nummer. CFAR är SCB:s identitet för ett arbetsställe.</dd>
      </dl>
      <div class="gap"><strong>Täcker inte:</strong> vilka individer som faktiskt arbetade ett visst pass eller bemannade timmar på kliniken. Person–arbetsställe kräver andra arbetsmarknads-/arbetsgivardata och passnivå kräver lokala schema-/HR-data.</div>
      <details><summary>Mer information</summary><div class="more">Ett företag kan ha flera arbetsställen. Arbetsgivare med minst två arbetsställen redovisar arbetsställenummer i arbetsgivardeklaration på individnivå, vilket kan ge en väg till arbetsplatskoppling i relevant mikrodatamiljö. <a target="_blank" rel="noopener" href="https://www.scb.se/vara-tjanster/bestall-data-och-statistik/foretagsregistret/vanliga-fragor/">SCB om arbetsställen</a> · <a target="_blank" rel="noopener" href="https://www.scb.se/vara-tjanster/bestall-data-och-statistik/foretagsregistret/arbetsstallenummer-i-arbetsgivardeklaration-pa-individniva/">SCB om arbetsställenummer i AGI</a></div></details>`;
    scbCards.appendChild(article);
  }

  // Kompletterande styling hålls här för att ändringen ska vara självbärande.
  if (!document.getElementById('workshop-enhancement-styles')) {
    const style = document.createElement('style');
    style.id = 'workshop-enhancement-styles';
    style.textContent = `
      .answer-row{display:flex;flex-direction:column;gap:7px;min-height:125px}
      .answer-input{width:100%;min-height:82px;resize:vertical;border:1px solid #c8d1d5;border-radius:7px;padding:9px 10px;background:#fff;font:inherit;line-height:1.4;color:var(--ink)}
      .answer-input:focus{outline:3px solid var(--focus);outline-offset:1px;border-color:transparent}
      .background[open]{background:#f8fafb;border-left:4px solid #aebbc1}
      .background[open] summary{border-bottom:1px solid var(--line)}
      @media print{.answer-input{border:1px solid #777;min-height:68px;overflow:visible;white-space:pre-wrap}}
    `;
    document.head.appendChild(style);
  }
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

  const topFacilitatorLink = document.querySelector('.topbar .facilitator-link');
  if (topFacilitatorLink) topFacilitatorLink.hidden = activeId !== 'landing';

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
  addWorkshopEnhancements();
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
