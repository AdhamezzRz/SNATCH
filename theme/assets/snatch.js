/* SNATCH — After Hours. Vanilla JS; GSAP/ScrollTrigger + Lenis are optional enhancements. */
(() => {
  'use strict';

  const S = window.SNATCH || {};
  S.settings = S.settings || {};
  S.strings = S.strings || {};
  S.routes = S.routes || {};
  const d = document;
  const html = d.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover)').matches;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => Array.from(c.querySelectorAll(s));
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const root = (S.routes.root || '/').replace(/\/?$/, '/');

  /* ---------- a11y announcer ---------- */
  let annRaf = 0;
  function announce(msg) {
    const el = $('#sr-announcer');
    if (!el || !msg) return;
    cancelAnimationFrame(annRaf);
    el.textContent = '';
    annRaf = requestAnimationFrame(() => { el.textContent = msg; });
  }

  /* ---------- money ---------- */
  function formatMoney(cents, format) {
    const fmt = format || S.moneyFormat || '{{amount}}';
    if (typeof cents === 'string') cents = cents.replace('.', '');
    cents = Number(cents) || 0;
    const fmtNum = (n, precision, thousands = ',', decimal = '.') => {
      const fixed = (n / 100).toFixed(precision);
      const [whole, frac] = fixed.split('.');
      return whole.replace(/\B(?=(\d{3})+(?!\d))/g, thousands) + (frac ? decimal + frac : '');
    };
    return fmt.replace(/\{\{\s*(\w+)\s*\}\}/, (_, key) => {
      switch (key) {
        case 'amount_no_decimals': return fmtNum(cents, 0);
        case 'amount_with_comma_separator': return fmtNum(cents, 2, '.', ',');
        case 'amount_no_decimals_with_comma_separator': return fmtNum(cents, 0, '.', ',');
        case 'amount_with_apostrophe_separator': return fmtNum(cents, 2, "'", '.');
        default: return fmtNum(cents, 2);
      }
    });
  }

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  function initScroll() {
    const hasGsap = !!(window.gsap && window.ScrollTrigger);
    if (hasGsap) window.gsap.registerPlugin(window.ScrollTrigger);
    if (reduce || !S.settings.smoothScroll || !window.Lenis) return;
    lenis = new window.Lenis({ lerp: 0.095, smoothWheel: true, wheelMultiplier: 0.95 });
    if (hasGsap) {
      lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add((t) => lenis.raf(t * 1000));
      window.gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id.length < 2) return;
        const target = d.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: 0, duration: 1.6 });
      });
    });
  }
  let locks = 0;
  function lockScroll(on) {
    locks = Math.max(0, locks + (on ? 1 : -1));
    const locked = locks > 0;
    if (lenis) locked ? lenis.stop() : lenis.start();
    d.body.style.overflow = locked ? 'hidden' : '';
  }

  /* ---------- scroll loop (one rAF for parallax, header, manifesto) ---------- */
  const scrollers = new Set();
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { scrollers.forEach((fn) => fn()); ticking = false; });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  /* ---------- curtain ---------- */
  function curtain() {
    if (!html.classList.contains('is-curtain')) return Promise.resolve();
    const c = $('[data-curtain]');
    try { sessionStorage.setItem('snatch:curtain', '1'); } catch (e) { /* storage blocked */ }
    if (!c) { html.classList.remove('is-curtain'); return Promise.resolve(); }
    const ease = 'cubic-bezier(0.76, 0, 0.24, 1)';
    const paths = $$('.curtain__mark path', c);
    const count = $('[data-curtain-count]', c);
    return new Promise((resolve) => {
      paths.forEach((p, i) => p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 1050, delay: 80 + i * 90, easing: ease, fill: 'forwards' }));
      const start = performance.now();
      const dur = 1450;
      const tick = (now) => {
        const t = clamp((now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        if (count) count.textContent = String(Math.round(eased * 100)).padStart(3, '0');
        if (t < 1) requestAnimationFrame(tick); else part();
      };
      requestAnimationFrame(tick);
      function part() {
        $('.curtain__inner', c).animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(0.97)' }], { duration: 320, easing: 'cubic-bezier(0.16,1,0.3,1)', fill: 'forwards' });
        const o = { duration: 1000, delay: 220, easing: ease, fill: 'forwards' };
        $('.curtain__panel--l', c).animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-101%)' }], o);
        const a = $('.curtain__panel--r', c).animate([{ transform: 'translateX(0)' }, { transform: 'translateX(101%)' }], o);
        setTimeout(resolve, 420);
        a.finished.then(() => { html.classList.remove('is-curtain'); c.remove(); });
      }
    });
  }

  /* ---------- hero ---------- */
  function heroIntro() {
    const hero = $('[data-hero]');
    if (!hero) return;
    hero.classList.add('is-intro');
    if (reduce) return;
    const ease = 'cubic-bezier(0.76, 0, 0.24, 1)';
    $$('[data-hero-line]', hero).forEach((el, i) => {
      el.animate([{ transform: 'translateY(110%)' }, { transform: 'translateY(0)' }], { duration: 1300, delay: 120 + i * 110, easing: ease, fill: 'backwards' });
    });
    $$('[data-hero-fade]', hero).forEach((el, i) => {
      el.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 1000, delay: 650 + i * 120, easing: 'cubic-bezier(0.16,1,0.3,1)', fill: 'backwards' });
    });
    const media = $('[data-hero-media]', hero);
    if (media) media.animate([{ transform: 'scale(1.12)', filter: 'brightness(0.2)' }, { transform: 'scale(1)', filter: 'brightness(1)' }], { duration: 2400, easing: 'cubic-bezier(0.16,1,0.3,1)', fill: 'backwards' });

    // gentle push-out as you scroll away
    const content = $('.hero__content', hero);
    scrollers.add(() => {
      const r = hero.getBoundingClientRect();
      if (r.bottom < 0) return;
      const p = clamp(-r.top / r.height);
      if (media) media.style.transform = `translate3d(0, ${p * 18}%, 0) scale(${1 + p * 0.06})`;
      if (content) { content.style.transform = `translate3d(0, ${p * -12}%, 0)`; content.style.opacity = String(1 - p * 1.4); }
    });
  }

  function heroVideo() {
    $$('[data-hero]').forEach((hero) => {
      const wraps = $$('[data-hero-video]', hero).filter((w) => getComputedStyle(w).display !== 'none');
      const btn = $('[data-video-toggle]', hero);
      if (!wraps.length) { if (btn) btn.hidden = true; return; }
      const wrap = wraps[0];
      const video = $('video', wrap);
      if (!video) return;
      let userPaused = reduce;
      const setBtn = () => {
        if (!btn) return;
        const paused = video.paused;
        btn.setAttribute('aria-pressed', String(paused));
        btn.setAttribute('aria-label', paused ? S.strings.play : S.strings.pause);
        btn.innerHTML = paused
          ? '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5l12 7-12 7z" fill="currentColor"/></svg>'
          : '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>';
      };
      const load = () => {
        if (video.dataset.src && !video.src) video.src = video.dataset.src;
        video.preload = 'auto';
      };
      video.addEventListener('playing', () => { wrap.classList.add('is-playing'); setBtn(); });
      video.addEventListener('pause', setBtn);
      const tryPlay = () => { load(); const p = video.play(); if (p && p.catch) p.catch(() => setBtn()); };
      if (btn) btn.addEventListener('click', () => {
        if (video.paused) { userPaused = false; tryPlay(); } else { userPaused = true; video.pause(); }
      });
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting && !userPaused) tryPlay();
        else if (!e.isIntersecting && !video.paused) video.pause();
      }, { threshold: 0.15 }).observe(hero);
      d.addEventListener('visibilitychange', () => { if (d.hidden) video.pause(); else if (!userPaused) tryPlay(); });
      setBtn();
    });
  }

  /* ---------- spotlight (hero, closing) ---------- */
  function spotlights() {
    $$('[data-spotlight]').forEach((el) => {
      const isHero = el.matches('[data-hero]');
      const base = () => {
        const mobile = window.innerWidth < 750;
        if (isHero) return mobile ? [0.5, 0.6] : [0.6, 0.46];
        return [0.5, 0.5];
      };
      let [x, y] = base();
      let tx = x, ty = y;
      let active = false, inView = false, raf = 0, idle = 0;
      const t0 = performance.now();
      const set = () => {
        el.style.setProperty('--x', (x * 100).toFixed(2) + '%');
        el.style.setProperty('--y', (y * 100).toFixed(2) + '%');
      };
      set();
      if (reduce) return;
      const step = (now) => {
        if (!inView) return;
        if (!active) {
          const [bx, by] = base();
          const t = (now - t0) / 1000;
          tx = bx + Math.sin(t * 0.32) * 0.13 + Math.sin(t * 0.11) * 0.05;
          ty = by + Math.sin(t * 0.47) * 0.07;
        }
        x = lerp(x, tx, 0.07);
        y = lerp(y, ty, 0.07);
        set();
        raf = requestAnimationFrame(step);
      };
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width;
        ty = (e.clientY - r.top) / r.height;
        active = true;
        clearTimeout(idle);
        idle = setTimeout(() => { active = false; }, 2600);
      });
      el.addEventListener('pointerleave', () => { active = false; });
      new IntersectionObserver(([e]) => {
        inView = e.isIntersecting;
        cancelAnimationFrame(raf);
        if (inView) raf = requestAnimationFrame(step);
      }).observe(el);
    });
  }

  /* ---------- header ---------- */
  function header() {
    const h = $('[data-header]');
    if (!h) return;
    const overlay = h.classList.contains('header--overlay');
    let last = window.scrollY;
    const update = () => {
      const y = window.scrollY;
      h.classList.toggle('is-solid', !overlay || y > 40);
      if (y > 160 && y > last + 4 && !d.body.classList.contains('menu-open')) h.classList.add('is-hidden');
      else if (y < last - 4 || y < 160) h.classList.remove('is-hidden');
      last = y;
    };
    scrollers.add(update);
    update();
  }

  function clock() {
    const els = $$('[data-clock]');
    if (!els.length) return;
    let fmt;
    try { fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo' }); } catch (e) { fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }); }
    const run = () => els.forEach((el) => { el.textContent = fmt.format(new Date()); });
    run();
    setInterval(run, 30000);
  }

  /* ---------- full-screen menu ---------- */
  function menu() {
    const m = $('[data-menu]');
    const openBtn = $('[data-menu-open]');
    if (!m || !openBtn) return;
    let lastFocus = null;
    const others = () => [$('#MainContent'), $('.section-footer'), ...$$('[data-header]')].filter(Boolean);
    const open = () => {
      lastFocus = d.activeElement;
      m.hidden = false;
      void m.offsetWidth;
      m.classList.add('is-open');
      d.body.classList.add('menu-open');
      openBtn.setAttribute('aria-expanded', 'true');
      others().forEach((el) => { el.inert = true; });
      lockScroll(true);
      const first = $('.menu__link', m) || $('[data-menu-close]', m);
      if (first) setTimeout(() => first.focus({ preventScroll: true }), 60);
    };
    const close = () => {
      if (!m.classList.contains('is-open')) return;
      m.classList.remove('is-open');
      d.body.classList.remove('menu-open');
      openBtn.setAttribute('aria-expanded', 'false');
      others().forEach((el) => { el.inert = false; });
      lockScroll(false);
      setTimeout(() => { if (!m.classList.contains('is-open')) m.hidden = true; }, reduce ? 0 : 650);
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    };
    openBtn.addEventListener('click', open);
    $$('[data-menu-close]', m).forEach((b) => b.addEventListener('click', close));
    $$('a', m).forEach((a) => a.addEventListener('click', () => setTimeout(close, 10)));
    d.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  /* ---------- dialogs ---------- */
  function openDialog(dlg) {
    if (!dlg || dlg.open) return;
    dlg.showModal();
    lockScroll(true);
  }
  function wireDialog(dlg) {
    if (!dlg) return;
    dlg.addEventListener('close', () => lockScroll(false));
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    $$('[data-close]', dlg).forEach((b) => b.addEventListener('click', () => dlg.close()));
  }

  /* ---------- predictive search ---------- */
  function search() {
    const dlg = $('[data-search]');
    if (!dlg) return;
    wireDialog(dlg);
    const input = $('[data-search-input]', dlg);
    const out = $('[data-search-results]', dlg);
    const hint = $('[data-search-hint]', dlg);
    $$('[data-search-open]').forEach((b) => b.addEventListener('click', () => { openDialog(dlg); setTimeout(() => input.focus(), 30); }));
    let ctrl = null, timer = 0;
    const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const render = (q, products) => {
      if (!products.length) {
        out.innerHTML = `<p class="t-mono">${esc((S.strings.noResults || '').replace('__TERMS__', q))}</p>`;
        return;
      }
      out.innerHTML = products.map((p) => {
        const [fam, col] = String(p.title).split(' - ');
        const img = p.featured_image && p.featured_image.url ? `${p.featured_image.url}${p.featured_image.url.includes('?') ? '&' : '?'}width=400` : '';
        return `<a class="s-item" href="${esc(p.url)}" data-spot><span class="lightbox">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ''}</span><span class="s-name">${esc(fam)}</span><span class="t-mono">${esc(col || '')} · ${esc(formatMoney(String(p.price).includes('.') ? Math.round(parseFloat(p.price) * 100) : p.price))}</span></a>`;
      }).join('') + `<a class="link-arrow t-label search__all" href="${esc(S.routes.search)}?type=product&q=${encodeURIComponent(q)}">${esc(S.strings.viewAll)}</a>`;
      bindSpots(out);
    };
    input.addEventListener('input', () => {
      clearTimeout(timer);
      const q = input.value.trim();
      hint.hidden = q.length > 0;
      if (q.length < 2) { out.innerHTML = ''; return; }
      timer = setTimeout(async () => {
        if (ctrl) ctrl.abort();
        ctrl = new AbortController();
        out.setAttribute('aria-busy', 'true');
        try {
          const url = `${S.routes.predictive}.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=10&resources[options][unavailable_products]=last`;
          const res = await fetch(url, { signal: ctrl.signal });
          const json = await res.json();
          render(q, (json.resources && json.resources.results && json.resources.results.products) || []);
        } catch (e) { if (e.name !== 'AbortError') out.innerHTML = ''; }
        out.removeAttribute('aria-busy');
      }, 220);
    });
  }

  /* ---------- cart ---------- */
  const cart = {
    dlg: null,
    async refresh(sectionsHtml, state) {
      const body = $('[data-cart-body]');
      const page = $('[data-cart-page]');
      if (sectionsHtml) {
        const tmp = d.createElement('div');
        tmp.innerHTML = sectionsHtml;
        const inner = tmp.querySelector('.shopify-section') ? tmp.querySelector('.shopify-section').innerHTML : tmp.innerHTML;
        if (body) body.innerHTML = inner;
        if (page) page.innerHTML = inner;
      }
      if (!state) state = await fetch(`${S.routes.cart}.js`).then((r) => r.json());
      $$('[data-cart-count]').forEach((el) => {
        el.textContent = state.item_count;
        el.classList.remove('is-bump'); void el.offsetWidth; el.classList.add('is-bump');
      });
      $$('[data-cart-count-label]').forEach((el) => { el.textContent = state.item_count; });
      $$('[data-cart-total]').forEach((el) => { el.textContent = formatMoney(state.total_price); });
      const foot = $('[data-cart-foot]');
      if (foot) foot.hidden = state.item_count === 0;
      bindCartLines();
      return state;
    },
    async change(key, quantity) {
      const body = $('[data-cart-body]');
      if (body) body.setAttribute('aria-busy', 'true');
      try {
        const res = await fetch(`${S.routes.cartChange}.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ id: key, quantity, sections: 'cart-lines' })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.description || S.strings.error);
        await cart.refresh(json.sections && json.sections['cart-lines'], json);
        status(S.strings.cartUpdated);
      } catch (e) {
        status(e.message || S.strings.error);
      }
      if (body) body.setAttribute('aria-busy', 'false');
    },
    async add(formData) {
      formData.append('sections', 'cart-lines');
      const res = await fetch(`${S.routes.cartAdd}.js`, { method: 'POST', headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, body: formData });
      const json = await res.json();
      if (!res.ok || json.status) throw new Error(json.description || json.message || S.strings.error);
      await cart.refresh(json.sections && json.sections['cart-lines']);
      return json;
    },
    open() { openDialog(cart.dlg); }
  };
  function status(msg) {
    const el = $('[data-cart-status]');
    if (!el) return announce(msg);
    el.textContent = '';
    requestAnimationFrame(() => { el.textContent = msg; });
  }
  function bindCartLines() {
    $$('[data-cart-body] [data-qty], [data-cart-page] [data-qty]').forEach((q) => {
      if (q.dataset.bound) return;
      q.dataset.bound = '1';
      const input = $('[data-qty-input]', q);
      const key = input && input.dataset.key;
      if (!key) return;
      $$('[data-qty-step]', q).forEach((b) => b.addEventListener('click', () => {
        const v = Math.max(0, (parseInt(input.value, 10) || 0) + Number(b.dataset.qtyStep));
        input.value = v;
        cart.change(key, v);
      }));
      input.addEventListener('change', () => cart.change(key, Math.max(0, parseInt(input.value, 10) || 0)));
    });
    $$('[data-remove]').forEach((b) => {
      if (b.dataset.bound) return;
      b.dataset.bound = '1';
      b.addEventListener('click', () => cart.change(b.dataset.remove, 0));
    });
  }
  function initCart() {
    cart.dlg = $('[data-cart-drawer]');
    wireDialog(cart.dlg);
    $$('[data-cart-open]').forEach((a) => a.addEventListener('click', (e) => {
      if (!cart.dlg || d.body.classList.contains('template-cart')) return;
      e.preventDefault();
      cart.open();
    }));
    bindCartLines();
  }

  /* ---------- reveals ---------- */
  let revealIO = null;
  function reveals(scope = d) {
    const targets = $$('[data-reveal], [data-clip], [data-footer-mark]', scope);
    const staggerKids = [];
    $$('[data-stagger]', scope).forEach((g) => {
      Array.from(g.children).forEach((c, i) => {
        c.style.transitionDelay = `${(i % 4) * 90}ms`;
        staggerKids.push(c);
      });
    });
    if (reduce || !('IntersectionObserver' in window)) {
      [...targets, ...staggerKids].forEach((el) => el.classList.add('is-in'));
      return;
    }
    if (!revealIO) {
      revealIO = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('is-in'); revealIO.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    }
    [...targets, ...staggerKids].forEach((el) => { if (!el.classList.contains('is-in')) revealIO.observe(el); });
  }

  /* ---------- manifesto: words light up as you read ---------- */
  function manifesto() {
    $$('[data-scrub-words]').forEach((p) => {
      const words = p.textContent.trim().split(/\s+/);
      p.innerHTML = words.map((w) => `<span class="w">${w.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</span>`).join(' ');
      if (reduce) return;
      const spans = $$('.w', p);
      let lit = -1;
      scrollers.add(() => {
        const r = p.getBoundingClientRect();
        const vh = window.innerHeight;
        if (r.bottom < -vh || r.top > vh * 2) return;
        const prog = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.35));
        const n = Math.round(prog * spans.length);
        if (n === lit) return;
        lit = n;
        spans.forEach((s, i) => s.classList.toggle('is-lit', i < n));
      });
      onScroll();
    });
  }

  /* ---------- parallax ---------- */
  function parallax() {
    if (reduce) return;
    $$('[data-parallax]').forEach((el) => {
      const amt = parseFloat(el.dataset.parallax) || 8;
      const target = el.querySelector('img') || el;
      scrollers.add(() => {
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight;
        if (r.bottom < 0 || r.top > vh) return;
        const p = (r.top + r.height / 2 - vh / 2) / vh;
        target.style.transform = `translate3d(0, ${(-p * amt).toFixed(2)}%, 0)`;
      });
    });
    onScroll();
  }

  /* ---------- tonight's lots: vertical scroll walks the room sideways ---------- */
  function lots() {
    $$('[data-lots]').forEach((sec) => {
      const track = $('[data-lots-track]', sec);
      const vp = $('.lots__viewport', sec);
      const cur = $('[data-lots-current]', sec);
      const bar = $('[data-lots-progress]', sec);
      const items = $$('.lots__item', track).filter((i) => !i.classList.contains('lots__item--end'));
      const total = items.length || 1;
      const setProgress = (p) => {
        if (bar) bar.style.transform = `scaleX(${0.1 + p * 0.9})`;
        if (cur) cur.textContent = String(Math.min(total, Math.floor(p * total) + 1)).padStart(2, '0');
      };
      const canPin = !reduce && window.gsap && window.ScrollTrigger && window.matchMedia('(min-width: 900px)').matches;
      if (!canPin) {
        sec.classList.add('is-native');
        vp.addEventListener('scroll', () => {
          const max = vp.scrollWidth - vp.clientWidth;
          setProgress(max > 0 ? vp.scrollLeft / max : 0);
        }, { passive: true });
        return;
      }
      const g = window.gsap;
      const dist = () => Math.max(0, track.scrollWidth - vp.clientWidth);
      sec.classList.add('is-pinned');
      g.to(track, {
        x: () => -dist(),
        ease: 'none',
        scrollTrigger: {
          trigger: sec,
          start: 'top top',
          end: () => '+=' + dist(),
          pin: true,
          scrub: 0.7,
          invalidateOnRefresh: true,
          anticipatePin: 1,
          onUpdate: (self) => setProgress(self.progress)
        }
      });
    });
  }

  /* ---------- colourway switcher ---------- */
  function colourways() {
    $$('[data-cway]').forEach((sec) => {
      const slides = $$('[data-cway-slide]', sec);
      const inputs = $$('[data-cway-input]', sec);
      const stage = $('[data-cway-stage]', sec);
      const price = $('[data-cway-price]', sec);
      const link = $('[data-cway-link]', sec);
      const toggle = $('[data-cway-toggle]', sec);
      if (!slides.length) return;
      let i = 0, timer = 0, inView = false, hover = false, focus = false, userPaused = reduce;
      const show = (n) => {
        i = (n + slides.length) % slides.length;
        slides.forEach((s, k) => {
          const on = k === i;
          s.classList.toggle('is-active', on);
          if (on) s.removeAttribute('aria-hidden'); else s.setAttribute('aria-hidden', 'true');
        });
        const s = slides[i];
        if (s.dataset.tint) sec.style.setProperty('--tint', s.dataset.tint);
        if (price) price.textContent = s.dataset.price || '';
        if (link) link.href = s.dataset.url || link.href;
        if (inputs[i]) inputs[i].checked = true;
      };
      const running = () => inView && !hover && !focus && !userPaused;
      const schedule = () => {
        clearTimeout(timer);
        if (stage) stage.setAttribute('aria-live', running() ? 'off' : 'polite');
        if (running()) timer = setTimeout(() => { show(i + 1); schedule(); }, 3400);
      };
      const setToggle = () => {
        if (!toggle) return;
        toggle.setAttribute('aria-pressed', String(userPaused));
        toggle.innerHTML = (userPaused
          ? '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5l12 7-12 7z" fill="currentColor"/></svg>'
          : '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>')
          + `<span>${userPaused ? S.strings.play : S.strings.pause}</span>`;
      };
      inputs.forEach((inp, k) => inp.addEventListener('change', () => { show(k); userPaused = true; setToggle(); schedule(); }));
      sec.addEventListener('pointerenter', () => { hover = true; schedule(); });
      sec.addEventListener('pointerleave', () => { hover = false; schedule(); });
      sec.addEventListener('focusin', () => { focus = true; schedule(); });
      sec.addEventListener('focusout', (e) => { if (!sec.contains(e.relatedTarget)) { focus = false; schedule(); } });
      if (toggle) toggle.addEventListener('click', () => { userPaused = !userPaused; setToggle(); schedule(); announce(userPaused ? S.strings.pause : S.strings.play); });
      new IntersectionObserver(([e]) => { inView = e.isIntersecting; schedule(); }, { threshold: 0.35 }).observe(sec);
      show(0);
      setToggle();
    });
  }

  /* ---------- product cards: colour dots swap the photo ---------- */
  function bindCards(scope = d) {
    $$('[data-card]', scope).forEach((card) => {
      if (card.dataset.bound) return;
      card.dataset.bound = '1';
      const dots = $$('[data-dot]', card);
      if (!dots.length) return;
      const img = $('[data-card-img]', card);
      const colour = $('[data-card-colour]', card);
      const priceEl = $('.price__now', card);
      const links = $$('[data-card-link]', card);
      const pick = (dot) => {
        dots.forEach((x) => x.classList.toggle('is-active', x === dot));
        if (img && dot.dataset.img) {
          img.removeAttribute('srcset');
          if (dot.dataset.srcset) img.srcset = dot.dataset.srcset;
          img.src = dot.dataset.img;
        }
        if (colour) colour.textContent = dot.dataset.colour || '';
        if (priceEl && dot.dataset.price) priceEl.textContent = dot.dataset.price;
        links.forEach((l) => { l.href = dot.getAttribute('href'); });
      };
      dots.forEach((dot) => {
        dot.addEventListener('pointerenter', () => pick(dot));
        dot.addEventListener('focus', () => pick(dot));
        // warm the cache so swaps are instant
        if (canHover) dot.addEventListener('pointerenter', () => { const im = new Image(); im.src = dot.dataset.img; }, { once: true });
      });
    });
    bindSpots(scope);
  }
  function bindSpots(scope = d) {
    if (!canHover || reduce) return;
    $$('[data-spot]', scope).forEach((el) => {
      if (el.dataset.spotBound) return;
      el.dataset.spotBound = '1';
      const box = el.matches('.lightbox') ? el : $('.lightbox', el) || el;
      el.addEventListener('pointermove', (e) => {
        const r = box.getBoundingClientRect();
        box.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
        box.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
      });
    });
  }

  /* ---------- magnetic buttons ---------- */
  function magnetic() {
    if (!canHover || reduce) return;
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * 0.18}px, ${dy * 0.3}px)`;
      });
      el.addEventListener('pointerleave', () => {
        el.animate([{ transform: el.style.transform || 'none' }, { transform: 'translate(0,0)' }], { duration: 500, easing: 'cubic-bezier(0.16,1,0.3,1)' });
        el.style.transform = '';
      });
    });
  }

  /* ---------- product page ---------- */
  function pdp() {
    const root$ = $('[data-pdp]');
    if (!root$) return;
    const form = $('[data-product-form]', root$);
    const addBtn = $('[data-add]', root$);
    const addLabel = $('[data-add-label]', root$);
    const addPrice = $('[data-add-price]', root$);
    const err = $('[data-form-error]', root$);
    const idInput = $('[data-variant-id]', root$);

    // quantity steppers (product form only)
    $$('[data-qty]', form).forEach((q) => {
      const input = $('[data-qty-input]', q);
      $$('[data-qty-step]', q).forEach((b) => b.addEventListener('click', () => {
        input.value = Math.max(1, (parseInt(input.value, 10) || 1) + Number(b.dataset.qtyStep));
      }));
    });

    // variants
    const vJson = $('[data-variants]', root$);
    if (vJson) {
      const variants = JSON.parse(vJson.textContent);
      const pickVariant = () => {
        const selected = $$('[data-option]', form).map((fs) => { const c = $('input:checked', fs); return c ? c.value : null; });
        const v = variants.find((x) => x.options.every((o, k) => o === selected[k]));
        if (!v) {
          addBtn.disabled = true;
          addLabel.textContent = S.strings.soldOut;
          return;
        }
        idInput.value = v.id;
        addBtn.disabled = !v.available;
        addLabel.textContent = v.available ? S.strings.addToBag : S.strings.soldOut;
        if (addPrice) addPrice.textContent = formatMoney(v.price);
        $$('[data-price] .price__now', root$).forEach((el) => { el.textContent = formatMoney(v.price); });
        const sku = $('[data-sku]', root$);
        if (sku && v.sku) sku.textContent = sku.textContent.replace(/·.*/, '· ' + v.sku);
        const url = new URL(window.location.href);
        url.searchParams.set('variant', v.id);
        window.history.replaceState({}, '', url.toString());
        announce(`${v.title} — ${formatMoney(v.price)}`);
      };
      $$('[data-option-input]', form).forEach((i) => i.addEventListener('change', pickVariant));
    }

    if (form) form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (addBtn.disabled) return;
      err.hidden = true;
      addBtn.setAttribute('aria-busy', 'true');
      const prev = addLabel.textContent;
      addLabel.textContent = S.strings.adding;
      try {
        await cart.add(new FormData(form));
        addLabel.textContent = S.strings.added;
        status(S.strings.added);
        cart.open();
        setTimeout(() => { addLabel.textContent = prev; }, 1600);
      } catch (ex) {
        addLabel.textContent = prev;
        err.textContent = ex.message || S.strings.error;
        err.hidden = false;
      }
      addBtn.removeAttribute('aria-busy');
    });

    // sticky mobile bar
    const bar = $('[data-pdp-bar]', root$);
    const barBtn = $('[data-bar-add]', root$);
    if (bar && addBtn) {
      new IntersectionObserver(([e]) => {
        const show = !e.isIntersecting && e.boundingClientRect.top < 0;
        bar.classList.toggle('is-visible', show);
        bar.setAttribute('aria-hidden', String(!show));
        if (barBtn) barBtn.tabIndex = show ? 0 : -1;
      }).observe(addBtn);
      if (barBtn) barBtn.addEventListener('click', () => form.requestSubmit ? form.requestSubmit() : form.submit());
    }

    // sibling colourways ("Style - Colour" naming)
    const family = root$.dataset.family;
    const wrap = $('[data-siblings]', root$);
    const list = $('[data-sibling-list]', root$);
    if (family && wrap && list) {
      const url = `${S.routes.predictive}.json?q=${encodeURIComponent(family)}&resources[type]=product&resources[limit]=10&resources[options][unavailable_products]=last&resources[options][fields]=title`;
      fetch(url).then((r) => r.json()).then((json) => {
        const products = ((json.resources && json.resources.results && json.resources.results.products) || [])
          .filter((p) => String(p.title).split(' - ')[0].trim().toLowerCase() === family.toLowerCase());
        if (products.length < 2) return;
        const here = window.location.pathname.replace(/\/$/, '');
        list.innerHTML = products.map((p) => {
          const col = String(p.title).split(' - ').slice(1).join(' - ') || p.title;
          const src = p.featured_image && p.featured_image.url ? `${p.featured_image.url}${p.featured_image.url.includes('?') ? '&' : '?'}width=200` : '';
          const current = here.endsWith(String(p.url).split('?')[0].replace(/\/$/, '').split('/').pop());
          return `<li><a class="sib" href="${p.url}"${current ? ' aria-current="true"' : ''}><span class="sib__media lightbox">${src ? `<img src="${src}" alt="" loading="lazy">` : ''}</span><span class="sib__name">${col.replace(/</g, '&lt;')}</span></a></li>`;
        }).join('');
        wrap.hidden = false;
      }).catch(() => {});
    }
  }

  function recommendations() {
    $$('[data-recs]').forEach(async (el) => {
      if (el.children.length) { bindCards(el); return; }
      try {
        const res = await fetch(el.dataset.url);
        const text = await res.text();
        const tmp = d.createElement('div');
        tmp.innerHTML = text;
        const fresh = tmp.querySelector('[data-recs]');
        if (fresh && fresh.innerHTML.trim()) {
          el.innerHTML = fresh.innerHTML;
          bindCards(el);
          reveals(el);
        }
      } catch (e) { /* recommendations are optional */ }
    });
  }

  /* ---------- collection: silhouette chips + sort ---------- */
  function collection() {
    const grid = $('[data-plp-grid]');
    const chips = $('[data-chips]');
    if (grid && chips) {
      const cards = $$('[data-card]', grid);
      const counts = new Map();
      cards.forEach((c) => {
        const key = c.dataset.silhouette;
        const label = c.dataset.silhouetteLabel || key;
        if (!key) return;
        const cur = counts.get(key) || { label, n: 0 };
        cur.n += 1;
        counts.set(key, cur);
      });
      if (counts.size > 1) {
        [...counts.entries()].sort((a, b) => b[1].n - a[1].n).forEach(([key, v]) => {
          const b = d.createElement('button');
          b.type = 'button';
          b.className = 'chip';
          b.dataset.chip = key;
          b.setAttribute('aria-pressed', 'false');
          b.innerHTML = `${v.label} <sup>${v.n}</sup>`;
          chips.appendChild(b);
        });
        chips.addEventListener('click', (e) => {
          const b = e.target.closest('[data-chip]');
          if (!b) return;
          const key = b.dataset.chip;
          $$('[data-chip]', chips).forEach((x) => { const on = x === b; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', String(on)); });
          let shown = 0;
          cards.forEach((c) => {
            const hide = key !== 'all' && c.dataset.silhouette !== key;
            c.classList.toggle('is-filtered', hide);
            if (!hide) { shown += 1; c.classList.add('is-in'); }
          });
          announce(String(shown));
          if (window.ScrollTrigger) window.ScrollTrigger.refresh();
        });
      } else {
        chips.hidden = true;
      }
    }
    const sort = $('[data-sort]');
    if (sort) sort.addEventListener('change', () => {
      const url = new URL(window.location.href);
      url.searchParams.set('sort_by', sort.value);
      url.searchParams.delete('page');
      window.location.href = url.toString();
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    window.__snatchBooted = true;
    initScroll();
    header();
    clock();
    menu();
    search();
    initCart();
    spotlights();
    manifesto();
    parallax();
    colourways();
    bindCards();
    magnetic();
    pdp();
    recommendations();
    collection();
    reveals();
    curtain().then(() => {
      heroIntro();
      heroVideo();
      lots();
      if (window.ScrollTrigger) setTimeout(() => window.ScrollTrigger.refresh(), 300);
    });
    window.addEventListener('load', () => { if (window.ScrollTrigger) window.ScrollTrigger.refresh(); });
  }

  // theme editor support
  d.addEventListener('shopify:section:load', (e) => {
    bindCards(e.target);
    reveals(e.target);
    colourways();
    spotlights();
  });

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.SNATCH.formatMoney = formatMoney;
})();
