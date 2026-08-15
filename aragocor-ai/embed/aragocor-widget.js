/* aragocor-widget.js — the one-tag loader for aragocorminerals.com.

   Paste this before </body> on every page:

     <script src="https://aragocorminerals.com/ai/embed/aragocor-widget.js"
             data-host="https://aragocorminerals.com/ai/"
             data-accent="#5c3d91"
             data-label="Ask about minerals" defer></script>

   Options: data-side="left", data-accent, data-label.

   Everything lives inside a shadow root, so the widget cannot inherit
   the site's CSS and the site cannot inherit the widget's. The desk
   itself runs in an iframe — one origin, one copy, no duplicated state. */

(function () {
  'use strict';

  if (window.__aragocorWidget) return;    // one per page, however many tags
  window.__aragocorWidget = true;

  /* ── find our own tag ──────────────────────────────────────── */

  var tag = document.currentScript;
  if (!tag) {
    var all = document.getElementsByTagName('script');
    for (var i = all.length - 1; i >= 0; i--) {
      if (/aragocor-widget\.js/.test(all[i].src)) { tag = all[i]; break; }
    }
  }
  if (!tag) return;

  function attr(name, fallback) {
    var v = tag.getAttribute('data-' + name);
    return v === null || v === '' ? fallback : v;
  }

  var host = attr('host', tag.src.replace(/embed\/aragocor-widget\.js.*$/, ''));
  if (host.charAt(host.length - 1) !== '/') host += '/';

  var accent = attr('accent', '#5c3d91');
  var label = attr('label', 'Ask about minerals');
  var side = attr('side', 'right') === 'left' ? 'left' : 'right';

  /* An accent from a page author goes straight into a stylesheet, so it
     has to look like a colour and nothing else. */
  if (!/^(#[0-9a-fA-F]{3,8}|rgba?\([\d\s.,%/]+\)|hsla?\([\d\s.,%/]+\)|[a-zA-Z]{3,20})$/.test(accent)) {
    accent = '#5c3d91';
  }

  /* ── mount ─────────────────────────────────────────────────── */

  function mount() {
    var mountEl = document.createElement('div');
    mountEl.setAttribute('data-aragocor-widget', '');
    mountEl.style.cssText = 'all:initial';
    document.body.appendChild(mountEl);

    var root = mountEl.attachShadow ? mountEl.attachShadow({ mode: 'open' }) : mountEl;

    var css =
      ':host,*{box-sizing:border-box}' +
      '.bub{position:fixed;z-index:2147483000;' + side + ':24px;bottom:24px;width:56px;height:56px;' +
        'border-radius:50%;border:0;cursor:pointer;background:' + accent + ';color:#fff;' +
        'display:grid;place-items:center;box-shadow:0 8px 22px rgba(22,33,43,.28);' +
        'transition:transform .15s ease,box-shadow .15s ease;padding:0}' +
      '.bub:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(22,33,43,.32)}' +
      '.bub:focus-visible{outline:3px solid ' + accent + ';outline-offset:3px}' +
      '.bub svg{width:26px;height:26px;display:block}' +
      '.bub .x{display:none}' +
      '.panel{position:fixed;z-index:2147482999;' + side + ':24px;bottom:94px;' +
        'width:392px;max-width:calc(100vw - 32px);' +
        'height:600px;max-height:calc(100vh - 140px);' +
        'background:#e5e8e2;border:1px solid #c9cfc6;border-radius:3px;overflow:hidden;' +
        'box-shadow:0 20px 50px rgba(22,33,43,.26);' +
        'display:none;flex-direction:column}' +
      '.bar{flex:0 0 auto;display:flex;align-items:center;gap:8px;height:42px;padding:0 8px 0 14px;' +
        'background:#f7f8f5;border-bottom:1px solid #c9cfc6;' +
        'font:600 13px/1 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#16212b}' +
      '.bar .sub{font-weight:400;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#7d8a93}' +
      '.bar button{margin-left:auto;background:none;border:0;cursor:pointer;color:#4c5a66;' +
        'width:28px;height:28px;display:grid;place-items:center;border-radius:2px;padding:0}' +
      '.bar button:hover{color:' + accent + ';background:#ede8f6}' +
      '.bar button svg{width:16px;height:16px;display:block}' +
      'iframe{flex:1 1 auto;width:100%;border:0;display:block;background:#e5e8e2}' +
      '@media (max-width:520px){' +
        '.panel{' + side + ':12px;bottom:86px;width:calc(100vw - 24px);height:calc(100vh - 110px)}' +
        '.bub{' + side + ':16px;bottom:16px}}' +
      '@media (prefers-reduced-motion:reduce){.bub{transition:none}}';

    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<style>' + css + '</style>' +
      '<div class="panel" role="dialog" aria-label="Aragocor Minerals sourcing desk">' +
        '<div class="bar">Aragocor Minerals <span class="sub">sourcing desk</span>' +
          '<button type="button" aria-label="Close">' +
            '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">' +
            '<path d="M5 5l10 10M15 5L5 15"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<button class="bub" type="button" aria-expanded="false">' +
        '<svg class="glyph" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">' +
        '<path d="M16 3 L27 11 L22.5 27 L9.5 27 L5 11 Z"/></svg>' +
        '<svg class="x" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round">' +
        '<path d="M5 5l10 10M15 5L5 15"/></svg>' +
      '</button>';

    while (wrap.firstChild) root.appendChild(wrap.firstChild);

    var panel = root.querySelector('.panel');
    var bubble = root.querySelector('.bub');
    var closeBtn = root.querySelector('.bar button');
    var frame = null;
    var open = false;

    bubble.setAttribute('aria-label', label);
    bubble.setAttribute('title', label);

    function setOpen(next) {
      open = next;
      panel.style.display = open ? 'flex' : 'none';
      bubble.setAttribute('aria-expanded', open ? 'true' : 'false');
      root.querySelector('.glyph').style.display = open ? 'none' : 'block';
      root.querySelector('.x').style.display = open ? 'block' : 'none';

      /* The iframe is created on first open, so a page that nobody
         clicks costs one script tag and nothing else. */
      if (open && !frame) {
        frame = document.createElement('iframe');
        frame.src = host + 'index.html?embed=1';
        frame.title = 'Aragocor Minerals sourcing desk';
        frame.setAttribute('allow', 'microphone; clipboard-write');
        frame.setAttribute('loading', 'lazy');
        panel.appendChild(frame);
      }
    }

    bubble.addEventListener('click', function () { setOpen(!open); });
    closeBtn.addEventListener('click', function () { setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) setOpen(false);
    });

    setOpen(false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
