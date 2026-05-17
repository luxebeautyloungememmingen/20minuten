// ═══════════════════════════════════════
// fitbox Landing Page — Logic
// ═══════════════════════════════════════

const DEFAULT_CONFIG = {
  banner_active: false,
  banner_text: "🎉 Sommer-Aktion: 2 Monate zum Preis von 1!",
  banner_link_text: "Jetzt sichern",
  banner_link_url: "#fb-inline-quiz",
  hero_img: "https://jypbyywxfjniafuygxci.supabase.co/storage/v1/object/public/landing/TWR64073.jpg",
  scarcity_text: "⚠️ Nur noch wenige Plätze pro Monat verfügbar!",
  quiz_title: "Was ist dein Ziel?",
  quiz_sub: "Wähle ein Ziel — wir zeigen dir den schnellsten Weg dorthin.",
  quiz_hint: "100% kostenlos & unverbindlich",
  nav_cta_text: "Jetzt starten →",
  stats: [
    { num: "20", label: "Min. pro Session" },
    { num: "90%", label: "Muskelfasern aktiv" },
    { num: "200+", label: "Zufriedene Mitglieder" },
    { num: "2", label: "Studios Region" }
  ],
  studio_banner_img: "https://jypbyywxfjniafuygxci.supabase.co/storage/v1/object/public/landing/1-212.jpg",
  mem_adresse: "Memmingen Amendingen",
  mem_zeiten: "Mo–Fr & nach Vereinbarung",
  mem_wa: "4915730024124",
  sen_adresse: "Senden (Iller)",
  sen_zeiten: "Mo–Fr & nach Vereinbarung",
  sen_wa: "4915561206719",
  reviews: [
    { text: "„Tolles Studio und ein super Trainerteam! Seit fünf Jahren dabei und immer noch begeistert."", author: "Bettina L. aus Memmingen" },
    { text: "„Endlich ein Training, das sich in meinen Alltag integrieren lässt. Fitter Körper, bessere Haltung und keine Rückenschmerzen mehr."", author: "Susanne H. aus Buxheim" },
    { text: "„Die Trainer sind motivierend und holen das Beste aus einem heraus. Modernes und gepflegtes Studio."", author: "Hermann K. aus Kirchdorf" }
  ],
  sticky_title: "Kostenloses Probetraining",
  sticky_sub: "Nur noch wenige Plätze frei!",
  impressum_url: "#",
  datenschutz_url: "#",
  form_title: "Probetraining sichern",
  form_subtitle: "In 60 Sekunden zum kostenlosen Termin — wir melden uns persönlich."
};

async function loadConfig() {
  let cfg = { ...DEFAULT_CONFIG };
  try {
    const res = await fetch('./config.json?t=' + Date.now());
    if (res.ok) {
      const remote = await res.json();
      cfg = { ...DEFAULT_CONFIG, ...remote };
    }
  } catch(e) {}
  applyConfig(cfg);
}

function applyConfig(c) {
  const banner = document.getElementById('fb-action-banner');
  if (c.banner_active && c.banner_text) {
    banner.innerHTML = c.banner_text + (c.banner_link_text ? ' <a href="' + (c.banner_link_url || '#fb-inline-quiz') + '">' + c.banner_link_text + '</a>' : '');
    banner.classList.add('show');
  }
  setImg('cfg-hero-img', c.hero_img);
  setText('cfg-scarcity', c.scarcity_text);
  setText('cfg-quiz-title', c.quiz_title);
  setText('cfg-quiz-sub', c.quiz_sub);
  setText('cfg-quiz-hint', c.quiz_hint);
  setText('cfg-nav-cta', c.nav_cta_text);
  if (Array.isArray(c.stats)) {
    c.stats.forEach((s, i) => {
      const num = document.querySelector('[data-stat="' + i + '"]');
      const lbl = document.querySelector('[data-stat-label="' + i + '"]');
      if (num) num.textContent = s.num;
      if (lbl) lbl.textContent = s.label;
    });
  }
  setImg('cfg-studio-banner-img', c.studio_banner_img);
  setText('cfg-mem-adresse', c.mem_adresse);
  setText('cfg-mem-zeiten', c.mem_zeiten);
  setText('cfg-sen-adresse', c.sen_adresse);
  setText('cfg-sen-zeiten', c.sen_zeiten);
  setHref('cfg-mem-wa', 'https://wa.me/' + c.mem_wa);
  setHref('cfg-sen-wa', 'https://wa.me/' + c.sen_wa);
  if (Array.isArray(c.reviews)) {
    const grid = document.getElementById('cfg-reviews-grid');
    grid.innerHTML = c.reviews.map(r =>
      '<div class="fb-review"><div class="fb-review-stars">⭐⭐⭐⭐⭐</div><p class="fb-review-text">' + r.text + '</p><div class="fb-review-author">' + r.author + '</div></div>'
    ).join('');
  }
  setText('cfg-sticky-title', c.sticky_title);
  setText('cfg-sticky-sub', c.sticky_sub);
  setHref('cfg-impressum-link', c.impressum_url);
  setHref('cfg-datenschutz-link', c.datenschutz_url);
  setHref('cfg-datenschutz-link2', c.datenschutz_url);
  setText('cfg-form-title', c.form_title);
  setText('cfg-form-subtitle', c.form_subtitle);
  document.getElementById('fbWaFloat').href = 'https://wa.me/' + c.mem_wa;
  window.FB_WA = { MEM: c.mem_wa, SEN: c.sen_wa };
}

function setText(id, val) { if (val == null) return; const el = document.getElementById(id); if (el) el.textContent = val; }
function setImg(id, src) { if (!src) return; const el = document.getElementById(id); if (el) el.src = src; }
function setHref(id, href) { if (!href) return; const el = document.getElementById(id); if (el) el.href = href; }

// ═══════════════════════════════════════
// FORM LOGIC
// ═══════════════════════════════════════
var SUPABASE_URL = 'https://jypbyywxfjniafuygxci.supabase.co';
var SUPABASE_KEY = 'sb_publishable_ue_bdtrmkW4NP76h114wqQ__pIkA-YU';
var MAGICLINE_BASE = 'https://tight-tooth-c9e4.kuersat-oezdemir.workers.dev/proxy';
var MEM_STUDIO_ID = 1262516030;

var GOAL_LABELS = { abnehmen: 'Abnehmen & straffen', muskelaufbau: 'Muskeln & Kraft', ruecken: 'Rücken & Haltung', gesundheit: 'Allgemein fitter' };
var REACH_LABELS = { morgens: 'Morgens', mittags: 'Mittags', nachmittags: 'Nachmittags', abends: 'Abends' };
var state = { step: 1, goal: '', studioId: '', studioCode: '', studioName: '', reach: '', slot: null, slots: [], slotWindowStart: null, slotToday: null };

// Inline Quiz → springt zu Step 2 (Studio-Auswahl)
window.fbStartQuiz = function(btn) {
  state.goal = btn.dataset.goal;
  document.querySelectorAll('.fb-quiz-goal-btn').forEach(b => { b.style.borderColor = ''; b.style.background = ''; });
  btn.style.borderColor = 'var(--green)';
  btn.style.background = 'var(--green-light)';
  document.querySelectorAll('#fbStep1 .fb-goal-btn').forEach(b => b.classList.toggle('active', b.dataset.goal === state.goal));
  document.getElementById('fbNext1').disabled = false;
  showStep(2);
  setTimeout(() => { document.getElementById('fb-anmeldung').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
};

window.fbGoToStep = function(step) {
  if (step === 2 && !state.goal) { showError('fbError1', 'Bitte wähle dein Ziel.'); return; }
  if (step === 3 && !state.studioId) { showError('fbError2', 'Bitte wähle ein Studio.'); return; }
  showStep(step);
};

function showStep(step) {
  document.querySelectorAll('.fb-form-step').forEach(s => s.classList.remove('active'));
  var stepEl = document.getElementById('fbStep' + step);
  if (stepEl) stepEl.classList.add('active');
  state.step = step;
  updateIndicator(step);
  if (step === 3) setupStep3();
  if (step === 4) setupStep4();
}

function setupStep3() {
  var title = document.getElementById('fbStep3Title');
  var sub = document.getElementById('fbStep3Sub');
  if (state.studioCode === 'MEM') {
    document.getElementById('fbSlotSection').style.display = 'block';
    document.getElementById('fbWunschzeitSection').style.display = 'none';
    title.textContent = 'Wann passt es dir?';
    sub.textContent = 'Wähle einen freien Termin in Memmingen';
    initSlotCal();
  } else {
    document.getElementById('fbSlotSection').style.display = 'none';
    document.getElementById('fbWunschzeitSection').style.display = 'block';
    title.textContent = 'Wann sollen wir dich anrufen?';
    sub.textContent = 'Unser Team in Senden meldet sich persönlich';
  }
}

function setupStep4() {
  var summary = document.getElementById('fbSummary');
  var rows = [];
  if (state.goal) rows.push({ label: 'Ziel', value: GOAL_LABELS[state.goal] || state.goal });
  if (state.studioName) rows.push({ label: 'Studio', value: state.studioName });
  if (state.slot) rows.push({ label: 'Wunschtermin', value: fmtSlot(new Date(state.slot.startDateTime)) });
  else if (state.reach) rows.push({ label: 'Erreichbar', value: REACH_LABELS[state.reach] });
  else rows.push({ label: 'Termin', value: 'Wir rufen zurück' });
  summary.innerHTML = rows.map(r => '<div class="fb-summary-row"><span class="fb-summary-label">' + r.label + '</span><span class="fb-summary-value">' + r.value + '</span></div>').join('');
}

function updateIndicator(step) {
  for (var i = 1; i <= 4; i++) {
    var dot = document.getElementById('fbDot' + i);
    if (!dot) continue;
    dot.classList.remove('active', 'done');
    if (step > i) dot.classList.add('done');
    else if (i === step) dot.classList.add('active');
  }
  for (var k = 1; k <= 3; k++) {
    var line = document.getElementById('fbLine' + k);
    if (line) line.classList.toggle('done', step > k);
  }
}

function showError(id, msg) {
  var el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg; el.classList.add('show');
  setTimeout(function() { el.classList.remove('show'); }, 5000);
}

window.fbSelectGoal = function(btn) {
  document.querySelectorAll('#fbStep1 .fb-goal-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.goal = btn.dataset.goal;
  document.getElementById('fbNext1').disabled = false;
};

window.fbSelectStudio = function(btn) {
  document.querySelectorAll('.fb-studio-pick-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.studioId = btn.dataset.studio;
  state.studioCode = btn.dataset.code;
  state.studioName = btn.dataset.code === 'MEM' ? 'fitbox Memmingen' : 'fitbox Senden';
  var wa = window.FB_WA || { MEM: '4915730024124', SEN: '4915561206719' };
  document.getElementById('fbWaFloat').href = 'https://wa.me/' + (state.studioCode === 'SEN' ? wa.SEN : wa.MEM);
  document.getElementById('fbNext2').disabled = false;
};

window.fbSelectReach = function(btn) {
  document.querySelectorAll('#fbReachGrid .fb-goal-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.reach = btn.dataset.reach;
};

window.fbSkipSlot = function() {
  state.slot = null;
  document.querySelectorAll('.fb-slot-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('fbSlotSelectedInfo').style.display = 'none';
  fbGoToStep(4);
};

// Slot calendar
function slotMonday(d) { var m = new Date(d); var dow = m.getDay() || 7; m.setDate(m.getDate() - dow + 1); m.setHours(0,0,0,0); return m; }
function toYMD(d) { return d.toISOString().slice(0,10); }
function fmtSlot(dt) {
  return dt.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }) + ' ' +
         dt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
}

function initSlotCal() {
  var today = new Date(); today.setHours(0,0,0,0);
  state.slotToday = today;
  state.slotWindowStart = slotMonday(today);
  loadSlots();
}

async function loadSlots() {
  var grid = document.getElementById('fbSlotGrid');
  var label = document.getElementById('fbSlotWeekLabel');
  grid.innerHTML = '<div class="fb-slot-loading">Lade verfügbare Termine...</div>';
  document.getElementById('fbSlotSelectedInfo').style.display = 'none';

  var weekDays = [];
  for (var i = 0; i < 6; i++) { var d = new Date(state.slotWindowStart); d.setDate(d.getDate()+i); weekDays.push(d); }
  var startDate = toYMD(weekDays[0]);
  var endDay = new Date(weekDays[5]); endDay.setDate(endDay.getDate()+1);
  var endDate = toYMD(endDay);

  var d0 = new Date(weekDays[0]); d0.setHours(12);
  var jan1 = new Date(d0.getFullYear(),0,1);
  var kw = Math.ceil(((d0-jan1)/86400000+jan1.getDay()+1)/7);
  label.textContent = 'KW ' + kw + ' · ' + weekDays[0].toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + '–' + weekDays[5].toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });

  document.getElementById('fbSlotPrev').disabled = state.slotToday.getTime() >= weekDays[0].getTime();

  try {
    var res = await fetch(MAGICLINE_BASE + '/connect/v1/trialsession?studioId=' + MEM_STUDIO_ID + '&startDate=' + startDate + '&endDate=' + endDate);
    if (!res.ok) throw new Error('API Fehler');
    var data = await res.json();
    state.slots = (data.slots || []).sort((a,b) => new Date(a.startDateTime) - new Date(b.startDateTime));
  } catch(e) { state.slots = []; }

  if (!state.slots.length) {
    grid.innerHTML = '<div class="fb-slot-empty">Keine freien Termine in dieser Woche.<br>Bitte andere Woche wählen oder zurückrufen lassen.</div>';
    return;
  }

  var byDay = {};
  state.slots.forEach(s => { var key = toYMD(new Date(s.startDateTime)); if (!byDay[key]) byDay[key] = []; byDay[key].push(s); });
  grid.innerHTML = '';
  Object.keys(byDay).forEach(day => {
    var dayLabel = new Date(day+'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
    byDay[day].forEach(s => {
      var dt = new Date(s.startDateTime);
      var time = dt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'fb-slot-btn';
      btn.innerHTML = '<span class="fb-slot-day-label">' + dayLabel + '</span>' + time + ' Uhr';
      btn.onclick = function() { fbSelectSlot(s, btn); };
      grid.appendChild(btn);
    });
  });
}

function fbSelectSlot(slot, btn) {
  document.querySelectorAll('.fb-slot-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  state.slot = slot;
  document.getElementById('fbSlotSelectedInfo').style.display = 'block';
  document.getElementById('fbSlotSelectedText').textContent = fmtSlot(new Date(slot.startDateTime));
}

window.fbSlotPrevWeek = function() {
  state.slotWindowStart.setDate(state.slotWindowStart.getDate()-7);
  if (state.slotToday.getTime() > state.slotWindowStart.getTime()) state.slotWindowStart = slotMonday(state.slotToday);
  state.slot = null; loadSlots();
};
window.fbSlotNextWeek = function() { state.slotWindowStart.setDate(state.slotWindowStart.getDate()+7); state.slot = null; loadSlots(); };

window.fbSubmit = async function() {
  var btn = document.getElementById('fbSubmitBtn');
  var firstName = document.getElementById('fbFirstName').value.trim();
  var phone = document.getElementById('fbPhone').value.trim();
  var lastName = document.getElementById('fbLastName').value.trim();
  var email = document.getElementById('fbEmail').value.trim();

  if (!firstName) { showError('fbError4', 'Bitte gib deinen Vornamen ein.'); return; }
  if (!phone) { showError('fbError4', 'Bitte gib deine Telefonnummer ein.'); return; }
  if (phone.replace(/\D/g,'').length < 6) { showError('fbError4', 'Bitte gib eine gültige Telefonnummer ein.'); return; }

  btn.classList.add('loading'); btn.disabled = true;

  var bookingSuccess = false, bookingError = null;

  if (state.studioCode === 'MEM' && state.slot) {
    try {
      var bookRes = await fetch(MAGICLINE_BASE + '/connect/v1/trialsession/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studioId: MEM_STUDIO_ID,
          startDateTime: state.slot.startDateTime,
          trainerRequired: true,
          leadCustomer: {
            firstname: firstName, lastname: lastName || firstName,
            email: email || undefined, phone: phone || undefined,
            privacyConfiguration: { email: true, phone: true }
          }
        })
      });
      if (bookRes.ok) bookingSuccess = true;
      else { var t = await bookRes.text().catch(() => ''); bookingError = 'HTTP ' + bookRes.status + (t ? ': ' + t.slice(0,200) : ''); }
    } catch(err) { bookingError = err.message || 'Netzwerkfehler'; }
  }

  try {
    var notes = [];
    if (state.goal) notes.push('Ziel: ' + (GOAL_LABELS[state.goal] || state.goal));
    if (state.reach) notes.push('Erreichbar: ' + REACH_LABELS[state.reach]);
    if (state.slot) {
      notes.push('Wunschtermin: ' + fmtSlot(new Date(state.slot.startDateTime)));
      notes.push(bookingSuccess ? 'Magicline: GEBUCHT' : 'Magicline: FEHLER (' + (bookingError || 'unbekannt') + ')');
    } else if (state.studioCode === 'MEM') { notes.push('Kein Slot gewählt - Rückruf erwünscht'); }

    await fetch(SUPABASE_URL + '/rest/v1/pt_leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ studio_id: state.studioId, first_name: firstName, last_name: lastName || null, phone, email: email || null, source_code: 'website', status_key: 'new', is_active: true, notes: notes.join(' | ') })
    });
  } catch(err) { console.error('Lead-Speicherung fehlgeschlagen:', err); }

  showSuccess(firstName, bookingSuccess);
  btn.classList.remove('loading'); btn.disabled = false;
};

function showSuccess(firstName, bookingSuccess) {
  document.getElementById('fbStepsIndicator').style.display = 'none';
  document.querySelectorAll('.fb-form-step').forEach(s => s.style.display = 'none');
  var fh = document.querySelector('.fb-form-header'); if(fh) fh.style.display = 'none';

  var wa = window.FB_WA || { MEM: '4915730024124', SEN: '4915561206719' };
  var waNum = state.studioCode === 'SEN' ? wa.SEN : wa.MEM;
  var waLink = 'https://wa.me/' + waNum + '?text=' + encodeURIComponent('Hallo, ich habe gerade ein Probetraining angefragt (' + firstName + '). Wann können wir den Termin besprechen?');

  var st = document.getElementById('fbSuccessText');
  var s2 = document.getElementById('fbSuccessStep2');
  if (state.studioCode === 'MEM' && state.slot && bookingSuccess) {
    st.textContent = 'Dein Termin am ' + fmtSlot(new Date(state.slot.startDateTime)) + ' ist gebucht!';
    s2.innerHTML = '<strong>Termin gebucht</strong> — ' + fmtSlot(new Date(state.slot.startDateTime));
  } else if (state.studioCode === 'MEM' && state.slot) {
    st.textContent = 'Dein Wunschtermin am ' + fmtSlot(new Date(state.slot.startDateTime)) + ' ist vorgemerkt.';
    s2.innerHTML = '<strong>Wir melden uns</strong> — zur Terminbestätigung am ' + fmtSlot(new Date(state.slot.startDateTime));
  } else {
    st.textContent = 'Wir melden uns innerhalb von 24 Stunden persönlich bei dir.';
  }

  document.getElementById('fbWaSuccessBtn').href = waLink;
  document.getElementById('fbSuccessMsg').classList.add('show');
  document.getElementById('fb-anmeldung').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// URL param: pre-select studio
(function(){
  var sp = new URLSearchParams(window.location.search).get('studio');
  if (sp === 'memmingen') { setTimeout(() => { var b = document.querySelector('[data-studio="50de091d-debc-4172-8053-b516f42c4321"]'); if(b) fbSelectStudio(b); }, 200); }
  else if (sp === 'senden') { setTimeout(() => { var b = document.querySelector('[data-studio="3bf3c6bf-e9a1-45ba-a6f5-6dbdfee92dfb"]'); if(b) fbSelectStudio(b); }, 200); }
})();

// Sticky CTA
var stickyCta = document.getElementById('fbStickyCta');
var inlineQuiz = document.getElementById('fb-inline-quiz');
window.addEventListener('scroll', function() {
  if (!stickyCta || !inlineQuiz) return;
  var top = inlineQuiz.getBoundingClientRect().bottom;
  stickyCta.classList.toggle('visible', top < 0);
}, { passive: true });

loadConfig();
