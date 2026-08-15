/* app.js — wiring. Tabs, the thread, speech, files, settings, backup. */

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var attachments = [];
  var busy = false;

  /* ══ tiny markdown ═══════════════════════════════════════════ */

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function inline(s) {
    return esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  }

  function md(src) {
    var lines = String(src || '').replace(/\r/g, '').split('\n');
    var out = [], i = 0;

    while (i < lines.length) {
      var line = lines[i];

      if (!line.trim()) { i++; continue; }

      if (/^---+$/.test(line.trim())) { out.push('<hr>'); i++; continue; }

      if (/^#{1,6}\s/.test(line)) {
        out.push('<h4>' + inline(line.replace(/^#{1,6}\s/, '')) + '</h4>');
        i++; continue;
      }

      // pipe table
      if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) {
        var head = line.split('|').slice(1, -1).map(function (c) { return c.trim(); });
        i += 2;
        var rows = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
          rows.push(lines[i].split('|').slice(1, -1).map(function (c) { return c.trim(); }));
          i++;
        }
        var t = '<table class="assay"><thead><tr>' +
          head.map(function (h) { return '<th>' + inline(h) + '</th>'; }).join('') +
          '</tr></thead><tbody>' +
          rows.map(function (r) {
            return '<tr>' + r.map(function (c) { return '<td>' + inline(c) + '</td>'; }).join('') + '</tr>';
          }).join('') + '</tbody></table>';
        out.push(t);
        continue;
      }

      // lists
      if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
        var ordered = /^\s*\d+\.\s+/.test(line);
        var items = [];
        while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]))) {
          items.push('<li>' + inline(lines[i].replace(/^\s*(?:[-*]|\d+\.)\s+/, '')) + '</li>');
          i++;
        }
        out.push('<' + (ordered ? 'ol' : 'ul') + '>' + items.join('') + '</' + (ordered ? 'ol' : 'ul') + '>');
        continue;
      }

      // paragraph
      var para = [];
      while (i < lines.length && lines[i].trim() &&
             !/^#{1,6}\s/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i]) &&
             !/^\s*\d+\.\s+/.test(lines[i]) && !/^\s*\|.*\|\s*$/.test(lines[i]) &&
             !/^---+$/.test(lines[i].trim())) {
        para.push(lines[i]); i++;
      }
      out.push('<p>' + inline(para.join(' ')) + '</p>');
    }
    return out.join('');
  }

  function plain(src) {
    return String(src || '')
      .replace(/[|#*`>-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* ══ toast ═══════════════════════════════════════════════════ */

  var toastTimer;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }

  function copy(text, note) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(note || 'Copied'); },
        function () { toast('Copy blocked by the browser — select and copy manually.'); });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast(note || 'Copied'); }
      catch (e) { toast('Copy blocked by the browser.'); }
      document.body.removeChild(ta);
    }
  }

  /* ══ thread ══════════════════════════════════════════════════ */

  var WELCOME = '#### Aragocor sourcing desk\n' +
    'Ask about grades and assays, sieve and micron sizing, packing, cargo care, Incoterms, or how many containers a tonnage will take.\n\n' +
    '- *Typical assay for acid-grade fluorspar?*\n' +
    '- *How many 20\u2032 boxes for 640 MT of GCC in 1.0 MT bags?*\n' +
    '- *Convert 325 mesh to microns*\n' +
    '- *What does CIF Rotterdam actually cover?*\n\n' +
    'The desk runs offline by default. Add a Gemini key in settings for open-ended technical questions and to read attached COAs.';

  function turnHtml(turn, index) {
    if (turn.who === 'you') {
      return '<article class="turn turn--you"><div class="turn__who">You</div>' +
        '<div class="turn__body"><p>' + inline(turn.text).replace(/\n/g, '<br>') + '</p>' +
        (turn.files ? '<p><em>' + esc(turn.files) + '</em></p>' : '') + '</div></article>';
    }
    var seam = turn.seam || '#5c3d91';
    return '<article class="turn turn--desk" style="--seam:' + seam + '">' +
      '<div class="turn__who">Desk · ' + (turn.engine === 'live' ? 'live' : 'offline engine') + '</div>' +
      '<div class="turn__body">' + md(turn.text) + '</div>' +
      '<div class="turn__foot">' +
        '<button class="mini-btn" data-copyturn="' + index + '" type="button">Copy</button>' +
        '<button class="mini-btn" data-speakturn="' + index + '" type="button">Read aloud</button>' +
        '<button class="mini-btn" data-quote="" type="button">Request quote</button>' +
      '</div></article>';
  }

  function renderThread() {
    var host = $('thread');
    var turns = Store.thread();
    if (!turns.length) {
      host.innerHTML = '<article class="turn turn--desk"><div class="turn__who">Desk</div>' +
        '<div class="turn__body">' + md(WELCOME) + '</div></article>';
      return;
    }
    host.innerHTML = turns.map(turnHtml).join('');
    host.scrollTop = host.scrollHeight;
  }

  function speak(text) {
    if (!window.speechSynthesis) { toast('This browser has no speech synthesis.'); return; }
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(plain(text).slice(0, 4000));
    u.rate = 1.02;
    window.speechSynthesis.speak(u);
  }

  /* ══ sending ═════════════════════════════════════════════════ */

  function send(preset) {
    if (busy) return;
    var box = $('prompt');
    var text = (preset != null ? preset : box.value).trim();
    if (!text && !attachments.length) return;

    var fileNote = attachments.length
      ? attachments.map(function (a) { return a.name; }).join(', ')
      : '';

    Store.pushTurn({ who: 'you', text: text, files: fileNote });
    var history = Store.thread().slice(0, -1);
    box.value = ''; box.style.height = 'auto';

    var host = $('thread');
    renderThread();
    host.insertAdjacentHTML('beforeend',
      '<article class="turn turn--desk" id="pending"><div class="turn__who">Desk</div>' +
      '<div class="turn__body"><span class="thinking"><i></i><i></i><i></i></span></div></article>');
    host.scrollTop = host.scrollHeight;

    busy = true;
    $('sendBtn').disabled = true;

    var sent = attachments.slice();
    attachments = []; renderAttachments();

    Desk.ask(text, sent, history).then(function (res) {
      var m = Catalog.match(text);
      Store.pushTurn({
        who: 'desk', text: res.text, engine: res.engine,
        seam: m ? m.streak : '#5c3d91'
      });
      renderThread();
      if (Store.settings().autoSpeak) speak(res.text);
    }).catch(function (err) {
      Store.pushTurn({ who: 'desk', engine: 'offline', text: '#### Something broke\n`' + err.message + '`\n\nTry again, or switch the engine to offline in settings.' });
      renderThread();
    }).then(function () {
      busy = false;
      $('sendBtn').disabled = false;
      $('prompt').focus();
    });
  }

  /* ══ attachments ═════════════════════════════════════════════ */

  function renderAttachments() {
    var strip = $('attachStrip');
    if (!attachments.length) { strip.hidden = true; strip.innerHTML = ''; return; }
    strip.hidden = false;
    strip.innerHTML = attachments.map(function (a, i) {
      return '<span class="attach-pill">' + esc(a.name) +
        '<button data-dropfile="' + i + '" type="button" aria-label="Remove">×</button></span>';
    }).join('');
  }

  function addFiles(files) {
    Array.prototype.forEach.call(files, function (f) {
      if (f.size > 12 * 1024 * 1024) { toast(f.name + ' is over 12 MB — too big to attach.'); return; }
      var isText = /^text\//.test(f.type) || /\.(txt|csv|md)$/i.test(f.name);
      var reader = new FileReader();
      reader.onload = function () {
        attachments.push(isText
          ? { kind: 'text', name: f.name, mime: 'text/plain', data: String(reader.result).slice(0, 40000) }
          : { kind: 'binary', name: f.name, mime: f.type || 'application/octet-stream', data: String(reader.result).split(',')[1] });
        renderAttachments();
      };
      reader.onerror = function () { toast('Could not read ' + f.name); };
      if (isText) reader.readAsText(f); else reader.readAsDataURL(f);
    });
  }

  /* ══ speech input ════════════════════════════════════════════ */

  var recog = null;
  function setupMic() {
    var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    var btn = $('micBtn');
    if (!Rec) {
      btn.addEventListener('click', function () { toast('This browser has no speech recognition. Chrome and Edge do.'); });
      return;
    }
    recog = new Rec();
    recog.continuous = false;
    recog.interimResults = true;
    recog.lang = 'en-US';

    var base = '';
    recog.onstart = function () { btn.classList.add('is-hot'); base = $('prompt').value; };
    recog.onend = function () { btn.classList.remove('is-hot'); };
    recog.onerror = function (e) {
      btn.classList.remove('is-hot');
      toast(e.error === 'not-allowed' ? 'Microphone permission denied.' : 'Dictation stopped: ' + e.error);
    };
    recog.onresult = function (e) {
      var said = '';
      for (var i = 0; i < e.results.length; i++) said += e.results[i][0].transcript;
      var box = $('prompt');
      box.value = (base ? base + ' ' : '') + said;
      box.style.height = 'auto';
      box.style.height = Math.min(box.scrollHeight, 180) + 'px';
    };

    btn.addEventListener('click', function () {
      if (btn.classList.contains('is-hot')) { recog.stop(); return; }
      try { recog.start(); } catch (e) { /* already running */ }
    });
  }

  /* ══ tabs ════════════════════════════════════════════════════ */

  function showPanel(name) {
    document.querySelectorAll('.rail__tab').forEach(function (t) {
      t.classList.toggle('is-active', t.dataset.panel === name);
    });
    document.querySelectorAll('.panel').forEach(function (p) {
      p.classList.toggle('is-active', p.id === 'panel-' + name);
    });
    if (name === 'rfq') refreshRfqs();
    if (name === 'chat') { var h = $('thread'); h.scrollTop = h.scrollHeight; }
  }

  /* ══ catalog ═════════════════════════════════════════════════ */

  var CHIPS = [
    ['All', ''], ['Glass', 'glass'], ['Ceramics', 'ceramic'], ['Refractory', 'refractory'],
    ['Drilling', 'drilling'], ['Plastics', 'plastic'], ['Paint', 'paint'], ['Foundry', 'foundry']
  ];

  function drawCatalog() {
    var q = $('catalogSearch').value;
    var n = Catalog.render($('specimens'), q);
    $('catalogEmpty').hidden = n > 0;
  }

  function setupCatalog() {
    $('catalogChips').innerHTML = CHIPS.map(function (c, i) {
      return '<button class="chip' + (i === 0 ? ' is-on' : '') + '" data-q="' + c[1] + '" type="button">' + c[0] + '</button>';
    }).join('');

    $('catalogChips').addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      document.querySelectorAll('#catalogChips .chip').forEach(function (c) { c.classList.remove('is-on'); });
      chip.classList.add('is-on');
      $('catalogSearch').value = chip.dataset.q;
      drawCatalog();
    });

    $('catalogSearch').addEventListener('input', drawCatalog);
    drawCatalog();
  }

  /* ══ freight ═════════════════════════════════════════════════ */

  var lastPlan = null;

  function setupFreight() {
    $('fMineral').innerHTML = Catalog.all.map(function (m) {
      return '<option value="' + m.id + '">' + m.name + '</option>';
    }).join('');
    $('fPack').innerHTML = Object.keys(Catalog.packs).map(function (k) {
      return '<option value="' + k + '"' + (k === 'jumbo1' ? ' selected' : '') + '>' + Catalog.packs[k].label + '</option>';
    }).join('');
    $('fLoad').innerHTML = Freight.loadPorts.map(function (p) {
      return '<option value="' + p.id + '">' + p.name + '</option>';
    }).join('');
    $('fPort').innerHTML = Freight.destPorts.map(function (p) {
      return '<option value="' + p.id + '">' + p.name + '</option>';
    }).join('');

    $('freightForm').addEventListener('submit', function (e) {
      e.preventDefault();
      lastPlan = Freight.plan({
        tonnage: $('fTonnage').value,
        mineralId: $('fMineral').value,
        packId: $('fPack').value,
        loadId: $('fLoad').value,
        destId: $('fPort').value
      });
      $('freightOut').innerHTML = Freight.readout(lastPlan);
    });

    $('freightOut').addEventListener('click', function (e) {
      if (!lastPlan) return;
      if (e.target.id === 'planToRfq') {
        RFQ.open({
          mineralId: lastPlan.mineral.id,
          volume: lastPlan.tonnage,
          packId: lastPlan.pack.id,
          port: lastPlan.destPort,
          notes: Freight.summary(lastPlan)
        });
      }
      if (e.target.id === 'planToChat') {
        showPanel('chat');
        send('Review this shipment plan and flag anything that will cause trouble:\n\n' + Freight.summary(lastPlan));
      }
    });
  }

  /* ══ requests ════════════════════════════════════════════════ */

  function refreshRfqs() {
    var n = RFQ.renderList($('rfqList'));
    $('rfqCount').textContent = n ? n : '';
  }

  /* ══ settings ════════════════════════════════════════════════ */

  function paintStatus() {
    var s = Store.settings();
    var live = s.engine === 'live' && s.apiKey;
    $('statusPill').classList.toggle('is-live', !!live);
    $('statusLabel').textContent = live ? 'Live · ' + s.model.replace('gemini-', '') : 'Offline engine';
  }

  function setupSettings() {
    var s = Store.settings();
    document.querySelectorAll('input[name="engine"]').forEach(function (r) {
      r.checked = r.value === s.engine;
      r.addEventListener('change', function () {
        Store.settings({ engine: r.value });
        paintStatus();
      });
    });

    $('apiKey').value = s.apiKey;
    $('apiKey').addEventListener('change', function () {
      Store.settings({ apiKey: $('apiKey').value.trim() });
      paintStatus();
    });

    $('apiModel').value = s.model;
    $('apiModel').addEventListener('change', function () {
      Store.settings({ model: $('apiModel').value });
      paintStatus();
    });

    $('autoSpeak').checked = !!s.autoSpeak;
    $('autoSpeak').addEventListener('change', function () {
      Store.settings({ autoSpeak: $('autoSpeak').checked });
    });

    $('testKeyBtn').addEventListener('click', function () {
      var out = $('testResult');
      Store.settings({ apiKey: $('apiKey').value.trim() });
      if (!Store.settings().apiKey) { out.className = 'test-result bad'; out.textContent = 'No key entered.'; return; }
      out.className = 'test-result'; out.textContent = 'Checking…';
      Desk.testKey(Store.settings()).then(function (msg) {
        out.className = 'test-result ok'; out.textContent = 'Key works — ' + msg + '.';
      }).catch(function (err) {
        out.className = 'test-result bad'; out.textContent = err.message;
      });
    });

    function paintLead() {
      var mode = $('leadMode').value;
      $('leadEndpointField').hidden = mode === 'email';
      $('testEndpointBtn').disabled = mode === 'email';
      $('leadHint').textContent =
        mode === 'json'
          ? 'Formspree: https://formspree.io/f/xxxxxxxx. Any endpoint that accepts a JSON POST works — it receives the fields in RFQ.payload().'
          : mode === 'netlify'
            ? 'Usually just / on the deployed site. Deploy netlify-rfq.html alongside it so Netlify registers the form.'
            : '';
      RFQ.paintHint();
    }

    $('leadMode').value = s.leadMode;
    $('leadMode').addEventListener('change', function () {
      Store.settings({ leadMode: $('leadMode').value });
      $('endpointResult').textContent = '';
      paintLead();
    });

    $('leadEndpoint').value = s.leadEndpoint;
    $('leadEndpoint').addEventListener('change', function () {
      Store.settings({ leadEndpoint: $('leadEndpoint').value.trim() });
      RFQ.paintHint();
    });
    paintLead();

    $('testEndpointBtn').addEventListener('click', function () {
      var out = $('endpointResult');
      Store.settings({ leadEndpoint: $('leadEndpoint').value.trim() });
      if (!Store.settings().leadEndpoint) {
        out.className = 'test-result bad'; out.textContent = 'No endpoint URL entered.'; return;
      }
      out.className = 'test-result'; out.textContent = 'Sending…';
      RFQ.testEndpoint().then(function (msg) {
        out.className = 'test-result ok'; out.textContent = msg;
      }).catch(function (err) {
        out.className = 'test-result bad'; out.textContent = err.message;
      });
    });

    $('exportJson').addEventListener('click', function () {
      var blob = new Blob([JSON.stringify(Store.dump(), null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'aragocor-desk-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      toast('Backup downloaded');
    });

    $('importJson').addEventListener('click', function () { $('importFile').click(); });
    $('importFile').addEventListener('change', function (e) {
      var f = e.target.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          Store.restore(JSON.parse(r.result));
          renderThread(); refreshRfqs(); setupSettings(); paintStatus();
          toast('Backup restored');
        } catch (err) { toast('That file is not a desk backup.'); }
      };
      r.readAsText(f);
      e.target.value = '';
    });

    $('exportMd').addEventListener('click', function () {
      var turns = Store.thread();
      if (!turns.length) { toast('Nothing to export yet.'); return; }
      var doc = '# Aragocor Minerals — desk transcript\n\n_' + new Date().toUTCString() + '_\n\n' +
        turns.map(function (t) {
          return (t.who === 'you' ? '## Buyer\n\n' : '## Desk\n\n') + t.text + '\n';
        }).join('\n---\n\n');
      var blob = new Blob([doc], { type: 'text/markdown' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'aragocor-transcript-' + new Date().toISOString().slice(0, 10) + '.md';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      toast('Transcript downloaded');
    });

    $('clearAll').addEventListener('click', function () {
      if (!window.confirm('Clear the conversation, every saved request and the API key from this browser? This cannot be undone.')) return;
      Store.wipe();
      renderThread(); refreshRfqs(); paintStatus();
      $('apiKey').value = '';
      toast('Everything cleared');
    });
  }

  /* ══ global clicks ═══════════════════════════════════════════ */

  function setupDelegates() {
    document.addEventListener('click', function (e) {
      var t = e.target.closest('button');
      if (!t) return;

      if (t.dataset.panel) { showPanel(t.dataset.panel); return; }

      if (t.dataset.ask) {
        var m = Catalog.byId(t.dataset.ask);
        showPanel('chat');
        send('Give me the full assay, grades and packing options for ' + m.name.toLowerCase() + '.');
        return;
      }

      if (t.hasAttribute('data-quote')) {
        RFQ.open(t.dataset.quote ? { mineralId: t.dataset.quote } : {});
        return;
      }

      if (t.dataset.copyturn) {
        var turn = Store.thread()[Number(t.dataset.copyturn)];
        if (turn) copy(turn.text, 'Answer copied');
        return;
      }

      if (t.dataset.speakturn) {
        var st = Store.thread()[Number(t.dataset.speakturn)];
        if (st) speak(st.text);
        return;
      }

      if (t.dataset.dropfile) {
        attachments.splice(Number(t.dataset.dropfile), 1);
        renderAttachments();
        return;
      }

      if (t.dataset.retryrfq) {
        RFQ.retry(t.dataset.retryrfq).then(function (out) {
          toast(out.ok ? 'Delivered to the sales desk' : 'Still not delivered — ' + (out.error || 'check the endpoint'));
        });
        return;
      }

      if (t.dataset.resend) {
        var r = RFQ.byId(t.dataset.resend);
        if (r) window.location.href = RFQ.mailto(r);
        return;
      }

      if (t.dataset.copyrfq) {
        var rc = RFQ.byId(t.dataset.copyrfq);
        if (rc) copy(RFQ.emailBody(rc), 'Request details copied');
        return;
      }

      if (t.dataset.copy) {
        copy($(t.dataset.copy).textContent, 'Snippet copied');
        return;
      }
    });
  }

  /* ══ boot ════════════════════════════════════════════════════ */

  function boot() {
    var box = $('prompt');
    box.addEventListener('input', function () {
      box.style.height = 'auto';
      box.style.height = Math.min(box.scrollHeight, 180) + 'px';
    });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    $('sendBtn').addEventListener('click', function () { send(); });
    $('attachBtn').addEventListener('click', function () { $('fileInput').click(); });
    $('fileInput').addEventListener('change', function (e) { addFiles(e.target.files); e.target.value = ''; });
    $('statusPill').addEventListener('click', function () { showPanel('settings'); });

    RFQ.init({
      scrim: $('rfqScrim'), form: $('rfqForm'), close: $('rfqClose'), cancel: $('rfqCancel'),
      name: $('rName'), company: $('rCompany'), email: $('rEmail'), phone: $('rPhone'),
      mineral: $('rMineral'), volume: $('rVolume'), mesh: $('rMesh'), pack: $('rPack'),
      incoterm: $('rIncoterm'), port: $('rPort'), notes: $('rNotes'),
      portList: $('portList'), hint: $('rfqHint')
    }, function (r, emailOnly) {
      refreshRfqs();
      showPanel('rfq');
      toast(emailOnly
        ? 'Request ' + r.id + ' saved — opening your email'
        : 'Request ' + r.id + ' raised — sending to the desk');
    }, refreshRfqs);

    Widget.init({
      toggle: $('toggleWidgetView'), bubble: $('bubble'),
      deck: document.querySelector('.deck'),
      code: $('embedSnippet'), hostInput: $('embedHost')
    });

    setupCatalog();
    setupFreight();
    setupSettings();
    setupDelegates();
    setupMic();
    renderThread();
    refreshRfqs();
    paintStatus();

    if (/[?&]embed=1/.test(window.location.search)) {
      $('toggleWidgetView').hidden = true;
      document.documentElement.style.setProperty('--rail-w', '150px');
    }

    var stuck = RFQ.flushQueue();
    if (stuck) toast('Resending ' + stuck + ' request' + (stuck > 1 ? 's' : '') + ' from last time');

    if (!Store.persistent()) {
      toast('This browser is blocking storage — the conversation will not survive a reload.');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
