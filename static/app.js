// SignSafe – Application Logic (Production Build with AdSense & Pro)

let currentMode = 'paste';
let selectedFile = null;
let currentReportData = null;
let sampleCache = {};
let adsenseClientId = 'ca-pub-2227975321090110';

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  setupEventListeners();
  loadSavedSettings();
  checkUrlForProSuccess();
  initProState();
  initAdSense();
  updateCounters();
});

// ── Setup ──────────────────────────────────────────
function setupEventListeners() {
  const textarea = document.getElementById('contract-text');
  if (textarea) textarea.addEventListener('input', updateCounters);

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      if (e.target.files?.[0]) handleFileSelection(e.target.files[0]);
    });
    ['dragenter', 'dragover'].forEach(ev =>
      dropzone.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); dropzone.classList.add('dragover'); })
    );
    ['dragleave', 'drop'].forEach(ev =>
      dropzone.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); dropzone.classList.remove('dragover'); })
    );
    dropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files?.[0]) handleFileSelection(e.dataTransfer.files[0]);
    });
  }

  document.getElementById('btn-api-modal')?.addEventListener('click', openApiModal);
}

// ── Counters ───────────────────────────────────────
function updateCounters() {
  const text = document.getElementById('contract-text')?.value || '';
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const ce = document.getElementById('char-count');
  const we = document.getElementById('word-count');
  if (ce) ce.innerText = `${chars.toLocaleString()} chars`;
  if (we) we.innerText = `${words.toLocaleString()} words`;
}

// ── Tabs ───────────────────────────────────────────
function switchTab(mode) {
  currentMode = mode;
  const tp = document.getElementById('tab-paste');
  const tu = document.getElementById('tab-upload');
  const pp = document.getElementById('panel-paste');
  const pu = document.getElementById('panel-upload');
  const activeClass = 'px-3 py-1.5 text-sm font-semibold rounded-md bg-gray-900 text-white flex items-center gap-1.5 transition-all';
  const inactiveClass = 'px-3 py-1.5 text-sm font-semibold rounded-md text-gray-500 hover:bg-gray-100 flex items-center gap-1.5 transition-all';

  if (mode === 'paste') {
    tp.className = activeClass; tu.className = inactiveClass;
    pp.classList.remove('hidden'); pu.classList.add('hidden');
  } else {
    tu.className = activeClass; tp.className = inactiveClass;
    pu.classList.remove('hidden'); pp.classList.add('hidden');
  }
  hideError();
}

// ── File Handling ──────────────────────────────────
function handleFileSelection(file) {
  selectedFile = file;
  document.getElementById('dropzone')?.classList.add('hidden');
  const preview = document.getElementById('file-preview');
  document.getElementById('file-name').innerText = file.name;
  document.getElementById('file-size').innerText = formatSize(file.size);
  preview?.classList.remove('hidden');
  hideError();
  lucide.createIcons();
}

function removeSelectedFile() {
  selectedFile = null;
  const fi = document.getElementById('file-input');
  if (fi) fi.value = '';
  document.getElementById('dropzone')?.classList.remove('hidden');
  document.getElementById('file-preview')?.classList.add('hidden');
}

function formatSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

function clearText() {
  const el = document.getElementById('contract-text');
  if (el) { el.value = ''; updateCounters(); }
  hideError();
}

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    const el = document.getElementById('contract-text');
    if (el && text) { el.value = text; updateCounters(); }
  } catch { showError("Clipboard access denied. Please press Ctrl+V."); }
}

// ── Samples ────────────────────────────────────────
async function loadSample(key) {
  try {
    switchTab('paste');
    if (!sampleCache[key]) {
      const res = await fetch(`/api/sample/${key}`);
      if (!res.ok) throw new Error("Failed to load sample");
      sampleCache[key] = await res.json();
    }
    const el = document.getElementById('contract-text');
    if (el) { el.value = sampleCache[key].text; updateCounters(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    hideError();
  } catch (e) { showError("Could not load sample: " + e.message); }
}

// ── Pro Membership & Ad-Free System ($5/mo) ────────
let stripePaymentUrl = localStorage.getItem('signsafe_stripe_url') || '';

function isPro() {
  return localStorage.getItem('signsafe_is_pro') === 'true';
}

function checkUrlForProSuccess() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('pro') === 'success') {
    localStorage.setItem('signsafe_is_pro', 'true');
    initProState();
    window.history.replaceState({}, document.title, window.location.pathname);
    alert("🎉 Payment confirmed! Your SignSafe Pro subscription is now active. All ads are removed.");
  }
}

function initProState() {
  const pro = isPro();
  const body = document.body;
  const headerProBtn = document.getElementById('btn-pro-header');
  const headerProText = document.getElementById('header-pro-text');
  const activateProBtnText = document.getElementById('btn-activate-pro-text');

  if (pro) {
    body.classList.add('is-pro');
    if (headerProText) headerProText.innerText = '👑 Pro Active';
    if (headerProBtn) {
      headerProBtn.className = 'text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-1.5 shadow-sm';
    }
    if (activateProBtnText) activateProBtnText.innerText = 'Switch Back to Free Plan';
  } else {
    body.classList.remove('is-pro');
    if (headerProText) headerProText.innerText = 'Go Ad-Free ($5/mo)';
    if (headerProBtn) {
      headerProBtn.className = 'text-xs font-semibold px-2.5 py-1 rounded-md bg-gray-900 hover:bg-black text-white flex items-center gap-1.5 transition-colors shadow-sm';
    }
    if (activateProBtnText) activateProBtnText.innerText = 'Subscribe to Pro ($5/mo)';
  }
}

function openProModal() {
  document.getElementById('pro-modal')?.classList.remove('hidden');
}

function closeProModal() {
  document.getElementById('pro-modal')?.classList.add('hidden');
}

function handleStripeCheckout() {
  if (stripePaymentUrl && stripePaymentUrl.startsWith('http')) {
    window.location.href = stripePaymentUrl;
  } else {
    const link = prompt("Enter your Stripe / Lemon Squeezy Payment Link:\n(e.g., https://buy.stripe.com/...)\n\nOr click OK with blank to test-activate Pro right now:", stripePaymentUrl);
    if (link === null) return;
    if (link.trim().startsWith('http')) {
      stripePaymentUrl = link.trim();
      localStorage.setItem('signsafe_stripe_url', stripePaymentUrl);
      window.location.href = stripePaymentUrl;
    } else {
      localStorage.setItem('signsafe_is_pro', 'true');
      initProState();
      alert("🎉 Pro activated! All ads have been removed.");
      closeProModal();
    }
  }
}

function toggleLicenseInput() {
  const box = document.getElementById('license-key-box');
  if (box) box.classList.toggle('hidden');
}

function redeemLicenseKey() {
  const input = document.getElementById('license-key-input');
  const code = (input?.value || '').trim().toUpperCase();
  const validCodes = ['SIGNSAFE', 'SIGNSAFE2026', 'PRO2026', 'VIP', 'VIPPRO'];
  if (validCodes.includes(code)) {
    localStorage.setItem('signsafe_is_pro', 'true');
    initProState();
    alert("🎉 Code successfully redeemed! SignSafe Pro is now active.");
    closeProModal();
  } else {
    alert("Invalid code. Please check your key or use card checkout.");
  }
}

function toggleProMembership() {
  const currentlyPro = isPro();
  if (currentlyPro) {
    localStorage.removeItem('signsafe_is_pro');
    initProState();
    alert("Switched to SignSafe Free Plan. Ads are now re-enabled.");
  } else {
    localStorage.setItem('signsafe_is_pro', 'true');
    initProState();
    alert("🎉 Welcome to SignSafe Pro! All ads have been removed and unlimited scans are active.");
  }
  closeProModal();
}

// ── Google AdSense Integration ─────────────────────
async function initAdSense() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const cfg = await res.json();
      if (cfg.adsense_client_id) {
        adsenseClientId = cfg.adsense_client_id;
      }
    }
  } catch (e) {
    // Config fetch optional
  }

  const savedPubId = localStorage.getItem('signsafe_adsense_id');
  if (savedPubId) {
    adsenseClientId = savedPubId;
  }

  // Update script client ID
  const script = document.getElementById('adsense-script');
  if (script && adsenseClientId && !adsenseClientId.includes('XXXX')) {
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`;
  }

  // If not pro, initialize adsbygoogle slots
  if (!isPro()) {
    try {
      const ads = document.querySelectorAll('.adsbygoogle');
      ads.forEach(ad => {
        ad.setAttribute('data-ad-client', adsenseClientId);
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      });
    } catch (e) {
      // AdSense script will run when loaded
    }
  }
}

// ── Settings Modal ─────────────────────────────────
function openApiModal() {
  document.getElementById('api-modal')?.classList.remove('hidden');
}

function closeApiModal() {
  document.getElementById('api-modal')?.classList.add('hidden');
}

function loadSavedSettings() {
  const apiKey = localStorage.getItem('signsafe_api_key');
  if (apiKey) {
    const inp = document.getElementById('custom-api-key-input');
    if (inp) inp.value = apiKey;
  }

  const adsId = localStorage.getItem('signsafe_adsense_id') || adsenseClientId;
  if (adsId) {
    const inp = document.getElementById('adsense-pub-input');
    if (inp) inp.value = adsId;
  }
}

function saveSettings() {
  const keyInp = document.getElementById('custom-api-key-input');
  if (keyInp?.value.trim()) {
    localStorage.setItem('signsafe_api_key', keyInp.value.trim());
  }

  const adsInp = document.getElementById('adsense-pub-input');
  if (adsInp?.value.trim()) {
    localStorage.setItem('signsafe_adsense_id', adsInp.value.trim());
    adsenseClientId = adsInp.value.trim();
  }

  alert("Settings saved successfully.");
  closeApiModal();
}

function clearCustomApiKey() {
  localStorage.removeItem('signsafe_api_key');
  localStorage.removeItem('signsafe_adsense_id');
  const keyInp = document.getElementById('custom-api-key-input');
  const adsInp = document.getElementById('adsense-pub-input');
  if (keyInp) keyInp.value = '';
  if (adsInp) adsInp.value = '';
  alert("Settings reset to default.");
  closeApiModal();
}

// ── Error Handling ─────────────────────────────────
function showError(msg) {
  const box = document.getElementById('error-box');
  const el = document.getElementById('error-message');
  if (box && el) { el.innerText = msg; box.classList.remove('hidden'); box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
}
function hideError() { document.getElementById('error-box')?.classList.add('hidden'); }

// ── Analysis ───────────────────────────────────────
async function startAnalysis() {
  hideError();
  const apiKey = localStorage.getItem('signsafe_api_key') || null;

  if (currentMode === 'paste') {
    const text = document.getElementById('contract-text')?.value.trim();
    if (!text || text.length < 30) { showError("Please enter at least 30 characters of contract text."); return; }
    await executeRequest('/api/analyze-text', { text, apiKey }, 'json');
  } else {
    if (!selectedFile) { showError("Please select a file first."); return; }
    const fd = new FormData();
    fd.append('file', selectedFile);
    if (apiKey) fd.append('apiKey', apiKey);
    await executeRequest('/api/analyze-file', fd, 'form');
  }
}

async function executeRequest(url, payload, type) {
  const btn = document.getElementById('btn-analyze');
  const progress = document.getElementById('progress-section');
  const report = document.getElementById('report-section');

  btn.disabled = true;
  btn.classList.add('opacity-50', 'pointer-events-none');
  progress.classList.remove('hidden');
  report.classList.add('hidden');
  progress.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const interval = animateSteps();

  try {
    const headers = {};
    if (isPro()) {
      headers['X-SignSafe-Pro'] = 'true';
    }

    let opts;
    if (type === 'json') {
      headers['Content-Type'] = 'application/json';
      opts = { method: 'POST', headers, body: JSON.stringify(payload) };
    } else {
      opts = { method: 'POST', headers, body: payload };
    }

    const res = await fetch(url, opts);
    const data = await res.json();
    clearInterval(interval);

    if (!res.ok || !data.success) throw new Error(data.detail || "Analysis failed. Please try again.");

    finishAllSteps();
    setTimeout(() => {
      progress.classList.add('hidden');
      renderReport(data.report);
      report.classList.remove('hidden');
      report.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 350);
  } catch (e) {
    clearInterval(interval);
    progress.classList.add('hidden');
    showError(e.message || "Something went wrong. Please try again.");
  } finally {
    btn.disabled = false;
    btn.classList.remove('opacity-50', 'pointer-events-none');
  }
}

function animateSteps() {
  let step = 1;
  const update = () => {
    for (let i = 1; i <= 4; i++) {
      const el = document.getElementById(`step-${i}`);
      if (!el) continue;
      const icon = el.querySelector('.step-icon');
      const done = el.querySelector('.step-done');
      if (i < step) {
        el.className = 'flex items-center gap-2 p-2 rounded bg-green-50 text-green-800';
        icon?.classList.add('hidden'); done?.classList.remove('hidden');
      } else if (i === step) {
        el.className = 'flex items-center gap-2 p-2 rounded bg-gray-100 text-gray-900 font-medium';
        icon?.classList.remove('hidden'); done?.classList.add('hidden');
      } else {
        el.className = 'flex items-center gap-2 p-2 rounded bg-gray-50 text-gray-400';
        icon?.classList.remove('hidden'); done?.classList.add('hidden');
      }
    }
    step = (step % 4) + 1;
  };
  update();
  return setInterval(update, 1200);
}

function finishAllSteps() {
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById(`step-${i}`);
    if (!el) continue;
    el.className = 'flex items-center gap-2 p-2 rounded bg-green-50 text-green-800';
    el.querySelector('.step-icon')?.classList.add('hidden');
    el.querySelector('.step-done')?.classList.remove('hidden');
  }
}

// ── Render Report ──────────────────────────────────
function renderReport(r) {
  currentReportData = r;

  setText('rep-contract-title', r.contract_title || 'Contract Analysis Report');
  setText('rep-contract-type', r.contract_type || 'Agreement');

  // Score gauge
  const score = Math.min(100, Math.max(0, parseInt(r.risk_score) || 0));
  setText('rep-risk-score', score);

  const circ = document.getElementById('score-circle-bar');
  const circumference = 314.159;
  const offset = circumference - (score / 100) * circumference;
  let strokeColor, badgeClass, levelText;

  if (score > 65) {
    strokeColor = '#c53030'; badgeClass = 'bg-red-900/30 text-red-300'; levelText = 'High Risk';
  } else if (score > 30) {
    strokeColor = '#a16207'; badgeClass = 'bg-yellow-900/30 text-yellow-300'; levelText = 'Moderate Risk';
  } else {
    strokeColor = '#2d8a56'; badgeClass = 'bg-green-900/30 text-green-300'; levelText = 'Low Risk';
  }

  circ.style.stroke = strokeColor;
  circ.style.strokeDashoffset = offset;

  const badge = document.getElementById('rep-risk-badge');
  badge.className = `mt-2 px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${badgeClass}`;
  badge.innerText = r.risk_level || levelText;

  setText('rep-verdict', r.verdict || 'Review Carefully');
  setText('rep-verdict-explanation', r.verdict_explanation || '');
  setText('rep-advice', r.bottom_line_advice || '');

  setText('stat-risk-level', r.risk_level || levelText);
  setText('stat-red-flags', r.critical_red_flags?.length || 0);
  setText('stat-traps', r.hidden_fees_and_traps?.length || 0);
  setText('stat-questions', r.questions_to_ask?.length || 0);

  setText('rep-summary', r.summary || 'No summary available.');

  // Red Flags
  const flagsC = document.getElementById('red-flags-container');
  flagsC.innerHTML = '';
  const flags = r.critical_red_flags || [];
  setText('rep-flags-badge', `${flags.length} found`);

  if (!flags.length) {
    flagsC.innerHTML = '<p class="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">No critical issues detected.</p>';
  } else {
    flags.forEach((f, i) => {
      const sev = f.severity === 'Critical';
      const borderColor = sev ? 'border-l-red-500' : 'border-l-yellow-500';
      const sevBg = sev ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700';
      const card = document.createElement('div');
      card.className = `p-3.5 rounded-lg border border-gray-200 border-l-[3px] ${borderColor} bg-white space-y-2`;
      card.innerHTML = `
        <div class="flex items-center gap-2 flex-wrap">
          <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${sevBg}">${esc(f.severity || 'Warning')}</span>
          ${f.tag ? `<span class="text-xs font-medium text-gray-600">${esc(f.tag)}</span>` : ''}
        </div>
        <blockquote class="text-xs font-mono text-gray-600 bg-gray-50 p-2.5 rounded border border-gray-100 italic leading-relaxed">"${esc(f.clause_quote)}"</blockquote>
        <p class="text-xs text-gray-700 leading-relaxed"><span class="font-medium text-gray-900">Why this matters:</span> ${esc(f.plain_explanation)}</p>
      `;
      flagsC.appendChild(card);
    });
  }

  // Traps
  const trapsC = document.getElementById('traps-container');
  trapsC.innerHTML = '';
  const traps = r.hidden_fees_and_traps || [];
  setText('rep-traps-badge', `${traps.length} found`);

  if (!traps.length) {
    trapsC.innerHTML = '<p class="col-span-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">No hidden charges or penalty traps detected.</p>';
  } else {
    traps.forEach(t => {
      const item = document.createElement('div');
      item.className = 'p-3 rounded-lg border border-gray-200 bg-gray-50 space-y-1';
      item.innerHTML = `
        <p class="text-xs font-semibold text-gray-800">${esc(t.title)}</p>
        <p class="text-xs text-gray-600 leading-relaxed">${esc(t.details)}</p>
      `;
      trapsC.appendChild(item);
    });
  }

  // Questions
  const qC = document.getElementById('questions-container');
  qC.innerHTML = '';
  const qs = r.questions_to_ask || [];

  if (!qs.length) {
    qC.innerHTML = '<p class="text-xs text-gray-500">No specific questions needed.</p>';
  } else {
    qs.forEach((q, i) => {
      const div = document.createElement('div');
      div.className = 'p-2.5 rounded-lg border border-gray-200 bg-gray-50 flex items-start justify-between gap-2 group hover:bg-gray-100 transition-colors';
      div.innerHTML = `
        <p class="text-xs text-gray-700 leading-relaxed"><span class="font-semibold text-gray-900 mr-1">${i+1}.</span>${esc(q)}</p>
        <button onclick="copyQuestion(this, ${JSON.stringify(q)})" class="shrink-0 p-1 rounded text-gray-400 hover:text-gray-800 transition-colors" title="Copy">
          <i data-lucide="copy" class="w-3 h-3"></i>
        </button>
      `;
      qC.appendChild(div);
    });
  }

  // Section Breakdown
  const secC = document.getElementById('sections-container');
  secC.innerHTML = '';
  (r.section_breakdown || []).forEach(s => {
    let tagClass = 'bg-gray-100 text-gray-600';
    if (s.safety_rating === 'Dangerous') tagClass = 'bg-red-50 text-red-700';
    else if (s.safety_rating === 'Warning' || s.safety_rating === 'Watch Out') tagClass = 'bg-yellow-50 text-yellow-700';
    else if (s.safety_rating === 'Fair') tagClass = 'bg-green-50 text-green-700';

    const row = document.createElement('div');
    row.className = 'p-2.5 rounded-lg border border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs';
    row.innerHTML = `
      <div>
        <span class="font-semibold text-gray-800">${esc(s.section_name)}</span>
        <p class="text-gray-500 mt-0.5">${esc(s.plain_meaning)}</p>
      </div>
      <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0 ${tagClass}">${esc(s.safety_rating || 'Review')}</span>
    `;
    secC.appendChild(row);
  });

  // Fair Clauses
  const fairW = document.getElementById('fair-clauses-wrapper');
  const fairC = document.getElementById('fair-clauses-container');
  fairC.innerHTML = '';
  const fair = r.fair_or_positive_clauses || [];
  if (!fair.length) { fairW.classList.add('hidden'); }
  else {
    fairW.classList.remove('hidden');
    fair.forEach(fc => {
      const li = document.createElement('li');
      li.className = 'flex items-start gap-1.5';
      li.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5"></i><span>${esc(fc)}</span>`;
      fairC.appendChild(li);
    });
  }

  lucide.createIcons();
}

// ── Utility ────────────────────────────────────────
function setText(id, val) { const el = document.getElementById(id); if (el) el.innerText = val; }

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function copyQuestion(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="check" class="w-3 h-3 text-green-600"></i>';
    lucide.createIcons();
    setTimeout(() => { btn.innerHTML = orig; lucide.createIcons(); }, 1200);
  });
}

function copyAllQuestions() {
  if (!currentReportData?.questions_to_ask) return;
  const text = currentReportData.questions_to_ask.map((q, i) => `${i+1}. ${q}`).join('\n\n');
  navigator.clipboard.writeText(text).then(() => {
    alert("All negotiation questions copied to clipboard!");
  });
}

function copySummaryText() {
  if (!currentReportData) return;
  const r = currentReportData;
  let out = `SIGNSAFE REPORT: ${r.contract_title}\nType: ${r.contract_type}\nRisk: ${r.risk_score}/100 (${r.risk_level})\nVerdict: ${r.verdict}\n\n${r.summary}\n`;
  if (r.critical_red_flags?.length) {
    out += '\nRED FLAGS:\n';
    r.critical_red_flags.forEach(f => out += `• [${f.severity}] ${f.tag}: ${f.plain_explanation}\n`);
  }
  if (r.questions_to_ask?.length) {
    out += '\nQUESTIONS TO ASK:\n';
    r.questions_to_ask.forEach((q, i) => out += `${i+1}. ${q}\n`);
  }
  navigator.clipboard.writeText(out).then(() => {
    alert("Full contract report copied to clipboard!");
  });
}

function printReport() { window.print(); }

function resetAnalysis() {
  document.getElementById('report-section')?.classList.add('hidden');
  document.getElementById('input-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
