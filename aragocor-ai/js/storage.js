/* storage.js — one place that owns persistence.
   Falls back to memory when localStorage is blocked (private mode,
   sandboxed iframes, some embed contexts). Nothing else in the app
   should touch localStorage directly. */

window.Store = (function () {
  var KEY = 'aragocor.desk.v1';
  var mem = null;
  var usable = true;

  var DEFAULTS = {
    settings: {
      engine: 'offline',
      apiKey: '',
      model: 'gemini-2.5-flash',
      autoSpeak: false,
      embedHost: 'https://aragocorminerals.com/ai/',
      leadMode: 'email',      // email | json | netlify
      leadEndpoint: ''
    },
    thread: [],
    rfqs: []
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function read() {
    if (mem) return mem;
    var raw = null;
    try { raw = window.localStorage.getItem(KEY); }
    catch (e) { usable = false; }
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        mem = {
          settings: Object.assign(clone(DEFAULTS.settings), parsed.settings || {}),
          thread: parsed.thread || [],
          rfqs: parsed.rfqs || []
        };
        return mem;
      } catch (e) { /* corrupt payload — start clean */ }
    }
    mem = clone(DEFAULTS);
    return mem;
  }

  function flush() {
    if (!usable) return;
    try { window.localStorage.setItem(KEY, JSON.stringify(mem)); }
    catch (e) { usable = false; }
  }

  return {
    settings: function (patch) {
      var s = read().settings;
      if (patch) { Object.assign(s, patch); flush(); }
      return s;
    },
    thread: function () { return read().thread; },
    pushTurn: function (turn) { read().thread.push(turn); flush(); return turn; },
    clearThread: function () { read().thread = []; flush(); },

    rfqs: function () { return read().rfqs; },
    pushRfq: function (rfq) { read().rfqs.unshift(rfq); flush(); return rfq; },
    updateRfq: function (id, patch) {
      var list = read().rfqs;
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) { Object.assign(list[i], patch); flush(); return list[i]; }
      }
      return null;
    },

    dump: function () {
      var d = read();
      return {
        app: 'Aragocor Minerals AI sourcing desk',
        version: 1,
        exportedAt: new Date().toISOString(),
        // the API key is deliberately left out of backups
        settings: Object.assign({}, d.settings, { apiKey: '' }),
        thread: d.thread,
        rfqs: d.rfqs
      };
    },
    restore: function (payload) {
      if (!payload || typeof payload !== 'object') throw new Error('Not a desk backup file.');
      var keep = read().settings.apiKey;
      mem = {
        settings: Object.assign(clone(DEFAULTS.settings), payload.settings || {}, { apiKey: keep }),
        thread: Array.isArray(payload.thread) ? payload.thread : [],
        rfqs: Array.isArray(payload.rfqs) ? payload.rfqs : []
      };
      flush();
    },
    wipe: function () { mem = clone(DEFAULTS); flush(); },
    persistent: function () { read(); return usable; }
  };
})();
