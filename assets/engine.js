/* StyleLab Engine — анимации и интерактив, без зависимостей.
   Всё включается через data-атрибуты на элементах. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var doc = document;
  var q = function (s, r) { return (r || doc).querySelector(s); };
  var qa = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };

  /* -------------------------------------------------- появление при скролле */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }) : null;

  function observe(root) {
    qa('[data-reveal],[data-stagger],[data-count],[data-chart]', root || doc).forEach(function (el) {
      if (reduced) { el.classList.add('is-in'); return; }
      if (io) io.observe(el); else el.classList.add('is-in');
    });
  }

  /* бесконечная нумерация задержек внутри контейнера со stagger */
  function reindex(root) {
    qa('[data-reveal]', root || doc).forEach(function (el, i) {
      if (el.hasAttribute('data-reveal-delay')) return;
      var sibs = el.parentElement ? qa('[data-reveal]', el.parentElement) : [];
      if (sibs.length > 1 && sibs.length <= 8) el.style.setProperty('--rv-delay', (i * 70) + 'ms');
    });
  }

  /* ------------------------------------------------------------ счётчики */
  function runCount(el) {
    var raw = el.getAttribute('data-count') || '0';
    var pre = el.getAttribute('data-prefix') || '';
    var suf = el.getAttribute('data-suffix') || '';
    /* нечисловые значения (∞, 24/7, +12 %) показываем как есть */
    if (!/^-?\d+(\.\d+)?$/.test(raw.trim())) {
      el.textContent = pre + raw.trim() + suf;
      return;
    }
    var to = parseFloat(raw) || 0;
    var dec = (raw.split('.')[1] || '').length;
    var dur = parseInt(el.getAttribute('data-duration'), 10) || 1600;
    var t0 = performance.now();
    (function frame(now) {
      var p = Math.min(1, (now - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + (to * e).toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + suf;
      if (p < 1) requestAnimationFrame(frame);
    })(t0);
  }

  /* --------------------------------------------------------------- график */
  function runChart(el) {
    qa('.mock__chart span', el).forEach(function (s, i) { s.style.setProperty('--i', i); });
  }

  /* --------------------------------------------------------------- меню */
  function initNav() {
    var nav = q('[data-nav]');
    if (!nav) return;
    var burger = q('[data-burger]', nav);
    var menu = q('[data-menu]');
    var drawer = q('[data-drawer]');
    if (burger && drawer) {
      burger.addEventListener('click', function () {
        var open = burger.getAttribute('aria-expanded') === 'true';
        burger.setAttribute('aria-expanded', String(!open));
        drawer.classList.toggle('is-open', !open);
        doc.body.classList.toggle('is-locked', !open);
      });
      qa('a', drawer).forEach(function (a) {
        a.addEventListener('click', function () {
          burger.setAttribute('aria-expanded', 'false');
          drawer.classList.remove('is-open');
          doc.body.classList.remove('is-locked');
        });
      });
    }
    var onScroll = function () { nav.classList.toggle('is-stuck', window.scrollY > 12); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    if (menu && burger) {
      /* на широких экранах рисуем бургер-состояние из меню, если меню скрыто */
      var mq = window.matchMedia('(max-width:900px)');
      var sync = function () { burger.style.display = mq.matches ? '' : 'none'; };
      sync(); mq.addEventListener('change', sync);
    }
  }

  /* ---------------------------------------------------------- прогресс */
  function initProgress() {
    var bar = q('[data-progress]');
    if (!bar) return;
    var upd = function () {
      var h = doc.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? window.scrollY / h : 0) + ')';
    };
    upd();
    window.addEventListener('scroll', upd, { passive: true });
    window.addEventListener('resize', upd);
  }

  /* --------------------------------------------------------- бегущая строка */
  function initMarquee() {
    qa('[data-marquee]').forEach(function (m) {
      var row = q('.marquee__row', m);
      if (!row) return;
      var clone = row.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      m.appendChild(clone);
      var vertical = m.classList.contains('marquee--vertical');
      if (vertical) { row.style.animationName = ''; clone.style.animationName = ''; }
    });
  }

  /* ----------------------------------------------------------- аккордеон */
  function initFaq() {
    qa('[data-faq]').forEach(function (box) {
      var items = qa('.faq__item', box);
      var single = box.hasAttribute('data-faq-single');
      items.forEach(function (it) {
        var btn = q('.faq__q', it);
        if (!btn) return;
        btn.addEventListener('click', function () {
          var open = it.classList.contains('is-open');
          if (single) items.forEach(function (o) { o.classList.remove('is-open'); q('.faq__q', o).setAttribute('aria-expanded', 'false'); });
          if (!open) { it.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
          else btn.setAttribute('aria-expanded', 'false');
        });
      });
    });
  }

  /* --------------------------------------------------------------- табы */
  function initTabs() {
    qa('[data-tabs]').forEach(function (box) {
      var btns = qa('[role="tab"]', box);
      var panels = qa('[role="tabpanel"]', box);
      btns.forEach(function (b, i) {
        b.addEventListener('click', function () {
          btns.forEach(function (x, j) {
            x.setAttribute('aria-selected', String(i === j));
            x.classList.toggle('is-on', i === j);
          });
          panels.forEach(function (p, j) { p.hidden = i !== j; });
        });
      });
    });
  }

  /* ------------------------------------------------------------ курсор */
  function initCursor() {
    var el = q('[data-fx="cursor"]');
    if (!el || reduced) return;
    var x = 0, y = 0, cx = 0, cy = 0;
    window.addEventListener('mousemove', function (e) { x = e.clientX; y = e.clientY; el.style.opacity = '1'; }, { passive: true });
    (function loop() {
      cx += (x - cx) * 0.09; cy += (y - cy) * 0.09;
      el.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
      requestAnimationFrame(loop);
    })();
  }

  /* --------------------------------------------------------- параллакс */
  function initParallax() {
    if (reduced) return;
    var items = qa('[data-speed]');
    if (!items.length) return;
    var ticking = false;
    var upd = function () {
      var vh = window.innerHeight;
      items.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var sp = parseFloat(el.getAttribute('data-speed')) || 0.1;
        var mid = r.top + r.height / 2 - vh / 2;
        el.style.transform = 'translate3d(0,' + (-mid * sp).toFixed(1) + 'px,0)';
      });
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { requestAnimationFrame(upd); ticking = true; }
    }, { passive: true });
    window.addEventListener('resize', upd);
    upd();
  }

  /* ------------------------------------------------------------- 3D-наклон */
  function initTilt() {
    if (reduced || !window.matchMedia('(hover:hover)').matches) return;
    qa('[data-tilt]').forEach(function (el) {
      var max = parseFloat(el.getAttribute('data-tilt')) || 8;
      el.style.transformStyle = 'preserve-3d';
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(900px) rotateX(' + (-py * max).toFixed(2) + 'deg) rotateY(' + (px * max).toFixed(2) + 'deg) translateZ(0)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------------------------------------------------------- магнитные кнопки */
  function initMagnetic() {
    if (reduced || !window.matchMedia('(hover:hover)').matches) return;
    qa('[data-magnetic]').forEach(function (el) {
      var s = parseFloat(el.getAttribute('data-magnetic')) || 0.28;
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) * s;
        var dy = (e.clientY - (r.top + r.height / 2)) * s;
        el.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }

  /* -------------------------------------------------------------- печать */
  function initType() {
    qa('[data-type]').forEach(function (el) {
      var full = el.getAttribute('data-type');
      var words = full.split(' ');
      el.textContent = '';
      var i = 0;
      var tick = function () {
        if (i > words.length) { el.textContent = full; return; }
        el.textContent = words.slice(0, i).join(' ') + (i < words.length ? '|' : '');
        i++;
        setTimeout(tick, 90 + Math.random() * 90);
      };
      setTimeout(tick, 400);
    });
  }

  /* ------------------------------------------------------ мягкая прокрутка */
  function initAnchors() {
    qa('a[href^="#"]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || href === '#' || href.length < 2) return;
      a.addEventListener('click', function (e) {
        var target = q(href);
        if (!target) return;
        e.preventDefault();
        var nav = q('[data-nav]');
        var off = nav ? nav.getBoundingClientRect().height : 0;
        var top = target.getBoundingClientRect().top + window.scrollY - off + 1;
        window.scrollTo({ top: top, behavior: reduced ? 'auto' : 'smooth' });
        history.replaceState(null, '', href);
      });
    });
  }

  /* -------------------------------------------------------- копирование */
  function initCopy() {
    qa('[data-copy]').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = b.getAttribute('data-copy');
        if (navigator.clipboard) navigator.clipboard.writeText(t);
        var old = b.getAttribute('data-copy-label') || b.textContent;
        b.setAttribute('data-copy-label', old);
        b.textContent = 'Скопировано';
        setTimeout(function () { b.textContent = old; }, 1400);
      });
    });
  }

  /* ------------------------------------------------------------- год */
  function initYear() {
    qa('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  /* ------------------------------------------------------ фильтр списка */
  function initFilter() {
    qa('[data-filter]').forEach(function (box) {
      var btns = qa('[data-filter-btn]', box);
      var items = qa('[data-filter-item]', box);
      btns.forEach(function (b) {
        b.addEventListener('click', function () {
          var f = b.getAttribute('data-filter-btn');
          btns.forEach(function (x) { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
          items.forEach(function (it) {
            var show = f === 'all' || it.getAttribute('data-filter-item') === f;
            it.hidden = !show;
            if (!show) it.classList.remove('is-in'); else if (reduced) it.classList.add('is-in');
          });
        });
      });
    });
  }

  /* -------------------------------------------------------------- старт */
  function boot() {
    initNav(); initProgress(); initMarquee(); initFaq(); initTabs();
    initCursor(); initParallax(); initTilt(); initMagnetic(); initType();
    initAnchors(); initCopy(); initYear(); initFilter();
    reindex(); observe();

    if (io) {
      var counters = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          if (e.target.hasAttribute('data-count')) runCount(e.target);
          if (e.target.hasAttribute('data-chart')) runChart(e.target);
          counters.unobserve(e.target);
        });
      }, { threshold: 0.2 });
      qa('[data-count],[data-chart]').forEach(function (el) {
        if (reduced) { if (el.hasAttribute('data-count')) el.textContent = (el.getAttribute('data-prefix') || '') + el.getAttribute('data-count') + (el.getAttribute('data-suffix') || ''); return; }
        counters.observe(el);
      });
    } else {
      qa('[data-count]').forEach(runCount);
      qa('[data-chart]').forEach(runChart);
    }
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})();