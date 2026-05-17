/* ============================================================
 * fitbox – Mitarbeiter-Aufgaben Pop-up
 * Wird in index_memmingen.html und index_senden.html geladen.
 *
 * Funktionsweise:
 *   – Beim Laden: prüft View v_offene_aufgaben_je_mitarbeiter
 *     für den eingeloggten Mitarbeiter
 *   – Zeigt Pop-up mit allen offenen, nicht-gesnoozten Aufgaben
 *   – Pro Aufgabe: "Erledigt" (mit Notiz) / "Später erinnern" (5 min)
 *   – Pop-up schließt automatisch wenn alle abgehakt/gesnoozt
 *   – Re-Check alle 60 Sekunden
 * ============================================================ */
(function(){
  'use strict';

  // ─── Session prüfen ───────────────────────────────────────
  var SESS = window._fbSession || (function(){
    try { return JSON.parse(localStorage.getItem('fitbox_session')||'null'); }
    catch(e){ return null; }
  })();
  if(!SESS || !SESS.access_token) return;

  var ME_ID = SESS.employee && SESS.employee.id;
  var ME_NAME = (SESS.employee && (SESS.employee.first_name||'') + ' ' + (SESS.employee.last_name||'')).trim() || 'Mitarbeiter';
  if(!ME_ID) return;

  // ─── Supabase-Client ──────────────────────────────────────
  var SUPA_URL = 'https://jypbyywxfjniafuygxci.supabase.co';
  var SUPA_KEY = 'sb_publishable_ue_bdtrmkW4NP76h114wqQ__pIkA-YU';

  if(!window.supabase || !window.supabase.createClient){
    console.warn('[aufgaben_popup] supabase-js nicht geladen');
    return;
  }
  var sb = window.supabase.createClient(SUPA_URL, SUPA_KEY, {
    global:{ headers:{ apikey: SUPA_KEY, Authorization: 'Bearer '+SESS.access_token } },
    auth:{ persistSession:false, autoRefreshToken:false, storageKey:'sb_aufgaben_popup' }
  });

  // ─── State ────────────────────────────────────────────────
  var state = {
    tasks: [],              // alle offenen Aufgaben für mich
    activeNoteId: null,     // welche Aufgabe gerade Erledigt-Notiz-Eingabe hat
    pollTimer: null
  };

  // ─── CSS injizieren ───────────────────────────────────────
  var STYLE = ''
    +'#fbAufgabenBd{position:fixed;inset:0;background:rgba(17,24,39,.62);display:none;align-items:center;justify-content:center;z-index:9000;padding:18px;backdrop-filter:blur(3px);font-family:"DM Sans",system-ui,sans-serif}'
    +'#fbAufgabenBd.show{display:flex;animation:fbAufFade .2s ease-out}'
    +'@keyframes fbAufFade{from{opacity:0}to{opacity:1}}'
    +'.fb-auf-card{background:#fff;border-radius:18px;max-width:560px;width:100%;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 70px rgba(0,0,0,.35);overflow:hidden;animation:fbAufPop .25s ease-out}'
    +'@keyframes fbAufPop{from{transform:scale(.94);opacity:0}to{transform:scale(1);opacity:1}}'
    +'.fb-auf-head{background:linear-gradient(135deg,#2f8615,#95c11f);color:#fff;padding:18px 22px;display:flex;align-items:center;gap:12px}'
    +'.fb-auf-head-icon{font-size:28px;flex-shrink:0}'
    +'.fb-auf-head-title{font-size:18px;font-weight:900;line-height:1.2}'
    +'.fb-auf-head-sub{font-size:12px;font-weight:500;opacity:.92;margin-top:2px}'
    +'.fb-auf-list{padding:14px 18px;display:flex;flex-direction:column;gap:10px;overflow-y:auto;flex:1}'
    +'.fb-auf-item{border:1px solid #e4e9e2;border-radius:12px;padding:12px 14px;background:#fff;transition:.15s;position:relative}'
    +'.fb-auf-item.overdue{border-left:4px solid #991b1b;background:#fef2f2}'
    +'.fb-auf-item.urgent{border-color:#fca5a5}'
    +'.fb-auf-item-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:6px}'
    +'.fb-auf-item-title{font-size:14px;font-weight:800;color:#111827;line-height:1.35;flex:1}'
    +'.fb-auf-chip{display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:800;padding:3px 8px;border-radius:999px;letter-spacing:.02em;flex-shrink:0;white-space:nowrap}'
    +'.fb-auf-chip-niedrig{background:#f3f4f6;color:#374151;border:1px solid #d1d5db}'
    +'.fb-auf-chip-normal{background:#eef7e9;color:#2f8615;border:1px solid #d4eacc}'
    +'.fb-auf-chip-hoch{background:#fef3c7;color:#92400e;border:1px solid #fcd34d}'
    +'.fb-auf-chip-dringend{background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;animation:fbAufPulse 1.5s ease-in-out infinite}'
    +'@keyframes fbAufPulse{50%{transform:scale(1.06)}}'
    +'.fb-auf-item-desc{font-size:13px;color:#6b7280;line-height:1.5;white-space:pre-wrap;word-break:break-word;margin-bottom:8px}'
    +'.fb-auf-item-meta{font-size:11px;color:#6b7280;display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px}'
    +'.fb-auf-item-meta .due-overdue{color:#991b1b;font-weight:800}'
    +'.fb-auf-item-meta .due-today{color:#92400e;font-weight:800}'
    +'.fb-auf-actions{display:flex;gap:6px;flex-wrap:wrap}'
    +'.fb-auf-btn{appearance:none;border:1px solid #e4e9e2;background:#fff;color:#111827;font:700 12px/1 "DM Sans",sans-serif;padding:8px 12px;border-radius:9px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;transition:.12s}'
    +'.fb-auf-btn:hover{background:#eef7e9;border-color:#d4eacc;color:#2f8615}'
    +'.fb-auf-btn.primary{background:#2f8615;border-color:#2f8615;color:#fff}'
    +'.fb-auf-btn.primary:hover{background:#236010;color:#fff}'
    +'.fb-auf-btn.snooze{background:#dbeafe;border-color:#93c5fd;color:#1e40af}'
    +'.fb-auf-btn.snooze:hover{background:#bfdbfe}'
    +'.fb-auf-note{margin-top:8px;display:flex;flex-direction:column;gap:6px}'
    +'.fb-auf-note textarea{width:100%;border:1px solid #e4e9e2;border-radius:8px;padding:7px 10px;font:500 12px/1.4 "DM Sans",sans-serif;color:#111827;min-height:50px;resize:vertical;background:#fff}'
    +'.fb-auf-note textarea:focus{outline:none;border-color:#2f8615;box-shadow:0 0 0 3px #eef7e9}'
    +'.fb-auf-note-row{display:flex;gap:6px;justify-content:flex-end}'
    +'.fb-auf-foot{padding:12px 18px;border-top:1px solid #e4e9e2;background:#f9fafb;display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:11px;color:#6b7280}'
    +'.fb-auf-foot-info{flex:1}'
    +'.fb-auf-foot-close{appearance:none;border:1px solid #e4e9e2;background:#fff;color:#6b7280;font:600 11px/1 "DM Sans",sans-serif;padding:6px 10px;border-radius:7px;cursor:pointer}'
    +'.fb-auf-foot-close:hover{color:#111827}'
    +'.fb-auf-empty{text-align:center;padding:36px 20px;color:#6b7280}'
    +'.fb-auf-empty-icon{font-size:42px;margin-bottom:8px}'
    +'#fbAufToast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#2f8615;color:#fff;padding:11px 18px;border-radius:10px;font:700 13px/1 "DM Sans",sans-serif;box-shadow:0 6px 22px rgba(0,0,0,.2);z-index:9500;opacity:0;transition:opacity .25s;pointer-events:none}'
    +'#fbAufToast.show{opacity:1}'
    +'#fbAufToast.err{background:#991b1b}';

  var styleEl = document.createElement('style');
  styleEl.textContent = STYLE;
  document.head.appendChild(styleEl);

  // ─── DOM ──────────────────────────────────────────────────
  var bd = document.createElement('div');
  bd.id = 'fbAufgabenBd';
  bd.innerHTML = ''
    +'<div class="fb-auf-card" role="dialog" aria-labelledby="fbAufTitle">'
      +'<div class="fb-auf-head">'
        +'<div class="fb-auf-head-icon">📋</div>'
        +'<div style="flex:1;min-width:0">'
          +'<div class="fb-auf-head-title" id="fbAufTitle">Offene Aufgaben</div>'
          +'<div class="fb-auf-head-sub" id="fbAufSub"></div>'
        +'</div>'
      +'</div>'
      +'<div class="fb-auf-list" id="fbAufList"></div>'
      +'<div class="fb-auf-foot">'
        +'<div class="fb-auf-foot-info">Aufgaben erscheinen wieder beim nächsten Laden, falls nicht abgehakt.</div>'
        +'<button class="fb-auf-foot-close" id="fbAufClose" type="button">Schließen</button>'
      +'</div>'
    +'</div>';
  document.body.appendChild(bd);

  var toastEl = document.createElement('div');
  toastEl.id = 'fbAufToast';
  document.body.appendChild(toastEl);

  // ─── Helpers ──────────────────────────────────────────────
  function esc(v){
    return String(v==null?'':v)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }
  function fmtDate(iso){
    if(!iso) return '';
    var d = new Date(iso+'T00:00:00');
    return d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
  }
  function todayStr(){ return new Date().toISOString().split('T')[0]; }
  function toast(msg, isErr){
    toastEl.textContent = msg;
    toastEl.className = isErr ? 'show err' : 'show';
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function(){ toastEl.className = ''; }, 2400);
  }

  var PRIO_ICON = { niedrig:'⚪', normal:'🟢', hoch:'🟠', dringend:'🔴' };
  var PRIO_LABEL = { niedrig:'Niedrig', normal:'Normal', hoch:'Hoch', dringend:'Dringend' };

  // ─── Daten laden ──────────────────────────────────────────
  async function loadTasks(){
    try {
      var res = await sb.from('v_offene_aufgaben_je_mitarbeiter')
        .select('*')
        .eq('employee_id', ME_ID)
        .order('faellig_am', { ascending: true, nullsFirst: false })
        .order('prioritaet', { ascending: false })
        .order('created_at', { ascending: true });
      if(res.error) throw res.error;

      // Prio-Sortierung manuell (Postgres sortiert text alphabetisch)
      var prioOrder = { dringend:0, hoch:1, normal:2, niedrig:3 };
      var list = (res.data||[]).slice().sort(function(a,b){
        // Überfällig zuerst
        if(a.ist_ueberfaellig !== b.ist_ueberfaellig) return a.ist_ueberfaellig ? -1 : 1;
        // Dann Priorität
        var pa = prioOrder[a.prioritaet] ?? 9, pb = prioOrder[b.prioritaet] ?? 9;
        if(pa !== pb) return pa - pb;
        // Dann Fälligkeit
        if(a.faellig_am && b.faellig_am) return a.faellig_am < b.faellig_am ? -1 : 1;
        if(a.faellig_am) return -1;
        if(b.faellig_am) return 1;
        // Dann Erstellt
        return new Date(a.created_at) - new Date(b.created_at);
      });

      state.tasks = list;
      render();
    } catch(e){
      console.warn('[aufgaben_popup] Laden fehlgeschlagen:', e);
    }
  }

  // ─── Render ───────────────────────────────────────────────
  function render(){
    var n = state.tasks.length;
    if(n === 0){
      hide();
      return;
    }
    document.getElementById('fbAufSub').textContent =
      'Hallo ' + ME_NAME + ' — du hast ' + n + ' offene Aufgabe' + (n===1?'':'n');

    var today = todayStr();
    var html = state.tasks.map(function(t){
      var isOverdue = t.ist_ueberfaellig;
      var isToday = !isOverdue && t.faellig_am === today;
      var dueClass = isOverdue ? 'due-overdue' : (isToday ? 'due-today' : '');
      var dueLbl = t.faellig_am
        ? '<span class="'+dueClass+'">📅 '+(isOverdue?'Überfällig — ':'')+(isToday?'Heute fällig':fmtDate(t.faellig_am))+'</span>'
        : '';
      var creatorLbl = t.erstellt_von_name ? '<span>👤 von '+esc(t.erstellt_von_name)+'</span>' : '';
      var prio = t.prioritaet || 'normal';
      var noteOpen = state.activeNoteId === t.id;

      return ''
      +'<div class="fb-auf-item '+(isOverdue?'overdue':'')+' '+(prio==='dringend'?'urgent':'')+'" data-id="'+t.id+'">'
        +'<div class="fb-auf-item-head">'
          +'<div class="fb-auf-item-title">'+esc(t.titel)+'</div>'
          +'<span class="fb-auf-chip fb-auf-chip-'+prio+'">'+(PRIO_ICON[prio]||'')+' '+(PRIO_LABEL[prio]||prio)+'</span>'
        +'</div>'
        +(t.beschreibung ? '<div class="fb-auf-item-desc">'+esc(t.beschreibung)+'</div>' : '')
        +(dueLbl||creatorLbl||t.intervall_minuten>0 ? '<div class="fb-auf-item-meta">'+dueLbl+creatorLbl+(t.intervall_minuten>0?'<span style="color:#92400e;font-weight:700">🔁 alle '+t.intervall_minuten+' min</span>':'')+'</div>' : '')
        +(t.intervall_minuten>0
          ? ''
            +'<div class="fb-auf-actions">'
              +'<button class="fb-auf-btn primary" data-act="getan" data-id="'+t.id+'" data-iv="'+t.intervall_minuten+'">✅ Getan — popt in '+t.intervall_minuten+' min wieder</button>'
              +'<button class="fb-auf-btn snooze" data-act="snooze" data-id="'+t.id+'">⏰ Später (5 min)</button>'
            +'</div>'
          : (noteOpen
            ? ''
              +'<div class="fb-auf-note">'
                +'<textarea id="fbAufNote_'+t.id+'" placeholder="Optional: kurze Notiz (z. B. „erledigt um 14:30")"></textarea>'
                +'<div class="fb-auf-note-row">'
                  +'<button class="fb-auf-btn" data-act="cancel-note" data-id="'+t.id+'">Abbrechen</button>'
                  +'<button class="fb-auf-btn primary" data-act="confirm-done" data-id="'+t.id+'">✅ Erledigt speichern</button>'
                +'</div>'
              +'</div>'
            : ''
              +'<div class="fb-auf-actions">'
                +'<button class="fb-auf-btn primary" data-act="open-note" data-id="'+t.id+'">✅ Erledigt</button>'
                +'<button class="fb-auf-btn snooze" data-act="snooze" data-id="'+t.id+'">⏰ Später (5 min)</button>'
              +'</div>'
          )
        )
      +'</div>';
    }).join('');

    document.getElementById('fbAufList').innerHTML = html;
    show();

    // Wiring
    document.getElementById('fbAufList').querySelectorAll('[data-act]').forEach(function(btn){
      btn.addEventListener('click', function(){
        handleAction(btn.dataset.act, btn.dataset.id);
      });
    });

    // Auto-Focus auf Notiz wenn geöffnet
    if(state.activeNoteId){
      setTimeout(function(){
        var ta = document.getElementById('fbAufNote_'+state.activeNoteId);
        if(ta) ta.focus();
      }, 60);
    }
  }

  // ─── Actions ──────────────────────────────────────────────
  async function handleAction(act, id){
    if(act === 'open-note'){
      state.activeNoteId = id;
      render();
      return;
    }
    if(act === 'cancel-note'){
      state.activeNoteId = null;
      render();
      return;
    }
    if(act === 'confirm-done'){
      var ta = document.getElementById('fbAufNote_'+id);
      var notiz = ta ? ta.value.trim() : '';
      var btn = document.querySelector('[data-act="confirm-done"][data-id="'+id+'"]');
      if(btn){ btn.disabled = true; btn.textContent = '⏳ Speichern …'; }
      try {
        var res = await sb.from('mitarbeiter_aufgaben').update({
          erledigt: true,
          erledigt_am: new Date().toISOString(),
          erledigt_von: ME_ID,
          erledigt_notiz: notiz || null
        }).eq('id', id);
        if(res.error) throw res.error;
        toast('Aufgabe erledigt ✅');
        state.activeNoteId = null;
        // Lokal entfernen, dann neu rendern
        state.tasks = state.tasks.filter(function(t){ return t.id !== id; });
        render();
      } catch(e){
        toast('Fehler: '+(e.message||e), true);
        if(btn){ btn.disabled = false; btn.textContent = '✅ Erledigt speichern'; }
      }
      return;
    }
    if(act === 'getan'){
      var iv = parseInt(document.querySelector('[data-act="getan"][data-id="'+id+'"]').dataset.iv,10) || 30;
      var btn3 = document.querySelector('[data-act="getan"][data-id="'+id+'"]');
      if(btn3){ btn3.disabled = true; btn3.textContent = '⏳ Speichern …'; }
      try {
        var snoozeBis = new Date(Date.now() + iv*60*1000).toISOString();
        var res3 = await sb.from('mitarbeiter_aufgaben_snooze').upsert({
          aufgabe_id: id,
          employee_id: ME_ID,
          snooze_bis: snoozeBis
        }, { onConflict: 'aufgabe_id,employee_id' });
        if(res3.error) throw res3.error;
        toast('Getan ✅ — popt in '+iv+' min wieder');
        state.tasks = state.tasks.filter(function(t){ return t.id !== id; });
        render();
      } catch(e){
        toast('Fehler: '+(e.message||e), true);
        if(btn3){ btn3.disabled = false; btn3.textContent = '✅ Getan — popt in '+iv+' min wieder'; }
      }
      return;
    }
    if(act === 'snooze'){
      var btn2 = document.querySelector('[data-act="snooze"][data-id="'+id+'"]');
      if(btn2){ btn2.disabled = true; btn2.textContent = '⏳ …'; }
      try {
        var snoozeBis = new Date(Date.now() + 5*60*1000).toISOString();
        // Upsert: ein Snooze pro (employee, aufgabe)
        var res2 = await sb.from('mitarbeiter_aufgaben_snooze').upsert({
          aufgabe_id: id,
          employee_id: ME_ID,
          snooze_bis: snoozeBis
        }, { onConflict: 'aufgabe_id,employee_id' });
        if(res2.error) throw res2.error;
        toast('5 Minuten verschoben ⏰');
        state.tasks = state.tasks.filter(function(t){ return t.id !== id; });
        render();
      } catch(e){
        toast('Fehler: '+(e.message||e), true);
        if(btn2){ btn2.disabled = false; btn2.textContent = '⏰ Später (5 min)'; }
      }
      return;
    }
  }

  // ─── Show / Hide ──────────────────────────────────────────
  function show(){ bd.classList.add('show'); }
  function hide(){
    bd.classList.remove('show');
    state.activeNoteId = null;
  }

  document.getElementById('fbAufClose').addEventListener('click', function(){
    hide();
  });
  // Klick auf Backdrop schließt NICHT — Aufgaben sollen bewusst behandelt werden.
  // Esc-Key schließt das Pop-up.
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && bd.classList.contains('show')){
      hide();
    }
  });

  // ─── Polling: alle 60s neu prüfen ─────────────────────────
  function startPolling(){
    if(state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = setInterval(function(){
      // Nur neu laden wenn Pop-up nicht aktiv im Notiz-Modus
      if(state.activeNoteId) return;
      loadTasks();
    }, 30*1000);
  }

  // ─── Start ────────────────────────────────────────────────
  function start(){
    loadTasks();
    startPolling();
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
