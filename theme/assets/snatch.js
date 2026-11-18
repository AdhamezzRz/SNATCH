/* SNATCH — Gallery White. Vanilla JS, no dependencies. */
(() => {
  'use strict';

  const S = window.SNATCH || {};
  S.strings = S.strings || {};
  S.routes = S.routes || {};
  const d = document;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => Array.from(c.querySelectorAll(s));

  /* ---------- announcer ---------- */
  let annRaf = 0;
  function announce(msg) {
    const el = $('#sr-announcer');
    if (!el || !msg) return;
    cancelAnimationFrame(annRaf);
    el.textContent = '';
    annRaf = requestAnimationFrame(() => { el.textContent = msg; });
  }

  /* ---------- money ---------- */
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
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- dialogs ---------- */
  function openDialog(dlg) {
    if (!dlg || dlg.open) return;
    d.querySelectorAll('dialog[open]').forEach((o) => o.close());
    dlg.showModal();
    d.documentElement.style.overflow = 'hidden';
  }
  function wireDialog(dlg) {
    if (!dlg) return;
    dlg.addEventListener('close', () => { if (!d.querySelector('dialog[open]')) d.documentElement.style.overflow = ''; });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    $$('[data-close]', dlg).forEach((b) => b.addEventListener('click', () => dlg.close()));
  }

  /* ---------- menu drawer ---------- */
  function menu() {
    const dlg = $('[data-menu-drawer]');
    wireDialog(dlg);
    $$('[data-menu-open]').forEach((b) => b.addEventListener('click', () => openDialog(dlg)));
  }

  /* ---------- predictive search ---------- */
  function search() {
    const dlg = $('[data-search]');
    if (!dlg) return;
    wireDialog(dlg);
    const input = $('[data-search-input]', dlg);
    const out = $('[data-search-results]', dlg);
    const hint = $('[data-search-hint]', dlg);
    d.addEventListener('click', (e) => {
      const b = e.target.closest('[data-search-open]');
      if (!b) return;
      openDialog(dlg);
      setTimeout(() => input.focus(), 40);
    });
    let ctrl = null, timer = 0;
    const toCents = (p) => (String(p).includes('.') ? Math.round(parseFloat(p) * 100) : Number(p));
    const run = async (q) => {
      if (ctrl) ctrl.abort();
      ctrl = new AbortController();
      out.setAttribute('aria-busy', 'true');
      try {
        const url = `${S.routes.predictive}.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=10&resources[options][unavailable_products]=last`;
        const json = await fetch(url, { signal: ctrl.signal }).then((r) => r.json());
        const items = (json.resources && json.resources.results && json.resources.results.products) || [];
        if (!items.length) {
          out.innerHTML = `<p class="muted">${esc((S.strings.noResults || '').replace('__TERMS__', q))}</p>`;
        } else {
          out.innerHTML = items.map((p) => {
            const [fam, col] = String(p.title).split(' - ');
            const img = p.featured_image && p.featured_image.url ? `${p.featured_image.url}${p.featured_image.url.includes('?') ? '&' : '?'}width=400` : '';
            return `<a class="s-item" href="${esc(p.url)}"><span class="stage">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ''}</span><span class="s-item__name">${esc(fam)}</span><span class="muted">${esc(col || '')}${col ? ' · ' : ''}${esc(formatMoney(toCents(p.price)))}</span></a>`;
          }).join('') + `<a class="link-arrow search__all" href="${esc(S.routes.search)}?type=product&q=${encodeURIComponent(q)}">${esc(S.strings.viewAll)} →</a>`;
        }
      } catch (e) { if (e.name !== 'AbortError') out.innerHTML = ''; }
      out.removeAttribute('aria-busy');
    };
    input.addEventListener('input', () => {
      clearTimeout(timer);
      const q = input.value.trim();
      hint.hidden = q.length > 0;
      if (q.length < 2) { out.innerHTML = ''; return; }
      timer = setTimeout(() => run(q), 200);
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
    async refresh(html, state) {
      if (html) {
        const tmp = d.createElement('div');
        tmp.innerHTML = html;
        const inner = tmp.querySelector('.shopify-section') ? tmp.querySelector('.shopify-section').innerHTML : tmp.innerHTML;
        $$('[data-cart-body], [data-cart-page]').forEach((el) => { el.innerHTML = inner; });
      }
      if (!state) state = await fetch(`${S.routes.cart}.js`).then((r) => r.json());
      $$('[data-cart-count]').forEach((el) => {
        el.textContent = state.item_count;
        el.hidden = state.item_count === 0;
        el.classList.remove('is-bump'); void el.offsetWidth; el.classList.add('is-bump');
      });
      $$('[data-cart-count-label]').forEach((el) => { el.textContent = `(${state.item_count})`; });
      $$('[data-cart-total]').forEach((el) => { el.textContent = formatMoney(state.total_price); });
      const foot = $('[data-cart-foot]');
      if (foot) foot.hidden = state.item_count === 0;
      bindLines();
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
      } catch (e) { status(e.message || S.strings.error); }
      if (body) body.setAttribute('aria-busy', 'false');
    },
    async add(id, quantity = 1, formData = null) {
      const fd = formData || new FormData();
      if (!formData) { fd.append('id', id); fd.append('quantity', quantity); }
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

  /* ---------- product cards: colour dots + quick add ---------- */
  function pickDot(card, dot) {
    const dots = $$('[data-dot]', card);
    dots.forEach((x) => x.classList.toggle('is-active', x === dot));
    const img = $('[data-card-img]', card);
    const alt = $('[data-card-alt]', card);
    if (img && dot.dataset.img) {
      if (dot.dataset.srcset) img.srcset = dot.dataset.srcset;
      img.src = dot.dataset.img;
    }
    if (alt) {
      if (dot.dataset.img2) { alt.removeAttribute('srcset'); alt.src = dot.dataset.img2; alt.hidden = false; }
      else alt.hidden = true;
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
  function quickAdd() {
    d.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-quick-add]');
      if (!b || b.disabled) return;
      e.preventDefault();
      b.setAttribute('aria-busy', 'true');
      try {
        await cart.add(b.dataset.variant, 1);
        b.classList.add('is-done');
        status(S.strings.added);
        cart.open();
        setTimeout(() => b.classList.remove('is-done'), 1500);
      } catch (err) {
        announce(err.message || S.strings.error);
      }
      b.removeAttribute('aria-busy');
    });
  }

  /* ---------- reveal: one quiet fade, once ---------- */
  let io = null;
  function reveals(scope = d) {
    const kids = $$('[data-reveal-group] > *, .grid[data-plp-grid] > *', scope);
    if (reduce || !('IntersectionObserver' in window)) { kids.forEach((k) => k.classList.add('is-in')); return; }
    if (!io) io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -5% 0px' });
    kids.forEach((k, i) => { k.style.transitionDelay = `${(i % 4) * 60}ms`; io.observe(k); });
  }

  /* ---------- colour finder ---------- */
  function finders() {
    $$('[data-finder]').forEach((sec) => {
      const slides = $$('[data-finder-slide]', sec);
      const inputs = $$('[data-finder-input]', sec);
      const price = $('[data-finder-price]', sec);
      const colour = $('[data-finder-colour]', sec);
      const link = $('[data-finder-link]', sec);
      const add = $('[data-finder-add]', sec);
      let current = inputs[0];
      const show = (inp) => {
        current = inp;
        const i = inputs.indexOf(inp);
        slides.forEach((s, k) => {
          s.classList.toggle('is-active', k === i);
          if (k === i) s.removeAttribute('aria-hidden'); else s.setAttribute('aria-hidden', 'true');
        });
        if (price) price.textContent = inp.dataset.price || '';
        if (colour) colour.textContent = inp.dataset.colour || '';
        if (link) link.href = inp.dataset.url;
        if (add) {
          add.disabled = inp.dataset.available !== 'true';
          add.textContent = inp.dataset.available === 'true' ? S.strings.addToBag : S.strings.soldOut;
        }
      };
      inputs.forEach((inp) => {
        inp.addEventListener('change', () => show(inp));
        inp.parentElement.addEventListener('pointerenter', () => { const i = new Image(); const s = slides[inputs.indexOf(inp)]; const im = s && s.querySelector('img'); if (im) i.src = im.currentSrc || im.src; }, { once: true });
      });
      if (add) add.addEventListener('click', async () => {
        if (!current || add.disabled) return;
        add.setAttribute('aria-busy', 'true');
        add.textContent = S.strings.adding;
        try {
          await cart.add(current.dataset.variant, 1);
          status(S.strings.added);
          cart.open();
        } catch (e) { announce(e.message || S.strings.error); }
        add.removeAttribute('aria-busy');
        add.textContent = S.strings.addToBag;
      });
      if (inputs[0]) show(inputs[0]);
    });
  }

  /* ---------- collection: shape chips, colour filter, density, sort ---------- */
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

    // shape chips from what's on the page
    const shapes = new Map();
    cards.forEach((c) => {
      const k = c.dataset.shape;
      if (!k) return;
      const v = shapes.get(k) || { label: c.dataset.shapeLabel || k, n: 0 };
      v.n += 1;
      shapes.set(k, v);
    });
    [...shapes.entries()].sort((a, b) => b[1].n - a[1].n).forEach(([k, v]) => {
      const b = d.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.dataset.shape = k;
      b.dataset.label = v.label;
      b.setAttribute('aria-pressed', 'false');
      b.innerHTML = `${esc(v.label)} <sup>${v.n}</sup>`;
      chipsWrap.appendChild(b);
    });
    // hide colour buttons nothing on the page uses
    const used = new Set();
    cards.forEach((c) => (c.dataset.colours || '').split(/\s+/).forEach((f) => f && used.add(f)));
    $$('[data-colour]', colourWrap).forEach((b) => { if (!used.has(b.dataset.colour)) b.hidden = true; });

    const apply = (push = true) => {
      let shown = 0;
      cards.forEach((c) => {
        const okShape = state.shape === 'all' || c.dataset.shape === state.shape;
        const fams = (c.dataset.colours || '').split(/\s+/);
        const okColour = !state.colour || fams.includes(state.colour);
        const show = okShape && okColour;
        c.classList.toggle('is-hidden', !show);
        if (show) {
          shown += 1;
          c.classList.add('is-in');
          // show each style in the chosen colour
          if (state.colour) {
            const dot = $$('[data-dot]', c).find((x) => (x.dataset.fam || '').split(' ').includes(state.colour));
            if (dot) pickDot(c, dot);
          }
        }
      });
      $$('[data-shape]', chipsWrap).forEach((b) => {
        const on = b.dataset.shape === state.shape;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      $$('[data-colour]', colourWrap).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.colour === state.colour)));
      if (clear) clear.hidden = state.shape === 'all' && !state.colour;
      if (none) none.hidden = shown > 0;
      if (count && (state.shape !== 'all' || state.colour)) count.textContent = (S.strings.results || '').replace('__COUNT__', shown);
      if (title) {
        const chip = $(`[data-shape="${state.shape}"]`, chipsWrap);
        title.textContent = state.shape !== 'all' && chip && chip.dataset.label ? chip.dataset.label : title.dataset.default;
      }
      if (push) {
        const url = new URL(window.location.href);
        if (state.shape !== 'all') url.searchParams.set('shape', state.shape); else url.searchParams.delete('shape');
        if (state.colour) url.searchParams.set('colour', state.colour); else url.searchParams.delete('colour');
        window.history.replaceState({}, '', url.toString());
        announce(count ? count.textContent : String(shown));
      }
    };
    chipsWrap.addEventListener('click', (e) => {
      const b = e.target.closest('[data-shape]');
      if (!b) return;
      state.shape = b.dataset.shape;
      apply();
    });
    colourWrap.addEventListener('click', (e) => {
      const b = e.target.closest('[data-colour]');
      if (!b) return;
      state.colour = state.colour === b.dataset.colour ? '' : b.dataset.colour;
      apply();
    });
    if (clear) clear.addEventListener('click', () => { state.shape = 'all'; state.colour = ''; apply(); });
    if (state.shape !== 'all' || state.colour) apply(false);

    // density toggle (remembered per visitor)
    const dens = $$('[data-density]');
    const setDensity = (n) => {
      grid.dataset.density = n;
      dens.forEach((b) => { const on = b.dataset.density === n; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on)); });
      try { localStorage.setItem('snatch:density', n); } catch (e) { /* storage unavailable */ }
    };
    dens.forEach((b) => b.addEventListener('click', () => setDensity(b.dataset.density)));
    try { const saved = localStorage.getItem('snatch:density'); if (saved) setDensity(saved); } catch (e) { /* storage unavailable */ }

    const sort = $('[data-sort]');
    if (sort) sort.addEventListener('change', () => {
      const url = new URL(window.location.href);
      url.searchParams.set('sort_by', sort.value);
      url.searchParams.delete('page');
      window.location.href = url.toString();
    });
  }

  /* ---------- product page ---------- */
  function pdp() {
    const root = $('[data-pdp]');
    if (!root) return;
    const form = $('[data-product-form]', root);
    const addBtn = $('[data-add]', root);
    const addLabel = $('[data-add-label]', root);
    const err = $('[data-form-error]', root);
    const idInput = $('[data-variant-id]', root);

    $$('[data-qty]', form).forEach((q) => {
      const input = $('[data-qty-input]', q);
      $$('[data-qty-step]', q).forEach((b) => b.addEventListener('click', () => {
        input.value = Math.max(1, (parseInt(input.value, 10) || 1) + Number(b.dataset.qtyStep));
      }));
    });

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
        await cart.add(null, 1, new FormData(form));
        status(S.strings.added);
        cart.open();
      } catch (ex) {
        err.textContent = ex.message || S.strings.error;
        err.hidden = false;
      }
      addLabel.textContent = prev;
      addBtn.removeAttribute('aria-busy');
    });

    // mobile gallery dots
    const list = $('[data-pdp-media]', root);
    const dots = $$('.pdp__dots i', root);
    if (list && dots.length) list.addEventListener('scroll', () => {
      const i = Math.round(list.scrollLeft / list.clientWidth);
      dots.forEach((dt, k) => dt.classList.toggle('is-active', k === i));
    }, { passive: true });

    // sticky bar on mobile
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

    // other colourways of the same style ("Style - Colour")
    const family = root.dataset.family;
    const wrap = $('[data-siblings]', root);
    const listEl = $('[data-sibling-list]', root);
    if (family && wrap && listEl) {
      const url = `${S.routes.predictive}.json?q=${encodeURIComponent(family)}&resources[type]=product&resources[limit]=10&resources[options][unavailable_products]=last&resources[options][fields]=title`;
      fetch(url).then((r) => r.json()).then((json) => {
        const items = ((json.resources && json.resources.results && json.resources.results.products) || [])
          .filter((p) => String(p.title).split(' - ')[0].trim().toLowerCase() === family.toLowerCase());
        if (items.length < 2) return;
        const here = window.location.pathname.replace(/\/$/, '').split('/').pop();
        listEl.innerHTML = items.map((p) => {
          const col = String(p.title).split(' - ').slice(1).join(' - ') || p.title;
          const src = p.featured_image && p.featured_image.url ? `${p.featured_image.url}${p.featured_image.url.includes('?') ? '&' : '?'}width=200` : '';
          const handle = String(p.url).split('?')[0].replace(/\/$/, '').split('/').pop();
          return `<li><a class="sib" href="${esc(p.url)}"${handle === here ? ' aria-current="true"' : ''} title="${esc(col)}"><span class="sib__media stage">${src ? `<img src="${esc(src)}" alt="${esc(col)}" loading="lazy">` : ''}</span></a></li>`;
        }).join('');
        wrap.hidden = false;
      }).catch(() => {});
    }
  }

  function recommendations() {
    $$('[data-recs]').forEach(async (el) => {
      if (el.children.length) { bindCards(el); reveals(el); return; }
      try {
        const text = await fetch(el.dataset.url).then((r) => r.text());
        const tmp = d.createElement('div');
        tmp.innerHTML = text;
        const fresh = tmp.querySelector('[data-recs]');
        if (fresh && fresh.innerHTML.trim()) { el.innerHTML = fresh.innerHTML; bindCards(el); reveals(el); }
      } catch (e) { /* optional */ }
    });
  }

  function boot() {
    menu();
    search();
    initCart();
    bindCards();
    quickAdd();
    finders();
    collection();
    pdp();
    recommendations();
    reveals();
  }
  d.addEventListener('shopify:section:load', (e) => { bindCards(e.target); reveals(e.target); finders(); });
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot); else boot();
  window.SNATCH.formatMoney = formatMoney;
})();
