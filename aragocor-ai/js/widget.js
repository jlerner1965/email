/* widget.js — the widget preview mode and the embed snippet.

   Preview mode is the same desk, shrunk into the footprint it will
   occupy on aragocorminerals.com, so the sales desk can see what a
   buyer sees before anything goes near the live site. */

window.Widget = (function () {

  var el = {};
  var on = false;

  function normaliseHost(raw) {
    var h = String(raw || '').trim();
    if (!h) h = 'https://aragocorminerals.com/ai/';
    if (h.charAt(h.length - 1) !== '/') h += '/';
    return h;
  }

  function snippet(host) {
    var h = normaliseHost(host);
    return '<script src="' + h + 'embed/aragocor-widget.js"\n' +
      '        data-host="' + h + '"\n' +
      '        data-accent="#5c3d91"\n' +
      '        data-label="Ask about minerals" defer><\/script>';
  }

  function paintSnippet() {
    if (!el.code) return;
    /* textContent, not innerHTML — the snippet is a script tag and the
       Copy button reads this node back verbatim. */
    el.code.textContent = snippet(el.hostInput ? el.hostInput.value : '');
  }

  function setMode(next) {
    on = next;
    document.body.classList.toggle('widget-mode', on);
    el.bubble.hidden = !on;
    el.deck.classList.toggle('is-hidden', on);   // opens closed, like the real thing
    el.toggle.textContent = on ? 'Full view' : 'Widget preview';
    el.toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function init(nodes) {
    el = nodes;

    var saved = Store.settings().embedHost;
    if (el.hostInput) {
      el.hostInput.value = saved;
      el.hostInput.addEventListener('input', paintSnippet);
      el.hostInput.addEventListener('change', function () {
        var h = normaliseHost(el.hostInput.value);
        el.hostInput.value = h;
        Store.settings({ embedHost: h });
        paintSnippet();
      });
    }
    paintSnippet();

    el.toggle.addEventListener('click', function () { setMode(!on); });
    el.bubble.addEventListener('click', function () {
      el.deck.classList.toggle('is-hidden');
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && on && !el.deck.classList.contains('is-hidden')) {
        el.deck.classList.add('is-hidden');
      }
    });
  }

  return { init: init, snippet: snippet, isOn: function () { return on; } };
})();
