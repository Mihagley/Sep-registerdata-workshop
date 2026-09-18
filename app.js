const GROUPS = {
  missbruk: { label: 'Grupp 1,4', title: 'Missbruks- och beroendevård' },
  forlossning: { label: 'Grupp 2,5', title: 'Förlossningsvård' },
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

function addOptionalModellingSteps() {
  const prompts = {
    missbruk: 'Skissa den statistiska modellen. Vad är ert utfall (Y), vad är den viktigaste exponeringen eller tidsvariabeln (X), vilken tidsenhet använder ni och vilka bakgrundsfaktorer eller fixa effekter skulle ni vilja ta hänsyn till? Vad skulle modellens viktigaste koefficient betyda?',
    forlossning: 'Skissa den statistiska modellen. Vad är Y och X, på vilken nivå skattas modellen (förlossning, klinik × timme/pass eller annan nivå), och vilka klinik- och tidsfaktorer behöver hanteras? Fundera också på om sambandet mellan belastning och utfall kan vara icke-linjärt.',
    overgang: 'Skissa den statistiska modellen. Är utfallet exempelvis tid till första vuxenvårdskontakt, sannolikhet för ett vårdglapp eller ett hälsoutfall? Vilken tidsaxel använder ni och vilka patient-, diagnos-, region- eller kohortfaktorer behöver modellen ta hänsyn till?'
  };

  Object.entries(prompts).forEach(([key, prompt]) => {
    const steps = document.querySelector(`#${key} .steps`);
    if (!steps || steps.querySelector('.model-step')) return;
    const li = document.createElement('li');
    li.className = 'step model-step';
    li.innerHTML = `<span class="stepnum">Om ni har tid · Steg 7</span><h3>Modellering</h3><p class="prompt">${prompt}</p><div class="emphasis"><strong>Ni behöver inte räkna.</strong> Målet är att översätta designen till en modell: vad förklaras, av vad, på vilken nivå och med vilka antaganden?</div>`;
    steps.appendChild(li);
  });

  const framework = document.querySelector('#landing .framework-grid');
  if (framework && !framework.querySelector('.model-framework-step')) {
    const div = document.createElement('div');
    div.className = 'framework-step model-framework-step';
    div.innerHTML = '<span class="num">Om ni har tid · Steg 7</span><h3>Modellering</h3><p>Översätt designen till en statistisk modell: vad är Y, vad är X, vilken analysnivå och vilka kontroller eller fixa effekter behövs?</p>';
    framework.appendChild(div);
  }
}

function updateFiveGroupLabels() {
  replaceVisibleText('Grupp 1', 'Grupp 1,4');
  replaceVisibleText('Grupp 2', 'Grupp 2,5');
  replaceVisibleText('Samma sex steg i alla tre grupper', 'Sex gemensamma steg i alla fem grupper');
  replaceVisibleText('Tre presentationer à 3 minuter', 'Fem presentationer à 3 minuter');

  // Fem grupper kräver 15 minuter för redovisningar.
  replaceVisibleText('5–30 min', '5–25 min');
  replaceVisibleText('30–36 min', '25–30 min');
  replaceVisibleText('36–45 min', '30–45 min');
  replaceVisibleText('Efter 30 min', 'Efter 25 min');
  replaceVisibleText('Efter 36 min', 'Efter 30 min');
  replaceVisibleText('30-minutersstoppet', '25-minutersstoppet');

  const commonMap = document.querySelector('#landing .framework-grid')?.previousElementSibling;
  if (commonMap && commonMap.classList.contains('claim-note') && !commonMap.textContent.includes('Bonus')) {
    commonMap.innerHTML = '<strong>Kartan är alltid densamma:</strong> Vilka? → När? → Vad mäts? → Vilka data? → Jämfört med vad? → Vad missas? <strong>Bonus om ni har tid:</strong> hur skulle ni modellera analysen?';
  }
}

function addWorkshopEnhancements() {
  // Den tidigare "Gemensam princip" konkurrerade visuellt med själva arbetsgången.
  const principle = document.querySelector('#landing .principle');
  if (principle) principle.hidden = true;

  updateFiveGroupLabels();
  addOptionalModellingSteps();

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
      .model-step,.model-framework-step{background:#f7f4fb!important;border-style:dashed!important;border-color:#baa8d6!important}
      .model-step .stepnum,.model-framework-step .num{color:#7354a5!important}
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
