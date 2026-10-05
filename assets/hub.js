/* StyleLab — поиск и фильтры главной страницы */
(function () {
  'use strict';
  var q = function (s, r) { return (r || document).querySelector(s); };
  var qa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var input = q('#q');
  var cards = qa('.hcard');
  var chips = qa('[data-chip]');
  var empty = q('#empty');
  var count = q('.hub__count');
  var group = 'все';
  var total = cards.length;

  function apply() {
    var term = (input && input.value || '').trim().toLowerCase();
    var shown = 0;
    cards.forEach(function (c) {
      var okGroup = group === 'все' || c.getAttribute('data-group') === group;
      var okTerm = !term || c.getAttribute('data-search').indexOf(term) > -1;
      var show = okGroup && okTerm;
      c.hidden = !show;
      if (show) shown++;
    });
    if (empty) empty.hidden = shown !== 0;
    if (count) count.textContent = shown + ' / ' + total;
  }

  if (input) {
    var t;
    input.addEventListener('input', function () { clearTimeout(t); t = setTimeout(apply, 90); });
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && document.activeElement !== input) { e.preventDefault(); input.focus(); }
      if (e.key === 'Escape' && document.activeElement === input) { input.value = ''; apply(); input.blur(); }
    });
  }

  chips.forEach(function (b) {
    b.addEventListener('click', function () {
      group = b.getAttribute('data-chip');
      chips.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      apply();
    });
  });

  /* мягкое появление карточек */
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var i = Number(el.getAttribute('data-i') || 0);
        setTimeout(function () { el.style.opacity = '1'; el.style.transform = 'none'; }, Math.min(i, 8) * 45);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    cards.forEach(function (c, i) {
      c.setAttribute('data-i', i);
      c.style.opacity = '0';
      c.style.transform = 'translateY(18px)';
      c.style.transition = 'opacity .55s cubic-bezier(.2,.7,.3,1), transform .55s cubic-bezier(.2,.7,.3,1)';
      io.observe(c);
    });
  }

  apply();
})();