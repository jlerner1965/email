/* rfq.js — the point where a conversation becomes a sales lead.

   Capture order matters here. The request is written to local storage
   FIRST, then posted to the endpoint, then the mail client is offered.
   If the network drops or the buyer closes the tab, the request still
   exists and gets retried on the next load. Nothing depends on the
   buyer remembering to press send. */

window.RFQ = (function () {

  var SALES = 'sales@aragocorminerals.com';
  var INCOTERMS = ['CIF', 'CFR', 'FOB', 'FCA', 'EXW', 'DAP'];
  var FORM_NAME = 'aragocor-rfq';   // must match netlify-rfq.html

  var el = {};
  var onSaved = null;
  var onChanged = null;

  function id() {
    return 'RFQ-AGM-' + String(Math.floor(100000 + Math.random() * 900000));
  }

  /* ── form population ───────────────────────────────────────── */

  function fill() {
    el.mineral.innerHTML = Catalog.all.map(function (m) {
      return '<optgroup label="' + m.name + '">' +
        m.grades.map(function (g) {
          return '<option value="' + m.id + '::' + g + '">' + g + '</option>';
        }).join('') + '</optgroup>';
    }).join('');

    el.pack.innerHTML = Object.keys(Catalog.packs).map(function (k) {
      return '<option value="' + k + '">' + Catalog.packs[k].label + '</option>';
    }).join('');

    el.incoterm.innerHTML = INCOTERMS.map(function (t) {
      return '<option value="' + t + '"' + (t === 'CIF' ? ' selected' : '') + '>' + t + '</option>';
    }).join('');

    el.portList.innerHTML = Freight.destPorts.map(function (p) {
      return '<option value="' + p.name + '"></option>';
    }).join('');
  }

  function open(prefill) {
    prefill = prefill || {};
    if (prefill.mineralId) {
      var opts = el.mineral.options;
      for (var i = 0; i < opts.length; i++) {
        if (opts[i].value.indexOf(prefill.mineralId + '::') === 0) { el.mineral.selectedIndex = i; break; }
      }
    }
    if (prefill.volume) el.volume.value = prefill.volume;
    if (prefill.packId) el.pack.value = prefill.packId;
    if (prefill.port) el.port.value = prefill.port;
    if (prefill.mesh) el.mesh.value = prefill.mesh;
    if (prefill.notes) el.notes.value = prefill.notes;

    paintHint();
    el.scrim.hidden = false;
    setTimeout(function () { el.name.focus(); }, 20);
  }

  function close() { el.scrim.hidden = true; }

  function paintHint() {
    if (!el.hint) return;
    var s = Store.settings();
    el.hint.textContent = s.leadMode === 'email' || !s.leadEndpoint
      ? 'Creates a tracking ID and opens an email to ' + SALES + '. You send it.'
      : 'Creates a tracking ID and sends the request straight to the sales desk.';
  }

  /* ── the wire formats ──────────────────────────────────────── */

  function payload(r) {
    return {
      trackingId: r.id,
      raisedAt: r.at,
      source: 'Aragocor Minerals AI sourcing desk',
      page: (window.location !== window.parent.location ? document.referrer : window.location.href) || '',
      name: r.name,
      company: r.company,
      email: r.email,
      phone: r.phone || '',
      mineral: r.mineralName,
      grade: r.grade,
      volumeMT: r.volume,
      particleSize: r.mesh || '',
      packing: r.packLabel,
      incoterm: r.incoterm,
      destinationPort: r.port || '',
      notes: r.notes || '',
      _subject: r.id + ' · ' + r.volume + ' MT ' + r.mineralName
    };
  }

  function urlencode(obj) {
    return Object.keys(obj).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]);
    }).join('&');
  }

  /* Posts one request. Resolves with {ok:true} or {ok:false, error}.
     Never rejects — the caller always gets a status to store. */
  function post(r) {
    var s = Store.settings();
    var mode = s.leadMode;
    var url = (s.leadEndpoint || '').trim();

    if (mode === 'email' || !url) {
      return Promise.resolve({ ok: true, skipped: true });
    }

    var body, headers;
    if (mode === 'netlify') {
      var flat = payload(r);
      flat['form-name'] = FORM_NAME;
      delete flat._subject;
      body = urlencode(flat);
      headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    } else {
      body = JSON.stringify(payload(r));
      headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    }

    return fetch(url, { method: 'POST', headers: headers, body: body })
      .then(function (res) {
        if (res.ok) return { ok: true };
        return res.text().then(function (t) {
          var msg = 'HTTP ' + res.status;
          try {
            var j = JSON.parse(t);
            if (j.error) msg = j.error;
            else if (j.errors && j.errors.length) msg = j.errors.map(function (e) { return e.message || e; }).join('; ');
          } catch (e) { if (t && t.length < 160) msg += ' — ' + t; }
          return { ok: false, error: msg };
        });
      })
      .catch(function (err) {
        return { ok: false, error: err.message === 'Failed to fetch'
          ? 'Could not reach the endpoint — check the URL and its CORS settings.'
          : err.message };
      });
  }

  /* ── send + retry ──────────────────────────────────────────── */

  function deliver(r) {
    return post(r).then(function (out) {
      Store.updateRfq(r.id, out.ok
        ? { status: out.skipped ? 'email' : 'sent', error: '', sentAt: new Date().toISOString() }
        : { status: 'failed', error: out.error, tries: (r.tries || 0) + 1 });
      if (onChanged) onChanged();
      return out;
    });
  }

  function retry(rid) {
    var r = byId(rid);
    if (!r) return Promise.resolve({ ok: false });
    Store.updateRfq(rid, { status: 'pending', error: '' });
    if (onChanged) onChanged();
    return deliver(r);
  }

  /* Anything left pending or failed from a previous session goes out
     again on load. Cheap, and it means a flaky connection at the
     buyer's end doesn't cost you the lead. */
  function flushQueue() {
    var s = Store.settings();
    if (s.leadMode === 'email' || !s.leadEndpoint) return;
    var stuck = Store.rfqs().filter(function (r) {
      return (r.status === 'pending' || r.status === 'failed') && (r.tries || 0) < 5;
    });
    stuck.forEach(function (r) { deliver(r); });
    return stuck.length;
  }

  function testEndpoint() {
    var probe = {
      id: 'RFQ-AGM-TEST01', at: new Date().toISOString(),
      name: 'Endpoint test', company: 'Aragocor Minerals',
      email: SALES, phone: '', mineralId: 'silica',
      mineralName: 'High-purity silica quartz', grade: 'Glass grade (SiO₂ ≥ 99.5%)',
      volume: '1', mesh: '200 mesh', packId: 'jumbo1',
      packLabel: '1.0 MT jumbo bag (FIBC)', incoterm: 'CIF', port: 'Rotterdam, NL',
      notes: 'Test message from the sourcing desk. Safe to delete.'
    };
    return post(probe).then(function (out) {
      if (out.skipped) throw new Error('No endpoint set — capture is set to email only.');
      if (!out.ok) throw new Error(out.error);
      return 'Test request accepted — check the inbox or dashboard for RFQ-AGM-TEST01.';
    });
  }

  /* ── save ──────────────────────────────────────────────────── */

  function save(e) {
    e.preventDefault();
    var s = Store.settings();
    var emailOnly = s.leadMode === 'email' || !s.leadEndpoint;
    var pair = el.mineral.value.split('::');
    var m = Catalog.byId(pair[0]);
    var pk = Catalog.packs[el.pack.value];

    var r = {
      id: id(),
      at: new Date().toISOString(),
      status: emailOnly ? 'email' : 'pending',
      error: '',
      tries: 0,
      name: el.name.value.trim(),
      company: el.company.value.trim(),
      email: el.email.value.trim(),
      phone: el.phone.value.trim(),
      mineralId: m.id,
      mineralName: m.name,
      grade: pair[1] || m.grades[0],
      volume: el.volume.value,
      mesh: el.mesh.value.trim(),
      packId: pk.id,
      packLabel: pk.label,
      incoterm: el.incoterm.value,
      port: el.port.value.trim(),
      notes: el.notes.value.trim()
    };

    Store.pushRfq(r);          // saved before anything can fail
    el.form.reset();
    close();
    if (onSaved) onSaved(r, emailOnly);

    deliver(r);
    if (emailOnly) window.location.href = mailto(r);
    return r;
  }

  /* ── email handoff (still available on every request) ──────── */

  function emailBody(r) {
    return [
      'REQUEST FOR QUOTATION',
      'Tracking ID: ' + r.id,
      'Raised: ' + new Date(r.at).toUTCString(),
      '',
      'BUYER',
      'Name:      ' + r.name,
      'Company:   ' + r.company,
      'Email:     ' + r.email,
      'Phone:     ' + (r.phone || '—'),
      '',
      'REQUIREMENT',
      'Mineral:   ' + r.mineralName,
      'Grade:     ' + r.grade,
      'Volume:    ' + r.volume + ' MT',
      'Size:      ' + (r.mesh || 'to advise'),
      'Packing:   ' + r.packLabel,
      'Incoterms: ' + r.incoterm + ' ' + (r.port || '(port to advise)'),
      '',
      'NOTES',
      (r.notes || '—'),
      '',
      '— Raised from the Aragocor Minerals AI sourcing desk'
    ].join('\n');
  }

  function mailto(r) {
    return 'mailto:' + SALES +
      '?subject=' + encodeURIComponent(r.id + ' · ' + r.volume + ' MT ' + r.mineralName) +
      '&body=' + encodeURIComponent(emailBody(r));
  }

  /* ── list ──────────────────────────────────────────────────── */

  var BADGE = {
    sent:    ['Delivered', 'is-sent'],
    pending: ['Sending…', 'is-pending'],
    failed:  ['Not delivered', 'is-failed'],
    email:   ['Email handoff', 'is-email']
  };

  function cardHtml(r) {
    var when = new Date(r.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    var st = BADGE[r.status] || BADGE.email;
    return '' +
      '<article class="rfq rfq--' + (r.status || 'email') + '">' +
        '<div class="rfq__head">' +
          '<span class="rfq__id">' + r.id + '</span>' +
          '<span class="rfq__status ' + st[1] + '">' + st[0] + '</span>' +
          '<span class="rfq__when">' + when + '</span>' +
        '</div>' +
        '<div class="rfq__line">' + r.volume + ' MT · ' + r.mineralName + '</div>' +
        '<div class="rfq__meta">' + r.grade + ' · ' + (r.mesh || 'size to advise') + ' · ' +
          r.packLabel + ' · ' + r.incoterm + ' ' + (r.port || 'port to advise') + '</div>' +
        '<div class="rfq__meta">' + r.name + ', ' + r.company + ' · ' + r.email + '</div>' +
        (r.status === 'failed'
          ? '<p class="rfq__error">Endpoint said: ' + r.error + '</p>' : '') +
        '<div class="rfq__acts">' +
          (r.status === 'failed'
            ? '<button class="solid-btn" data-retryrfq="' + r.id + '" type="button">Send again</button>' : '') +
          '<button class="ghost-btn" data-resend="' + r.id + '" type="button">Open email</button>' +
          '<button class="ghost-btn" data-copyrfq="' + r.id + '" type="button">Copy details</button>' +
        '</div>' +
      '</article>';
  }

  function renderList(host) {
    var list = Store.rfqs();
    if (!list.length) {
      host.innerHTML = '<p class="empty">No requests yet. Raise one from a catalog card, from a freight plan, ' +
        'or with the button above — each gets a tracking ID you can quote to the sales desk.</p>';
      return 0;
    }
    host.innerHTML = list.map(cardHtml).join('');
    return list.length;
  }

  function byId(rid) {
    return Store.rfqs().filter(function (r) { return r.id === rid; })[0] || null;
  }

  function init(nodes, savedCallback, changedCallback) {
    el = nodes;
    onSaved = savedCallback;
    onChanged = changedCallback;
    fill();
    paintHint();
    el.form.addEventListener('submit', save);
    el.close.addEventListener('click', close);
    el.cancel.addEventListener('click', close);
    el.scrim.addEventListener('mousedown', function (e) { if (e.target === el.scrim) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !el.scrim.hidden) close();
    });
  }

  return {
    init: init, open: open, close: close, renderList: renderList,
    byId: byId, mailto: mailto, emailBody: emailBody, payload: payload,
    retry: retry, flushQueue: flushQueue, testEndpoint: testEndpoint,
    paintHint: paintHint, sales: SALES, formName: FORM_NAME
  };
})();
