(function () {
  'use strict';

  var CFG = {
    supabaseUrl: 'https://jypbyywxfjniafuygxci.supabase.co',
    supabaseKey: 'sb_publishable_ue_bdtrmkW4NP76h114wqQ__pIkA-YU',
    mlProxy: 'https://tight-tooth-c9e4.kuersat-oezdemir.workers.dev/proxy',
    mlMemId: 1262516030,
    studios: {
      MEM: { id: '50de091d-debc-4172-8053-b516f42c4321', name: 'fitbox Memmingen', code: 'MEM', useMagicline: true },
      SEN: { id: '3bf3c6bf-e9a1-45ba-a6f5-6dbdfee92dfb', name: 'fitbox Senden',     code: 'SEN', useMagicline: false }
    },
    ptStatusTerminiert: '77f13adc-4796-41dd-b206-b9242c4f7946',
    green: '#2f8615',
    darkGreen: '#236010',
    lightGreen: '#e8f5e2',
  };

  var QUICK_REPLIES = [
    'Probetraining buchen 💪',
    'Was ist EMS?',
    'Ist EMS sicher?',
    'Für wen geeignet?',
    'Wie schnell Ergebnisse?',
    'Was kostet es?',
  ];

  // ── State ────────────────────────────────────────────────────────────────────
  var msgs        = [];
  var isOpen      = false;
  var isLoading   = false;
  var greeted     = false;
  var bookingDone = false;
  var slotsMem      = [];   // Magicline slots (nächste 14 Tage)
  var slotsLoaded   = false;
  var rejectedSlots = [];   // Slots die der User abgelehnt hat (nie mehr anzeigen)

  // Daten die die KI schrittweise sammelt
  var collected = {
    studio:        null,   // 'MEM' | 'SEN'
    slot_datetime: null,   // ISO-String oder manuelles Datum
    firstName:     null,
    lastName:      null,
    phone:         null,
    email:         null,
  };

  // ── Styles ───────────────────────────────────────────────────────────────────
  function injectStyles() {
    var s = document.createElement('style');
    s.textContent = [
      '#fbw *{box-sizing:border-box;margin:0;padding:0}',
      '#fbw{position:fixed;bottom:20px;right:20px;z-index:99999;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;font-size:15px}',
      '#fbw-btn{width:58px;height:58px;border-radius:50%;background:'+CFG.green+';border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(47,134,21,.35);transition:transform .2s,box-shadow .2s;position:relative}',
      '#fbw-btn:hover{transform:scale(1.06);box-shadow:0 6px 22px rgba(47,134,21,.45)}',
      '#fbw-btn svg{width:26px;height:26px;fill:#fff}',
      '#fbw-btn .ic-chat{display:block}#fbw-btn .ic-close{display:none}',
      '#fbw-btn.open .ic-chat{display:none}#fbw-btn.open .ic-close{display:block}',
      '#fbw-pulse{position:absolute;top:3px;right:3px;width:12px;height:12px;background:#ff4757;border-radius:50%;border:2px solid #fff;animation:fbwp 2s infinite}',
      '@keyframes fbwp{0%{box-shadow:0 0 0 0 rgba(255,71,87,.5)}70%{box-shadow:0 0 0 8px rgba(255,71,87,0)}100%{box-shadow:0 0 0 0 rgba(255,71,87,0)}}',
      '#fbw-win{position:absolute;bottom:70px;right:0;width:380px;height:600px;max-height:calc(100vh - 100px);background:#fff;border-radius:20px;box-shadow:0 12px 48px rgba(0,0,0,.2);display:flex;flex-direction:column;overflow:hidden;transform:scale(.95) translateY(12px);opacity:0;transition:transform .22s cubic-bezier(.34,1.4,.64,1),opacity .18s;pointer-events:none}',
      '#fbw-win.vis{transform:scale(1) translateY(0);opacity:1;pointer-events:all}',
      // Header - kompakter
      '#fbw-hdr{background:'+CFG.green+';padding:12px 14px;display:flex;align-items:center;gap:10px;flex-shrink:0}',
      '#fbw-av{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;flex-shrink:0}',
      '#fbw-av svg{width:19px;height:19px;fill:#fff}',
      '.fbw-hi{flex:1;min-width:0}.fbw-hn{color:#fff;font-weight:700;font-size:14.5px;line-height:1.15;letter-spacing:-.01em}.fbw-hs{color:rgba(255,255,255,.85);font-size:11.5px;margin-top:2px;display:flex;align-items:center;gap:5px}',
      '.fbw-hs::before{content:"";width:7px;height:7px;border-radius:50%;background:#7ee87e;box-shadow:0 0 6px rgba(126,232,126,.7)}',
      '.fbw-hx{background:none;border:none;cursor:pointer;padding:6px;color:rgba(255,255,255,.85);border-radius:8px;display:flex;align-items:center;transition:background .15s}',
      '.fbw-hx:hover{background:rgba(255,255,255,.18)}.fbw-hx svg{width:18px;height:18px;fill:currentColor}',
      // Messages
      '#fbw-msgs{flex:1;overflow-y:auto;padding:16px 14px 10px;display:flex;flex-direction:column;gap:11px;scroll-behavior:smooth;background:linear-gradient(180deg,#fafbfa 0%,#fff 100%)}',
      '#fbw-msgs::-webkit-scrollbar{width:4px}#fbw-msgs::-webkit-scrollbar-thumb{background:#ddd;border-radius:4px}',
      '.fbw-m{display:flex;gap:8px;max-width:90%;animation:fbwin .25s ease-out}',
      '@keyframes fbwin{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}',
      '.fbw-m.bot{align-self:flex-start}.fbw-m.usr{align-self:flex-end;flex-direction:row-reverse}',
      '.fbw-av2{width:26px;height:26px;border-radius:50%;background:'+CFG.lightGreen+';flex-shrink:0;margin-top:2px;display:flex;align-items:center;justify-content:center}',
      '.fbw-av2 svg{width:13px;height:13px;fill:'+CFG.green+'}',
      '.fbw-b{padding:9px 13px;border-radius:16px;font-size:14px;line-height:1.5;word-break:break-word}',
      '.bot .fbw-b{background:#f2f5f0;color:#1a1a1a;border-bottom-left-radius:5px}',
      '.usr .fbw-b{background:'+CFG.green+';color:#fff;border-bottom-right-radius:5px}',
      '.fbw-b strong{font-weight:600}',
      // Slot chips inline im Chat
      '.fbw-slots{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}',
      '.fbw-slot-chip{background:#fff;border:1.5px solid '+CFG.green+';color:'+CFG.darkGreen+';border-radius:12px;padding:7px 11px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s;line-height:1.3;text-align:center}',
      '.fbw-slot-chip:hover,.fbw-slot-chip:active{background:'+CFG.green+';color:#fff;transform:translateY(-1px)}',
      '.fbw-slot-chip.sel{background:'+CFG.green+';color:#fff;border-color:'+CFG.darkGreen+'}',
      '.fbw-opts{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}',
      '.fbw-opt-chip{background:#fff;border:1.5px solid '+CFG.green+';color:'+CFG.darkGreen+';border-radius:22px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s}',
      '.fbw-opt-chip:hover,.fbw-opt-chip:active{background:'+CFG.green+';color:#fff;transform:translateY(-1px)}',
      '.fbw-opt-chip.sel{background:'+CFG.green+';color:#fff;border-color:'+CFG.darkGreen+'}',
      // Typing
      '.fbw-typing{display:flex;align-items:center;gap:5px;padding:11px 14px;background:#f2f5f0;border-radius:16px;border-bottom-left-radius:5px}',
      '.fbw-typing span{width:7px;height:7px;border-radius:50%;background:#aaa;animation:fbwb 1.2s infinite}',
      '.fbw-typing span:nth-child(2){animation-delay:.2s}.fbw-typing span:nth-child(3){animation-delay:.4s}',
      '@keyframes fbwb{0%,60%,100%{transform:translateY(0);background:#bbb}30%{transform:translateY(-5px);background:'+CFG.green+'}}',
      // Quick replies - horizontal scrollbar statt umbrechen
      '#fbw-qr{padding:8px 12px;display:flex;gap:6px;flex-shrink:0;border-top:1px solid #eef0ec;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;background:#fafbfa}',
      '#fbw-qr::-webkit-scrollbar{display:none}',
      '.fbw-qb{background:#fff;border:1.5px solid '+CFG.green+';color:'+CFG.darkGreen+';border-radius:18px;padding:6px 12px;font-size:12.5px;font-weight:600;cursor:pointer;transition:all .15s;font-family:inherit;white-space:nowrap;flex-shrink:0}',
      '.fbw-qb:hover,.fbw-qb:active{background:'+CFG.green+';color:#fff}',
      // Input
      '#fbw-inp-area{display:flex;gap:8px;padding:10px 12px;border-top:1px solid #eef0ec;flex-shrink:0;align-items:flex-end;background:#fff}',
      '#fbw-inp{flex:1;border:1.5px solid #e5e7e3;border-radius:22px;padding:10px 15px;font-size:14px;font-family:inherit;outline:none;resize:none;max-height:90px;min-height:40px;line-height:1.45;transition:border-color .15s,background .15s;background:#f7f8f6;color:#1a1a1a}',
      '#fbw-inp:focus{border-color:'+CFG.green+';background:#fff}',
      '#fbw-inp::placeholder{color:#aaa}',
      '#fbw-send{width:40px;height:40px;border-radius:50%;background:'+CFG.green+';border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s,transform .15s}',
      '#fbw-send:hover:not(:disabled){background:'+CFG.darkGreen+';transform:scale(1.06)}',
      '#fbw-send:disabled{opacity:.4;cursor:not-allowed}',
      '#fbw-send svg{width:17px;height:17px;fill:#fff}',
      '#fbw-foot{text-align:center;padding:5px 0 6px;color:#bbb;font-size:10px;letter-spacing:.02em;flex-shrink:0;background:#fff}',
      // Mobile: fast Vollbild
      '@media(max-width:480px){',
      '  #fbw{bottom:14px;right:14px}',
      '  #fbw-win{width:calc(100vw - 16px);max-width:420px;height:calc(100vh - 90px);max-height:calc(100vh - 90px);right:-6px;bottom:68px;border-radius:18px}',
      '  #fbw-btn{width:54px;height:54px}',
      '  #fbw-btn svg{width:24px;height:24px}',
      '  .fbw-b{font-size:14.5px}',
      '  #fbw-msgs{padding:14px 12px 8px}',
      '}',
    ].join('');
    document.head.appendChild(s);
  }

  // ── DOM ──────────────────────────────────────────────────────────────────────
  function createDOM() {
    var c = document.createElement('div');
    c.id = 'fbw';
    c.innerHTML =
      '<div id="fbw-win" role="dialog" aria-label="fitbox KI-Assistent">' +
        '<div id="fbw-hdr">' +
          '<div id="fbw-av">'+svgUser()+'</div>' +
          '<div class="fbw-hi"><div class="fbw-hn">fitbox KI-Berater</div><div class="fbw-hs" id="fbw-status">Antwortet sofort</div></div>' +
          '<button class="fbw-hx" id="fbw-hx">'+svgX()+'</button>' +
        '</div>' +
        '<div id="fbw-msgs" role="log" aria-live="polite"></div>' +
        '<div id="fbw-qr"></div>' +
        '<div id="fbw-inp-area">' +
          '<textarea id="fbw-inp" placeholder="Schreib mir etwas..." rows="1" aria-label="Nachricht eingeben"></textarea>' +
          '<button id="fbw-send" aria-label="Senden">'+svgSend()+'</button>' +
        '</div>' +
        '<div id="fbw-foot">Powered by fitbox KI</div>' +
      '</div>' +
      '<button id="fbw-btn" aria-label="Chat öffnen">' +
        '<div id="fbw-pulse"></div>' +
        '<svg class="ic-chat" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>' +
        '<svg class="ic-close" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>' +
      '</button>';
    document.body.appendChild(c);
  }

  function svgUser() { return '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>'; }
  function svgX()    { return '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>'; }
  function svgSend() { return '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>'; }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function esc(t) { return String(t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function fmt(t) {
    var h = esc(t);
    h = h.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
    h = h.replace(/\*(.*?)\*/g,'<em>$1</em>');
    h = h.replace(/\n/g,'<br>');
    return h;
  }
  function toYMD(d) {
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  // Magicline liefert UTC-ISO-Strings (mit .000Z). Browser konvertiert automatisch nach lokaler Zeit.
  function fmtSlotLabel(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'2-digit'})
      +' um '+d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})+' Uhr';
  }
  function fmtSlotChip(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'})
      +'\n'+d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})+' Uhr';
  }
  function addMsg(role, text, meta) {
    msgs.push({ id: Date.now()+Math.random(), role: role, text: text, meta: meta||null });
  }

  // ── Slots laden ──────────────────────────────────────────────────────────────
  function loadSlots() {
    var today = new Date(); today.setHours(0,0,0,0);
    var end14 = new Date(today); end14.setDate(end14.getDate()+14);
    var startStr = toYMD(today);
    var endStr   = toYMD(end14);
    fetch(CFG.mlProxy+'/connect/v1/trialsession?studioId='+CFG.mlMemId+'&startDate='+startStr+'&endDate='+endStr)
      .then(function(r){ return r.json(); })
      .then(function(data){
        slotsMem = (data.slots||[])
          .map(function(s){ return s.startDateTime; })
          .sort();
        slotsLoaded = true;
        var st = document.getElementById('fbw-status');
        if (st) st.textContent = 'Antwortet sofort';
      })
      .catch(function(){
        slotsLoaded = true; // Weiter ohne Slots
      });
  }

  // ── Render Chat ──────────────────────────────────────────────────────────────
  function renderMsgs() {
    var box = document.getElementById('fbw-msgs');
    if (!box) return;
    var atBottom = box.scrollHeight - box.clientHeight - box.scrollTop < 80;

    msgs.forEach(function(m) {
      var id = 'fbwm-'+m.id;
      if (document.getElementById(id)) return;
      var wrap = document.createElement('div');
      wrap.id = id;

      if (m.role === 'bot') {
        wrap.className = 'fbw-m bot';
        var extras = '';
        // Slot-Chips wenn meta.slots vorhanden
        if (m.meta && m.meta.slots && m.meta.slots.length) {
          extras += '<div class="fbw-slots">';
          m.meta.slots.forEach(function(iso) {
            var label = fmtSlotChip(iso).replace('\n','<br>');
            extras += '<button class="fbw-slot-chip" data-iso="'+esc(iso)+'">'+label+'</button>';
          });
          extras += '</div>';
        }
        // Quick-Options (Studio waehlen, Ja/Nein etc.)
        if (m.meta && m.meta.options && m.meta.options.length) {
          extras += '<div class="fbw-opts">';
          m.meta.options.forEach(function(opt) {
            var lbl = typeof opt === 'string' ? opt : (opt.label || '');
            var val = typeof opt === 'string' ? opt : (opt.value || opt.label || '');
            extras += '<button class="fbw-opt-chip" data-val="'+esc(val)+'">'+esc(lbl)+'</button>';
          });
          extras += '</div>';
        }
        var bubbleHtml = '<div class="fbw-b">'+fmt(m.text)+extras+'</div>';
        wrap.innerHTML = '<div class="fbw-av2">'+svgUser()+'</div>'+bubbleHtml;

        // Slot-Chip click handler

      } else {
        wrap.className = 'fbw-m usr';
        wrap.innerHTML = '<div class="fbw-b">'+esc(m.text)+'</div>';
      }
      box.appendChild(wrap);
    });

    // Typing indicator
    var ty = document.getElementById('fbw-ty');
    if (isLoading && !ty) {
      var td = document.createElement('div');
      td.className = 'fbw-m bot'; td.id = 'fbw-ty';
      td.innerHTML = '<div class="fbw-av2">'+svgUser()+'</div><div class="fbw-typing"><span></span><span></span><span></span></div>';
      box.appendChild(td);
    } else if (!isLoading && ty) { ty.remove(); }

    if (atBottom || isLoading) box.scrollTop = box.scrollHeight;
  }

  function renderQR() {
    var el = document.getElementById('fbw-qr');
    if (!el) return;
    if (msgs.length > 2) { el.style.display='none'; return; }
    el.style.display='flex'; el.innerHTML='';
    QUICK_REPLIES.forEach(function(t) {
      var b = document.createElement('button');
      b.className='fbw-qb'; b.textContent=t;
      b.addEventListener('click', function(){ sendMsg(t); });
      el.appendChild(b);
    });
  }

  // ── API Call ─────────────────────────────────────────────────────────────────
  async function callKI(userText, overrideCollected) {
    var ctx = {
      slots_mem: slotsMem,
      collected: Object.assign({}, collected, overrideCollected||{})
    };

    var apiMsgs = msgs
      .filter(function(m){ return m.role !== 'system'; })
      .slice(-14)
      .map(function(m){ return { role: m.role==='bot'?'assistant':'user', content: m.text }; });

    var res = await fetch(CFG.supabaseUrl+'/functions/v1/ki-website', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+CFG.supabaseKey },
      body: JSON.stringify({ messages: apiMsgs, context: ctx })
    });
    return await res.json();
  }

  // ── Send Message ─────────────────────────────────────────────────────────────
  async function sendMsg(text, metaOverride) {
    text = (text||'').trim();
    if (!text || isLoading || bookingDone) return;
    clearInput();

    // Slot-Override direkt in collected mergen (vor dem API-Call)
    if (metaOverride) {
      Object.assign(collected, metaOverride);
    }

    addMsg('user', text);
    isLoading = true;
    renderMsgs();
    renderQR();

    var data;
    try {
      data = await callKI(text);
    } catch(e) {
      console.error('[fitbox chat]', e);
      isLoading = false;
      addMsg('bot', 'Entschuldigung, kurzer Verbindungsfehler. Versuch es nochmal oder ruf uns direkt an!');
      renderMsgs();
      return;
    }

    isLoading = false;

    // Collected aus KI-Antwort mergen (aber slot_datetime NUR aus slotsMem akzeptieren)
    if (data.collected) {
      var incoming = data.collected;
      var prevSlot = collected.slot_datetime;
      // slot_datetime validieren: muss exakt in slotsMem vorhanden sein
      if (incoming.slot_datetime && slotsMem.length > 0) {
        var validSlot = slotsMem.find(function(s) { return s === incoming.slot_datetime; });
        if (!validSlot) {
          incoming.slot_datetime = collected.slot_datetime || null;
        }
      }
      // Wenn KI slot_datetime auf null setzt (= Slot abgelehnt), alten Slot sperren
      if (prevSlot && (incoming.slot_datetime === null || incoming.slot_datetime !== prevSlot)) {
        if (rejectedSlots.indexOf(prevSlot) === -1) rejectedSlots.push(prevSlot);
      }
      Object.assign(collected, incoming);
    }

    // suggested_slots: NUR exakte ISO-Strings aus slotsMem akzeptieren
    var suggestedSlots = [];
    var rawSuggested = data.suggested_slots || [];
    if (rawSuggested.length > 0) {
      // Gegen slotsMem validieren -- nur echte Slots durchlassen
      suggestedSlots = rawSuggested.filter(function(s) {
        return slotsMem.indexOf(s) !== -1 && rejectedSlots.indexOf(s) === -1;
      });
    }
    // suggested_date_filter als Fallback NUR wenn KI keine suggested_slots gab
    if (suggestedSlots.length === 0 && data.suggested_date_filter && slotsMem.length > 0) {
      suggestedSlots = slotsMem.filter(function(s) {
        return s.startsWith(data.suggested_date_filter) && rejectedSlots.indexOf(s) === -1;
      }).slice(0, 6);
    }

    // Option-Chips (Studio, Ja/Nein etc.)
    var suggestedOpts = data.suggested_options || [];

    // Bei BOOK_PT: erst buchen, dann je nach Ergebnis Nachricht zeigen
    if (data.action === 'BOOK_PT') {
      // Loading-Bot-Nachricht zeigen
      isLoading = true;
      renderMsgs();
      var result = await executeBooking();
      isLoading = false;
      if (result.success) {
        if (result.senden) {
          // Senden: Anfrage entgegengenommen, Team meldet sich
          addMsg('bot', '🎉 Super, ' + (collected.firstName || '') + '! Deine Anfrage ist bei uns angekommen.\n\n📍 ' + result.studioName + (collected.slot_datetime ? '\n📅 Wunschtermin: ' + fmtSlotLabel(collected.slot_datetime) : '') + '\n\nUnser Team meldet sich so schnell wie möglich bei dir, um den Termin zu bestätigen. Bis bald! 💪');
        } else {
          // Memmingen: in Magicline gebucht
          addMsg('bot', '🎉 Super, ' + (collected.firstName || '') + '! Dein Probetraining ist bestätigt:\n\n📍 ' + result.studioName + '\n📅 ' + fmtSlotLabel(collected.slot_datetime) + '\n\nDu bekommst gleich eine Bestätigung per E-Mail. Bis bald! 💪');
        }
      } else {
        addMsg('bot', '😕 Leider konnte ich den Termin nicht direkt buchen: ' + result.error + '\n\nAber keine Sorge – ich habe deine Daten gespeichert und unser Team meldet sich so schnell wie möglich bei dir. Falls du einen anderen Termin probieren willst, sag einfach Bescheid!');
        // Slot zurücksetzen damit user andere Zeit wählen kann
        collected.slot_datetime = null;
        bookingDone = false;
      }
      renderMsgs();
      renderQR();
      return;
    }

    // Bot-Nachricht hinzufügen (kein BOOK_PT)
    var msgMeta = null;
    if (suggestedSlots.length) msgMeta = { slots: suggestedSlots };
    else if (suggestedOpts.length) msgMeta = { options: suggestedOpts };
    addMsg('bot', data.text || 'Entschuldigung, etwas ist schiefgelaufen.', msgMeta);
    renderMsgs();
    renderQR();
  }

  // ── Buchung über Edge Function ────────────────────────────────────────────
  // Ruft website-chat-booking auf -- diese Funktion erledigt:
  // - Magicline-Buchung (nur Memmingen)
  // - Lead in Supabase (mit Service-Role-Key)
  // - PT-Session anlegen ("Anstehende PTs")
  // - Activity-Log
  // - E-Mail-Benachrichtigung ans Studio
  async function executeBooking() {
    var c = collected;
    var studio = CFG.studios[c.studio] || CFG.studios.MEM;

    try {
      var res = await fetch(CFG.supabaseUrl+'/functions/v1/website-chat-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer '+CFG.supabaseKey
        },
        body: JSON.stringify({
          studio:        c.studio,
          slot_datetime: c.slot_datetime,
          firstName:     c.firstName,
          lastName:      c.lastName,
          phone:         c.phone,
          email:         c.email
        })
      });

      var data = await res.json();

      if (!res.ok || !data.ok) {
        return {
          success:    false,
          error:      data.error || 'Buchung fehlgeschlagen',
          studioName: studio.name
        };
      }

      // Bei Memmingen + Magicline-Fehler: Slot sperren, nicht als gebucht melden
      if (c.studio === 'MEM' && !data.magicline_booked) {
        if (c.slot_datetime && rejectedSlots.indexOf(c.slot_datetime) === -1) {
          rejectedSlots.push(c.slot_datetime);
        }
        return {
          success:    false,
          error:      'Der gewählte Termin ist leider nicht (mehr) verfügbar.',
          studioName: studio.name
        };
      }

      // Senden ist immer "erfolgreich" weil das Team manuell nachfasst
      bookingDone = true;
      return {
        success:    true,
        error:      null,
        studioName: data.studio || studio.name,
        senden:     c.studio === 'SEN'
      };
    } catch(e) {
      console.error('[fitbox chat] Buchungs-Fehler:', e);
      return {
        success:    false,
        error:      'Verbindungsproblem -- bitte später erneut versuchen.',
        studioName: studio.name
      };
    }
  }

  // ── UI Helpers ───────────────────────────────────────────────────────────────
  function clearInput() {
    var el = document.getElementById('fbw-inp');
    if (el) { el.value=''; el.style.height='auto'; }
  }

  function toggle() {
    isOpen = !isOpen;
    document.getElementById('fbw-btn').classList.toggle('open', isOpen);
    document.getElementById('fbw-win').classList.toggle('vis', isOpen);
    var p = document.getElementById('fbw-pulse'); if(p) p.style.display='none';

    if (isOpen && !greeted) {
      greeted = true;
      loadSlots();
      setTimeout(function(){
        addMsg('bot', 'Hi! 👋 Ich bin der **fitbox KI-Berater**.\n\nFragen zu EMS oder direkt ein **Probetraining** buchen? Sag mir einfach Bescheid! 💪');
        renderMsgs();
        renderQR();
      }, 300);
    }
    if (isOpen) { setTimeout(function(){ var el=document.getElementById('fbw-inp'); if(el) el.focus(); },350); }
  }

  // ── Events ───────────────────────────────────────────────────────────────────
  function bindEvents() {
    document.getElementById('fbw-btn').addEventListener('click', toggle);
    document.getElementById('fbw-hx').addEventListener('click', toggle);
    document.getElementById('fbw-send').addEventListener('click', function(){
      sendMsg(document.getElementById('fbw-inp').value);
    });
    var inp = document.getElementById('fbw-inp');
    inp.addEventListener('keydown', function(e){
      if (e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendMsg(inp.value); }
    });
    inp.addEventListener('input', function(){
      inp.style.height='auto';
      inp.style.height=Math.min(inp.scrollHeight,100)+'px';
    });
    document.addEventListener('keydown', function(e){ if(e.key==='Escape'&&isOpen) toggle(); });

    // Delegation fuer Slot-Chips und Option-Chips
    document.getElementById('fbw-msgs').addEventListener('click', function(e) {
      // Slot-Chip
      var slotChip = e.target.closest('.fbw-slot-chip');
      if (slotChip) {
        var bubble = slotChip.closest('.fbw-b');
        if (bubble) bubble.querySelectorAll('.fbw-slot-chip').forEach(function(c){ c.classList.remove('sel'); });
        slotChip.classList.add('sel');
        var iso = slotChip.getAttribute('data-iso');
        if (bubble) {
          bubble.querySelectorAll('.fbw-slot-chip').forEach(function(c){
            var s = c.getAttribute('data-iso');
            if (s && s !== iso && rejectedSlots.indexOf(s) === -1) rejectedSlots.push(s);
          });
        }
        sendMsg(fmtSlotLabel(iso), { slot_datetime: iso });
        return;
      }
      // Option-Chip (Studio, Ja/Nein etc.)
      var optChip = e.target.closest('.fbw-opt-chip');
      if (optChip) {
        var bubble2 = optChip.closest('.fbw-b');
        if (bubble2) bubble2.querySelectorAll('.fbw-opt-chip').forEach(function(c){ c.classList.remove('sel'); });
        optChip.classList.add('sel');
        var val = optChip.getAttribute('data-val');
        sendMsg(val);
      }
    });
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    if (document.getElementById('fbw')) return;
    injectStyles();
    createDOM();
    bindEvents();
    renderQR();
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
