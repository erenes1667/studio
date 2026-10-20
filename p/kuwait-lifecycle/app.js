(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* flow tabs */
  var tabs = $$('.flow-tab'), panels = $$('.flow-panel');
  function showFlow(id) {
    tabs.forEach(function (t) {
      var on = t.dataset.flow === id;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach(function (p) { p.hidden = p.id !== 'flow-' + id; });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { showFlow(t.dataset.flow); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var n = tabs[(i + d + tabs.length) % tabs.length];
      n.focus(); showFlow(n.dataset.flow);
    });
  });
  $$('.lane').forEach(function (l) {
    l.addEventListener('click', function () { showFlow(l.dataset.flow); });
  });
  function fromHash() {
    var m = /^#flow-(\w+)$/.exec(location.hash);
    if (m && $('#flow-' + m[1])) { showFlow(m[1]); var s = $('#flows'); if (s) s.scrollIntoView(); }
  }
  window.addEventListener('hashchange', fromHash);
  fromHash();

  /* step cards */
  function setCard(card, open) {
    var b = $('button', card), more = $('.more', card);
    card.classList.toggle('open', open);
    b.setAttribute('aria-expanded', open ? 'true' : 'false');
    more.hidden = !open;
  }
  $$('.card').forEach(function (card) {
    card.addEventListener('click', function (e) {
      if (e.target.closest('a')) return;
      setCard(card, !card.classList.contains('open'));
    });
  });
  $$('.expand-all').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var panel = btn.closest('.flow-panel');
      var cards = $$('.card', panel);
      var open = btn.dataset.state !== 'open';
      cards.forEach(function (c) { setCard(c, open); });
      btn.dataset.state = open ? 'open' : '';
      btn.textContent = open ? 'Collapse all steps' : 'Expand all steps';
    });
  });

  /* RTL toggle (emails and WhatsApp share one state) */
  var root = document.documentElement;
  var rtlBtns = $$('.rtl-toggle');
  function setRtl(on) {
    root.classList.toggle('is-rtl', on);
    $$('.mailf, .phone').forEach(function (el) { el.setAttribute('dir', on ? 'rtl' : 'ltr'); });
    rtlBtns.forEach(function (b) {
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.textContent = on ? 'Layout: RTL (mirrored)' : 'Layout: LTR (English)';
    });
  }
  rtlBtns.forEach(function (b) {
    b.addEventListener('click', function () { setRtl(!root.classList.contains('is-rtl')); });
  });
  setRtl(false);

  /* QA tag checklist */
  $$('.tagcheck details').forEach(function (d) {
    var boxes = $$('input[type=checkbox]', d), cnt = $('.cnt', d);
    function upd() {
      var n = boxes.filter(function (b) { return b.checked; }).length;
      cnt.textContent = n + ' of ' + boxes.length + ' checked';
    }
    boxes.forEach(function (b) {
      b.addEventListener('change', function () { b.closest('label').classList.toggle('done', b.checked); upd(); });
    });
    upd();
  });
})();
