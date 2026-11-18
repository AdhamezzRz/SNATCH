/* SNATCH — One of One. Vanilla JS; Lenis (optional) smooths desktop scrolling. */
(() => {
  'use strict';

  const S = window.SNATCH || {};
  S.strings = S.strings || {};
  S.routes = S.routes || {};
  const d = document;
  const html = d.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const CINE = 'cubic-bezier(0.76, 0, 0.24, 1)';
  const OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- helpers ---------- */
  let annRaf = 0;
  function announce(msg) {
    const el = $('#sr-announcer');
    if (!el || !msg) return;
    cancelAnimationFrame(annRaf);
    el.textContent = '';
    annRaf = requestAnimationFrame(() => { el.textContent = msg; });
  }
  function formatMoney(cents) {
    const fmt = S.moneyFormat || '{{amount}}';
    cents = Number(cents) || 0;
    const num = (n, p, t = ',', dec = '.') => {
      const [w, f] = (n / 100).toFixed(p).split('.');
      return w.replace(/\B(?=(\d{3})+(?!\d))/g, t) + (f ? dec + f : '');
    };
    return fmt.replace(/\{\{\s*(\w+)\s*\}\}/, (_, k) => {
      if (k === 'amount_no_decimals') return num(cents, 0);
      if (k === 'amount_with_comma_separator') return num(cents, 2, '.', ',');
      if (k === 'amount_no_decimals_with_comma_separator') return num(cents, 0, '.', ',');
      return num(cents, 2);
    });
  }
  const toCents = (p) => (String(p).includes('.') ? Math.round(parseFloat(p) * 100) : Number(p));
  const sized = (u, w) => (u ? u + (u.includes('?') ? '&' : '?') + 'width=' + w : '');
  const COLOURS = { black: '#141212', white: '#F4F1EC', ivory: '#EEE6D3', cream: '#E9DDC3', beige: '#D6C1A0', sand: '#CBB58F', tan: '#B4834F', cognac: '#97491F', brown: '#5A3722', taupe: '#8A7969', burgundy: '#5E1724', red: '#A31F2B', berry: '#7D1D45', plum: '#4C2140', pink: '#E3A7B5', navy: '#1C2741', blue: '#3B5889', sage: '#97A78B', green: '#3E5A3A', olive: '#666437', gray: '#9A958C', grey: '#9A958C', silver: '#C0C0C0', gold: '#C8A24A', lilac: '#C0ADD6', purple: '#5B3878', orange: '#D1682C' };
  function colourCss(name) {
    const n = String(name || '').toLowerCase();
    if (/multicolor|patchwork/.test(n)) return 'conic-gradient(from 30deg,#A31F2B,#D1682C,#E9DDC3,#3B5889,#1E3A2B,#A31F2B)';
    const parts = n.split(/\s+(?:and|with|&)\s+/).slice(0, 2).map((t) => {
      const hit = t.split(/\s+/).reverse().find((w) => COLOURS[w]);
      return hit ? COLOURS[hit] : null;
    }).filter(Boolean);
    if (parts.length >= 2) return 'linear-gradient(135deg,' + parts[0] + ' 0 50%,' + parts[1] + ' 50% 100%)';
    return parts[0] || '#8f8a84';
  }
  function isDark(hex) {
    const m = String(hex || '').replace('#', '').match(/^([0-9a-f]{6})$/i);
    if (!m) return true;
    const n = parseInt(m[1], 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.32;
  }
  async function predictive(q, limit = 10) {
    const url = `${S.routes.predictive}.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=${limit}&resources[options][unavailable_products]=last&resources[options][fields]=title`;
    const json = await fetch(url).then((r) => r.json());
    return (json.resources && json.resources.results && json.resources.results.products) || [];
  }
  const sameFamily = (items, family) => items.filter((p) => String(p.title).split(' - ')[0].trim().toLowerCase() === String(family).toLowerCase());

  /* ---------- smooth scroll + one scroll loop ---------- */
  let lenis = null;
  const onScrollFns = new Set();
  let ticking = false;
  const runScroll = () => { onScrollFns.forEach((fn) => fn()); ticking = false; };
  const requestScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(runScroll); } };
  window.addEventListener('scroll', requestScroll, { passive: true });
  window.addEventListener('resize', requestScroll, { passive: true });
  function initScroll() {
    if (reduce || !S.smooth || !window.Lenis || !canHover) return;
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    lenis.on('scroll', requestScroll);
  }
  function scrollToY(y) {
    if (lenis) lenis.scrollTo(y, { duration: 1.2 });
    else window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  }
  let locks = 0;
  function lock(on) {
    locks = Math.max(0, locks + (on ? 1 : -1));
    const l = locks > 0;
    if (lenis) (l ? lenis.stop() : lenis.start());
    html.style.overflow = l ? 'hidden' : '';
  }
  d.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    const t = d.querySelector(a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    scrollToY(t.getBoundingClientRect().top + window.scrollY - 40);
  });

  /* ---------- intro: the logo builds itself, then flies into the header ---------- */
  function intro() {
    if (!html.classList.contains('is-intro')) return Promise.resolve();
    try { sessionStorage.setItem('snatch:intro', '1'); } catch (e) { /* storage blocked */ }
    const box = $('[data-intro]');
    const mark = $('[data-intro-mark]');
    const target = $('[data-header-logo]');
    if (!box || !mark) { html.classList.remove('is-intro'); return Promise.resolve(); }
    const letters = $$('path', mark);
    const line = $('.intro__line', box);
    return new Promise((resolve) => {
      letters.forEach((p, i) => p.animate([{ transform: 'translateY(115%)' }, { transform: 'translateY(0)' }], { duration: 900, delay: 120 + i * 70, easing: OUT, fill: 'forwards' }));
      if (line) line.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 600, delay: 700, easing: OUT, fill: 'forwards' });
      setTimeout(() => {
        if (line) line.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
        const from = mark.getBoundingClientRect();
        const to = target ? target.getBoundingClientRect() : null;
        if (to && to.width) {
          const sx = to.width / from.width;
          const dx = to.left + to.width / 2 - (from.left + from.width / 2);
          const dy = to.top + to.height / 2 - (from.top + from.height / 2);
          mark.animate([{ transform: 'none' }, { transform: `translate(${dx}px, ${dy}px) scale(${sx})` }], { duration: 900, easing: CINE, fill: 'forwards' });
        }
        const fade = box.animate([{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 100% 0)' }], { duration: 900, delay: 250, easing: CINE, fill: 'forwards' });
        setTimeout(resolve, 450);
        fade.finished.then(() => { html.classList.remove('is-intro'); box.remove(); });
      }, 1500);
    });
  }

  /* ---------- header ---------- */
  function header() {
    const h = $('[data-header]');
    if (!h) return;
    let last = window.scrollY;
    const lights = () => $$('[data-header-theme="light"]');
    const update = () => {
      const y = window.scrollY;
      const mid = (h.offsetHeight || 64) / 2;
      const light = lights().some((el) => { const r = el.getBoundingClientRect(); return r.top <= mid && r.bottom >= mid; });
      h.dataset.theme = light ? 'light' : 'dark';
      h.classList.toggle('is-solid', !light && y > 8);
      if (!d.body.classList.contains('menu-open')) {
        if (y > 320 && y > last + 6) h.classList.add('is-hidden');
        else if (y < last - 6 || y < 320) h.classList.remove('is-hidden');
      }
      last = y;
    };
    onScrollFns.add(update);
    update();
  }

  /* ---------- menu: unfolds as a Λ ---------- */
  function menu() {
    const m = $('[data-menu]');
    const btn = $('[data-menu-open]');
    if (!m || !btn) return;
    const shut = 'polygon(50% 0%, 50% 0%, 50% 0%, 50% 0%, 50% 0%)';
    const lam = 'polygon(50% 0%, 50% 0%, 118% 125%, -18% 125%, 50% 0%)';
    const full = 'polygon(50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%)';
    let last = null;
    let anim = null;
    const others = () => [$('#MainContent'), $('.section-footer'), $('[data-header]')].filter(Boolean);
    const open = () => {
      if (m.classList.contains('is-open')) return;
      last = d.activeElement;
      m.hidden = false;
      d.body.classList.add('menu-open');
      btn.setAttribute('aria-expanded', 'true');
      others().forEach((el) => { el.inert = true; });
      lock(true);
      requestAnimationFrame(() => m.classList.add('is-open'));
      if (!reduce) {
        if (anim) anim.cancel();
        anim = m.animate([{ clipPath: shut }, { clipPath: lam, offset: 0.55 }, { clipPath: full }], { duration: 1000, easing: CINE });
      }
      setTimeout(() => { const f = $('[data-menu-link]', m); if (f) f.focus({ preventScroll: true }); }, 120);
    };
    const close = () => {
      if (!m.classList.contains('is-open')) return;
      btn.setAttribute('aria-expanded', 'false');
      d.body.classList.remove('menu-open');
      others().forEach((el) => { el.inert = false; });
      lock(false);
      const done = () => { m.classList.remove('is-open'); m.hidden = true; };
      if (reduce) done();
      else {
        if (anim) anim.cancel();
        anim = m.animate([{ clipPath: full }, { clipPath: lam, offset: 0.45 }, { clipPath: shut }], { duration: 700, easing: CINE });
        anim.finished.then(done).catch(done);
      }
      if (last) last.focus({ preventScroll: true });
    };
    btn.addEventListener('click', open);
    $$('[data-menu-close]', m).forEach((b) => b.addEventListener('click', close));
    $$('a', m).forEach((a) => a.addEventListener('click', () => setTimeout(close, 20)));
    d.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    const pics = $$('[data-menu-pic]', m);
    $$('[data-menu-link]', m).forEach((a) => {
      const show = () => pics.forEach((p) => p.classList.toggle('is-on', p.dataset.menuPic === a.dataset.preview));
      a.addEventListener('pointerenter', show);
      a.addEventListener('focus', show);
    });
  }

  /* ---------- dialogs ---------- */
  function openDialog(dlg) {
    if (!dlg || dlg.open) return;
    dlg.showModal();
    lock(true);
  }
  function wireDialog(dlg) {
    if (!dlg) return;
    dlg.addEventListener('close', () => lock(false));
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    $$('[data-close]', dlg).forEach((b) => b.addEventListener('click', () => dlg.close()));
  }

  /* ---------- search ---------- */
  function search() {
    const dlg = $('[data-search]');
    if (!dlg) return;
    wireDialog(dlg);
    const input = $('[data-search-input]', dlg);
    const out = $('[data-search-results]', dlg);
    const hint = $('[data-search-hint]', dlg);
    d.addEventListener('click', (e) => {
      if (!e.target.closest('[data-search-open]')) return;
      openDialog(dlg);
      setTimeout(() => input.focus(), 60);
    });
    let timer = 0, seq = 0;
    const run = async (q) => {
      const mine = ++seq;
      out.setAttribute('aria-busy', 'true');
      try {
        const items = await predictive(q, 10);
        if (mine !== seq) return;
        out.innerHTML = items.length
          ? items.map((p, i) => {
            const [fam, col] = String(p.title).split(' - ');
            const img = p.featured_image && p.featured_image.url;
            return `<a class="s-item" style="animation-delay:${i * 40}ms" href="${esc(p.url)}"><span class="stage">${img ? `<img src="${esc(sized(img, 400))}" alt="" loading="lazy">` : ''}</span><span class="s-item__name">${esc(fam)}</span><span class="muted">${esc(col || '')}${col ? ' · ' : ''}${esc(formatMoney(toCents(p.price)))}</span></a>`;
          }).join('') + `<a class="search__all" href="${esc(S.routes.search)}?type=product&q=${encodeURIComponent(q)}">${esc(S.strings.viewAll)} →</a>`
          : `<p class="muted">${esc((S.strings.noResults || '').replace('__TERMS__', q))}</p>`;
      } catch (e) { out.innerHTML = ''; }
      out.removeAttribute('aria-busy');
    };
    input.addEventListener('input', () => {
      clearTimeout(timer);
      const q = input.value.trim();
      hint.hidden = q.length > 0;
      if (q.length < 2) { out.innerHTML = ''; return; }
      timer = setTimeout(() => run(q), 180);
    });
    $$('[data-term]', dlg).forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      input.value = a.dataset.term;
      hint.hidden = true;
      run(a.dataset.term);
    }));
  }

  /* ---------- cart ---------- */
  const cart = {
    dlg: null,
    async refresh(htmlStr, state) {
      if (htmlStr) {
        const tmp = d.createElement('div');
        tmp.innerHTML = htmlStr;
        const inner = tmp.querySelector('.shopify-section') ? tmp.querySelector('.shopify-section').innerHTML : tmp.innerHTML;
        $$('[data-cart-body], [data-cart-page]').forEach((el) => { el.innerHTML = inner; });
      }
      if (!state) state = await fetch(`${S.routes.cart}.js`).then((r) => r.json());
      $$('[data-cart-count]').forEach((el) => { el.textContent = state.item_count; });
      $$('[data-cart-count-label]').forEach((el) => { el.textContent = state.item_count; });
      $$('[data-cart-total]').forEach((el) => { el.textContent = formatMoney(state.total_price); });
      const bag = $('[data-bag-target]');
      if (bag) { bag.classList.remove('is-bump'); void bag.offsetWidth; bag.classList.add('is-bump'); }
      const foot = $('[data-cart-foot]');
      if (foot) foot.hidden = state.item_count === 0;
      bindLines();
      return state;
    },
    async change(key, quantity) {
      const body = $('[data-cart-body]');
      if (body) body.setAttribute('aria-busy', 'true');
      try {
        const res = await fetch(`${S.routes.cartChange}.js`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ id: key, quantity, sections: 'cart-lines' }) });
        const json = await res.json();
        if (!res.ok) throw new Error(json.description || S.strings.error);
        await cart.refresh(json.sections && json.sections['cart-lines'], json);
        status(S.strings.cartUpdated);
      } catch (e) { status(e.message || S.strings.error); }
      if (body) body.setAttribute('aria-busy', 'false');
    },
    async add(id, formData) {
      const fd = formData || new FormData();
      if (!formData) { fd.append('id', id); fd.append('quantity', 1); }
      fd.append('sections', 'cart-lines');
      const res = await fetch(`${S.routes.cartAdd}.js`, { method: 'POST', headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, body: fd });
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
  function bindLines() {
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
    bindLines();
  }
  // the photo flies into the bag
  function fly(img) {
    const bag = $('[data-bag-target]');
    if (reduce || !img || !bag) return Promise.resolve();
    const a = img.getBoundingClientRect();
    const b = bag.getBoundingClientRect();
    if (!a.width) return Promise.resolve();
    const c = img.cloneNode();
    c.removeAttribute('srcset');
    c.src = img.currentSrc || img.src;
    c.className = 'fly';
    Object.assign(c.style, { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px' });
    d.body.appendChild(c);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const s = 28 / a.width;
    const anim = c.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1, borderRadius: '0%' },
      { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 120}px) scale(${Math.max(s * 3, 0.35)})`, opacity: 1, borderRadius: '30%', offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 0.4, borderRadius: '50%' }
    ], { duration: 850, easing: CINE });
    return anim.finished.then(() => c.remove()).catch(() => c.remove());
  }

  /* ---------- product cards ---------- */
  function pickDot(card, dot) {
    $$('[data-dot]', card).forEach((x) => x.classList.toggle('is-active', x === dot));
    const img = $('[data-card-img]', card);
    const alt = $('[data-card-alt]', card);
    if (img && dot.dataset.img) { if (dot.dataset.srcset) img.srcset = dot.dataset.srcset; img.src = dot.dataset.img; }
    if (alt) {
      if (dot.dataset.img2) { alt.removeAttribute('srcset'); alt.src = dot.dataset.img2; alt.hidden = false; } else alt.hidden = true;
    }
    const colour = $('[data-card-colour]', card);
    if (colour) colour.textContent = dot.dataset.colour || '';
    const price = $('.price__now', card);
    if (price && dot.dataset.price) price.textContent = dot.dataset.price;
    $$('[data-card-link]', card).forEach((l) => { l.href = dot.getAttribute('href'); });
    const add = $('[data-quick-add]', card);
    if (add) {
      add.dataset.variant = dot.dataset.variant;
      add.disabled = dot.dataset.available !== 'true';
      if (add.dataset.labelTemplate) add.setAttribute('aria-label', add.dataset.labelTemplate.replace('__T__', dot.dataset.title || ''));
    }
  }
  function bindCards(scope = d) {
    $$('[data-card]', scope).forEach((card) => {
      if (card.dataset.bound) return;
      card.dataset.bound = '1';
      $$('[data-dot]', card).forEach((dot) => {
        dot.addEventListener('pointerenter', () => pickDot(card, dot));
        dot.addEventListener('focus', () => pickDot(card, dot));
        dot.addEventListener('pointerenter', () => { const i = new Image(); i.src = dot.dataset.img; }, { once: true });
      });
    });
  }
  function familyDots(scope = d) {
    const cards = $$('[data-family-fetch]', scope).filter((c) => !c.dataset.famDone);
    if (!cards.length) return;
    const load = async (card) => {
      card.dataset.famDone = '1';
      const family = card.dataset.familyFetch;
      try {
        const items = sameFamily(await predictive(family, 10), family);
        if (items.length < 2) return;
        const link = $('[data-card-link]', card);
        const here = link ? link.getAttribute('href').split('?')[0] : '';
        const ul = d.createElement('ul');
        ul.className = 'dots';
        ul.setAttribute('role', 'list');
        items.slice(0, 7).forEach((p) => {
          const col = String(p.title).split(' - ').slice(1).join(' - ') || p.title;
          const img = p.featured_image && p.featured_image.url;
          const v = (p.variants && p.variants[0]) || {};
          const li = d.createElement('li');
          const a = d.createElement('a');
          a.className = 'dot' + (String(p.url).split('?')[0] === here ? ' is-active' : '');
          a.href = p.url;
          a.setAttribute('data-dot', '');
          Object.assign(a.dataset, {
            colour: col, variant: v.id || '', available: v.available === false ? 'false' : 'true', title: p.title,
            img: sized(img, 900), srcset: `${sized(img, 540)} 540w, ${sized(img, 900)} 900w, ${sized(img, 1200)} 1200w`,
            price: formatMoney(toCents(p.price))
          });
          a.setAttribute('aria-label', family + ' – ' + col);
          a.style.setProperty('--dot', colourCss(col));
          li.appendChild(a);
          ul.appendChild(li);
        });
        $('.card__meta', card).appendChild(ul);
        const sub = $('.card__sub', card);
        if (sub && !$('.card__count', sub)) { const sp = d.createElement('span'); sp.className = 'card__count'; sp.textContent = ' · ' + items.length; sub.appendChild(sp); }
        delete card.dataset.bound;
        bindCards(card.parentElement);
      } catch (e) { /* enhancement only */ }
    };
    if (!('IntersectionObserver' in window)) { cards.forEach(load); return; }
    const obs = new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) { obs.unobserve(x.target); load(x.target); } }), { rootMargin: '300px' });
    cards.forEach((c) => obs.observe(c));
  }
  function quickAdd() {
    d.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-quick-add]');
      if (!b || b.disabled) return;
      e.preventDefault();
      b.setAttribute('aria-busy', 'true');
      const card = b.closest('[data-card]');
      try {
        const done = cart.add(b.dataset.variant);
        await fly(card && $('[data-card-img]', card));
        await done;
        status(S.strings.added);
        cart.open();
      } catch (err) { announce(err.message || S.strings.error); }
      b.removeAttribute('aria-busy');
    });
  }

  /* ---------- reveals ---------- */
  let io = null;
  function splitWords(scope = d) {
    $$('[data-split]', scope).forEach((el) => {
      if (el.dataset.splitDone || reduce) return;
      el.dataset.splitDone = '1';
      const words = el.textContent.trim().split(/\s+/);
      el.setAttribute('aria-label', el.textContent.trim());
      el.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true" style="--wi:${i}"><span>${esc(w)}</span></span>`).join(' ');
    });
  }
  function reveals(scope = d) {
    splitWords(scope);
    const targets = $$('[data-split], [data-reveal-img], [data-rise]', scope);
    const kids = $$('.grid[data-plp-grid] > *, .rail__track > *', scope);
    if (reduce || !('IntersectionObserver' in window)) { [...targets, ...kids].forEach((k) => k.classList.add('is-in')); return; }
    if (!io) io = new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) { x.target.classList.add('is-in'); io.unobserve(x.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    kids.forEach((k, i) => { k.style.transitionDelay = `${(i % 4) * 70}ms`; io.observe(k); });
    targets.forEach((t) => io.observe(t));
  }
  function parallax() {
    if (reduce) return;
    $$('[data-parallax]').forEach((el) => {
      const amt = parseFloat(el.dataset.parallax) || 8;
      const img = el.querySelector('img') || el;
      onScrollFns.add(() => {
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight;
        if (r.bottom < 0 || r.top > vh) return;
        img.style.transform = `translate3d(0, ${(-((r.top + r.height / 2 - vh / 2) / vh) * amt).toFixed(2)}%, 0)`;
      });
    });
  }

  /* ---------- Λ hero: scroll opens the window ---------- */
  function lambdaHero() {
    $$('[data-lhero]').forEach((sec) => {
      const win = $('[data-lhero-window]', sec);
      if (!win || reduce) return;
      const pt = (a, b, t) => `${lerp(a[0], b[0], t).toFixed(2)}% ${lerp(a[1], b[1], t).toFixed(2)}%`;
      const update = () => {
        const r = sec.getBoundingClientRect();
        const vh = window.innerHeight;
        if (r.bottom < 0 || r.top > vh) return;
        const p = clamp(-r.top / Math.max(1, r.height - vh));
        const t = ease(clamp(p / 0.9));
        const mob = window.innerWidth < 750;
        const A = mob ? [50, 25] : [50, 17];
        const R = mob ? [90, 75] : [70, 84];
        const L = mob ? [10, 75] : [30, 84];
        win.style.clipPath = `polygon(${pt(A, [50, 0], t)}, ${pt(A, [100, 0], t)}, ${pt(R, [100, 100], t)}, ${pt(L, [0, 100], t)}, ${pt(A, [0, 0], t)})`;
        sec.style.setProperty('--p', t.toFixed(4));
        if (t > 0.85) sec.setAttribute('data-open', ''); else sec.removeAttribute('data-open');
      };
      onScrollFns.add(update);
      update();
    });
  }

  /* ---------- product rail: drag, arrows, progress ---------- */
  function rails(scope = d) {
    $$('[data-rail]', scope).forEach((rail) => {
      const vp = $('[data-rail-viewport]', rail);
      if (!vp || vp.dataset.bound) return;
      vp.dataset.bound = '1';
      const bar = $('[data-rail-bar]', rail);
      const cur = $('[data-rail-current]', rail);
      const tot = $('[data-rail-total]', rail);
      const prev = $('[data-rail-prev]', rail);
      const next = $('[data-rail-next]', rail);
      const items = $$('.rail__item', vp).filter((i) => !i.classList.contains('rail__item--end'));
      if (tot) tot.textContent = String(items.length).padStart(2, '0');
      const step = () => (items[0] ? items[0].getBoundingClientRect().width + 16 : vp.clientWidth * 0.8);
      const update = () => {
        const max = vp.scrollWidth - vp.clientWidth;
        const p = max > 0 ? vp.scrollLeft / max : 0;
        if (bar) bar.style.transform = `scaleX(${0.08 + p * 0.92})`;
        if (cur) cur.textContent = String(Math.min(items.length, Math.round(vp.scrollLeft / step()) + 1)).padStart(2, '0');
        if (prev) prev.disabled = vp.scrollLeft < 4;
        if (next) next.disabled = vp.scrollLeft > max - 4;
      };
      vp.addEventListener('scroll', update, { passive: true });
      if (prev) prev.addEventListener('click', () => vp.scrollBy({ left: -step(), behavior: reduce ? 'auto' : 'smooth' }));
      if (next) next.addEventListener('click', () => vp.scrollBy({ left: step(), behavior: reduce ? 'auto' : 'smooth' }));
      update();
      if (!canHover) return;
      let down = false, moved = false, x0 = 0, s0 = 0, lastX = 0, lastT = 0, vel = 0, raf = 0;
      vp.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        down = true; moved = false; x0 = lastX = e.clientX; s0 = vp.scrollLeft; lastT = performance.now(); vel = 0;
        cancelAnimationFrame(raf);
      });
      window.addEventListener('pointermove', (e) => {
        if (!down) return;
        const dx = e.clientX - x0;
        if (!moved && Math.abs(dx) > 5) { moved = true; vp.classList.add('is-dragging'); }
        if (!moved) return;
        vp.scrollLeft = s0 - dx;
        const now = performance.now();
        vel = (e.clientX - lastX) / Math.max(1, now - lastT);
        lastX = e.clientX; lastT = now;
      });
      window.addEventListener('pointerup', () => {
        if (!down) return;
        down = false;
        if (!moved) return;
        let v = -vel * 16;
        const glide = () => {
          v *= 0.94;
          vp.scrollLeft += v;
          if (Math.abs(v) > 0.4) raf = requestAnimationFrame(glide);
          else vp.classList.remove('is-dragging');
        };
        raf = requestAnimationFrame(glide);
        vp.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); }, { capture: true, once: true });
      });
    });
  }

  /* ---------- shape index: the bag follows your cursor ---------- */
  function shapeIndex() {
    $$('[data-sindex]').forEach((sec) => {
      const float = $('[data-sindex-float]', sec);
      const fimg = $('[data-sindex-float-img]', sec);
      if (!float || !canHover || reduce) return;
      let x = 0, y = 0, tx = 0, ty = 0, raf = 0, on = false, px = 0;
      const loop = () => {
        x = lerp(x, tx, 0.14); y = lerp(y, ty, 0.14);
        const rot = clamp((tx - px) * 0.08, -8, 8);
        px = lerp(px, tx, 0.1);
        float.style.transform = `translate3d(${x - float.offsetWidth / 2}px, ${y - float.offsetHeight / 2}px, 0) rotate(${rot}deg)`;
        if (on || Math.abs(tx - x) > 0.5) raf = requestAnimationFrame(loop);
      };
      $$('[data-sindex-link]', sec).forEach((a) => {
        a.addEventListener('pointerenter', (e) => {
          const src = $('[data-sindex-img]', a);
          if (src) fimg.src = src.currentSrc || src.src;
          if (!on) { x = tx = e.clientX; y = ty = e.clientY; px = tx; }
          on = true;
          float.classList.add('is-on');
          cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
        });
        a.addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; });
      });
      $('.sindex__list', sec).addEventListener('pointerleave', () => { on = false; float.classList.remove('is-on'); });
    });
  }

  /* ---------- colour story: scrolling changes the colour ---------- */
  function colourStory() {
    $$('[data-cstory]').forEach((sec) => {
      const slides = $$('[data-cstory-slide]', sec);
      const names = $$('[data-cstory-name]', sec);
      const steps = $$('[data-cstory-step]', sec);
      const price = $('[data-cstory-price]', sec);
      const link = $('[data-cstory-link]', sec);
      const add = $('[data-cstory-add]', sec);
      const n = slides.length;
      if (!n) return;
      let idx = -1;
      const set = (i) => {
        if (i === idx) return;
        const prevIdx = idx;
        idx = i;
        slides.forEach((s, k) => s.classList.toggle('is-on', k === i));
        names.forEach((s, k) => { s.classList.toggle('is-on', k === i); s.classList.toggle('is-out', k === prevIdx); });
        steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
        const s = slides[i];
        sec.style.setProperty('--tint', s.dataset.tint);
        sec.style.setProperty('--fg', isDark(s.dataset.tint) ? 'var(--paper)' : 'var(--ink)');
        if (price) price.textContent = s.dataset.price || '';
        if (link) link.href = s.dataset.url;
        if (add) { add.disabled = s.dataset.available !== 'true'; add.dataset.variant = s.dataset.variant; }
      };
      const span = () => Math.max(1, sec.offsetHeight - window.innerHeight);
      if (!reduce) {
        onScrollFns.add(() => {
          const r = sec.getBoundingClientRect();
          if (r.bottom < 0 || r.top > window.innerHeight) return;
          const p = clamp(-r.top / span(), 0, 0.9999);
          set(Math.floor(p * n));
        });
      }
      steps.forEach((b, k) => b.addEventListener('click', () => {
        if (reduce) { set(k); return; }
        const top = sec.getBoundingClientRect().top + window.scrollY;
        scrollToY(top + ((k + 0.5) / n) * span());
      }));
      if (add) add.addEventListener('click', async () => {
        if (add.disabled) return;
        add.setAttribute('aria-busy', 'true');
        try {
          const job = cart.add(add.dataset.variant);
          await fly($('img', slides[idx]));
          await job;
          status(S.strings.added);
          cart.open();
        } catch (e) { announce(e.message || S.strings.error); }
        add.removeAttribute('aria-busy');
      });
      set(0);
    });
  }

  /* ---------- collection filters ---------- */
  function collection() {
    const grid = $('[data-plp-grid]');
    if (!grid) return;
    const cards = $$('[data-card]', grid);
    const chipsWrap = $('[data-shape-chips]');
    const colourWrap = $('[data-colour-filter]');
    const clear = $('[data-clear]');
    const count = $('[data-plp-count]');
    const title = $('[data-plp-title]');
    const none = $('[data-plp-none]');
    const params = new URLSearchParams(window.location.search);
    const state = { shape: params.get('shape') || 'all', colour: params.get('colour') || '' };
    const shapes = new Map();
    cards.forEach((c) => {
      const k = c.dataset.shape;
      if (!k) return;
      const v = shapes.get(k) || { label: c.dataset.shapeLabel || k, n: 0 };
      v.n += 1; shapes.set(k, v);
    });
    [...shapes.entries()].sort((a, b) => b[1].n - a[1].n).forEach(([k, v]) => {
      const b = d.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.dataset.shape = k; b.dataset.label = v.label;
      b.setAttribute('aria-pressed', 'false');
      b.innerHTML = `${esc(v.label)} <sup>${v.n}</sup>`;
      chipsWrap.appendChild(b);
    });
    const used = new Set();
    cards.forEach((c) => (c.dataset.colours || '').split(/\s+/).forEach((f) => f && used.add(f)));
    $$('[data-colour]', colourWrap).forEach((b) => { if (!used.has(b.dataset.colour)) b.hidden = true; });
    const apply = (push = true) => {
      let shown = 0;
      cards.forEach((c) => {
        const ok = (state.shape === 'all' || c.dataset.shape === state.shape) && (!state.colour || (c.dataset.colours || '').split(/\s+/).includes(state.colour));
        c.classList.toggle('is-hidden', !ok);
        if (ok) {
          shown += 1;
          c.classList.add('is-in');
          if (state.colour) { const dot = $$('[data-dot]', c).find((x) => (x.dataset.fam || '').split(' ').includes(state.colour)); if (dot) pickDot(c, dot); }
        }
      });
      $$('[data-shape]', chipsWrap).forEach((b) => { const on = b.dataset.shape === state.shape; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on)); });
      $$('[data-colour]', colourWrap).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.colour === state.colour)));
      if (clear) clear.hidden = state.shape === 'all' && !state.colour;
      if (none) none.hidden = shown > 0;
      if (count && (state.shape !== 'all' || state.colour)) count.textContent = (S.strings.results || '').replace('__COUNT__', shown);
      if (title) { const chip = $(`[data-shape="${state.shape}"]`, chipsWrap); title.textContent = state.shape !== 'all' && chip && chip.dataset.label ? chip.dataset.label : title.dataset.default; }
      if (push) {
        const url = new URL(window.location.href);
        if (state.shape !== 'all') url.searchParams.set('shape', state.shape); else url.searchParams.delete('shape');
        if (state.colour) url.searchParams.set('colour', state.colour); else url.searchParams.delete('colour');
        window.history.replaceState({}, '', url.toString());
        announce(count ? count.textContent : String(shown));
      }
    };
    chipsWrap.addEventListener('click', (e) => { const b = e.target.closest('[data-shape]'); if (!b) return; state.shape = b.dataset.shape; apply(); });
    colourWrap.addEventListener('click', (e) => { const b = e.target.closest('[data-colour]'); if (!b) return; state.colour = state.colour === b.dataset.colour ? '' : b.dataset.colour; apply(); });
    if (clear) clear.addEventListener('click', () => { state.shape = 'all'; state.colour = ''; apply(); });
    if (state.shape !== 'all' || state.colour) apply(false);
    const dens = $$('[data-density]');
    const setDensity = (n) => {
      grid.dataset.density = n;
      dens.forEach((b) => { const on = b.dataset.density === n; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on)); });
      try { localStorage.setItem('snatch:density', n); } catch (e) { /* storage unavailable */ }
    };
    dens.forEach((b) => b.addEventListener('click', () => setDensity(b.dataset.density)));
    try { const sv = localStorage.getItem('snatch:density'); if (sv) setDensity(sv); } catch (e) { /* storage unavailable */ }
    const sort = $('[data-sort]');
    if (sort) sort.addEventListener('change', () => { const url = new URL(window.location.href); url.searchParams.set('sort_by', sort.value); url.searchParams.delete('page'); window.location.href = url.toString(); });
  }

  /* ---------- product page ---------- */
  function pdp() {
    const root = $('[data-pdp]');
    if (!root) return;
    const form = $('[data-product-form]', root);
    const addBtn = $('[data-add]', root);
    const addLabel = $('[data-add-label]', root);
    const addPrice = $('[data-add-price]', root);
    const err = $('[data-form-error]', root);
    const idInput = $('[data-variant-id]', root);
    const media = $('[data-pdp-media]', root);

    const vJson = $('[data-variants]', root);
    if (vJson) {
      const variants = JSON.parse(vJson.textContent);
      $$('[data-option-input]', form).forEach((i) => i.addEventListener('change', () => {
        const sel = $$('[data-option]', form).map((fs) => { const c = $('input:checked', fs); return c ? c.value : null; });
        const v = variants.find((x) => x.options.every((o, k) => o === sel[k]));
        if (!v) { addBtn.disabled = true; addLabel.textContent = S.strings.soldOut; return; }
        idInput.value = v.id;
        addBtn.disabled = !v.available;
        addLabel.textContent = v.available ? S.strings.addToBag : S.strings.soldOut;
        if (addPrice) addPrice.textContent = formatMoney(v.price);
        $$('[data-price] .price__now', root).forEach((el) => { el.textContent = formatMoney(v.price); });
        const url = new URL(window.location.href);
        url.searchParams.set('variant', v.id);
        window.history.replaceState({}, '', url.toString());
        announce(`${v.title} ${formatMoney(v.price)}`);
      }));
    }

    if (form) form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (addBtn.disabled) return;
      err.hidden = true;
      addBtn.setAttribute('aria-busy', 'true');
      const prev = addLabel.textContent;
      addLabel.textContent = S.strings.adding;
      try {
        const job = cart.add(null, new FormData(form));
        const first = media && $('img', media);
        await fly(first);
        await job;
        status(S.strings.added);
        cart.open();
      } catch (ex) { err.textContent = ex.message || S.strings.error; err.hidden = false; }
      addLabel.textContent = prev;
      addBtn.removeAttribute('aria-busy');
    });

    const counter = $('[data-pdp-index]', root);
    if (media && counter) media.addEventListener('scroll', () => { counter.textContent = Math.round(media.scrollLeft / media.clientWidth) + 1; }, { passive: true });

    const zoom = $('[data-zoom-dialog]', root);
    if (zoom) {
      wireDialog(zoom);
      const track = $('[data-zoom-track]', zoom);
      $$('[data-zoom]', root).forEach((b) => b.addEventListener('click', () => {
        openDialog(zoom);
        requestAnimationFrame(() => { track.scrollLeft = Number(b.dataset.zoom) * track.clientWidth; });
      }));
    }

    const bar = $('[data-pdp-bar]', root);
    const barBtn = $('[data-bar-add]', root);
    if (bar && addBtn && 'IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => {
        const show = !en.isIntersecting && en.boundingClientRect.top < 0;
        bar.classList.toggle('is-visible', show);
        bar.setAttribute('aria-hidden', String(!show));
        if (barBtn) barBtn.tabIndex = show ? 0 : -1;
      }).observe(addBtn);
      if (barBtn) barBtn.addEventListener('click', () => (form.requestSubmit ? form.requestSubmit() : form.submit()));
    }

    const family = root.dataset.family;
    const wrap = $('[data-siblings]', root);
    const list = $('[data-sibling-list]', root);
    const label = $('[data-sib-name]', root);
    if (family && wrap && list) {
      predictive(family, 10).then((all) => {
        const items = sameFamily(all, family);
        if (items.length < 2) return;
        const here = window.location.pathname.replace(/\/$/, '').split('/').pop();
        const original = label ? label.textContent : '';
        list.innerHTML = items.map((p) => {
          const col = String(p.title).split(' - ').slice(1).join(' - ') || p.title;
          const handle = String(p.url).split('?')[0].replace(/\/$/, '').split('/').pop();
          return `<li><a class="swatch" href="${esc(p.url)}" style="--dot:${colourCss(col)}" data-name="${esc(col)}" aria-label="${esc(col)}"${handle === here ? ' aria-current="true"' : ''}></a></li>`;
        }).join('');
        $$('.swatch', list).forEach((s) => {
          s.addEventListener('pointerenter', () => { if (label) label.textContent = s.dataset.name; });
          s.addEventListener('pointerleave', () => { if (label) label.textContent = original; });
        });
        wrap.hidden = false;
      }).catch(() => {});
    }
  }

  function recommendations() {
    $$('[data-recs]').forEach(async (el) => {
      if (el.children.length) return;
      try {
        const text = await fetch(el.dataset.url).then((r) => r.text());
        const tmp = d.createElement('div');
        tmp.innerHTML = text;
        const fresh = tmp.querySelector('[data-recs]');
        if (fresh && fresh.innerHTML.trim()) {
          el.innerHTML = fresh.innerHTML;
          bindCards(el); familyDots(el); rails(el.parentElement); reveals(el);
        }
      } catch (e) { /* optional */ }
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    window.__snatchBooted = true;
    initScroll();
    header();
    menu();
    search();
    initCart();
    bindCards();
    familyDots();
    quickAdd();
    lambdaHero();
    rails();
    shapeIndex();
    colourStory();
    parallax();
    collection();
    pdp();
    recommendations();
    intro().then(() => reveals());
    requestScroll();
  }
  d.addEventListener('shopify:section:load', (e) => { bindCards(e.target); familyDots(e.target); rails(e.target); reveals(e.target); });
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot); else boot();
  window.SNATCH.formatMoney = formatMoney;
})();
