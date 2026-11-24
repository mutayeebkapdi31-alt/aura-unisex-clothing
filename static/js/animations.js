/**
 * AURA STUDIOS - motion & interaction layer (plain JS, no libraries).
 * Loaded after main.js. It wraps a few of main.js's functions, so all the
 * shop logic keeps working exactly as before.
 */
(function () {
  'use strict';

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = t => 1 - Math.pow(1 - t, 4);

  /* =====================================================
     1. Header: blur on scroll, hide on scroll down, progress bar, back-to-top
     ===================================================== */
  function initScroll() {
    const header = $('.site-header');
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    document.body.appendChild(bar);

    const top = document.createElement('button');
    top.className = 'to-top';
    top.type = 'button';
    top.setAttribute('aria-label', 'Back to top');
    top.innerHTML = '<svg class="i"><use href="#i-up"/></svg>';
    top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));
    document.body.appendChild(top);

    const heroWord = $('.hero-word');
    let lastY = scrollY, ticking = false;
    function update() {
      const y = scrollY;
      if (heroWord && !reduce && y < 1400) heroWord.style.setProperty('--wx', (y * -0.18).toFixed(1) + 'px');
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;
      if (header) {
        header.classList.toggle('scrolled', y > 12);
        const menuOpen = $('#mainNav')?.classList.contains('open');
        if (y > lastY + 6 && y > 220 && !menuOpen) header.classList.add('hide');
        else if (y < lastY - 6 || y < 120) header.classList.remove('hide');
      }
      top.classList.toggle('show', y > 600);
      lastY = y;
      ticking = false;
    }
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* =====================================================
     2. Scroll reveal with stagger
     ===================================================== */
  function initReveal() {
    const sel = [
      '.section-head', '.toolbar', '.card', '.feature', '.panel', '.stat', '.stats',
      '.look > h2', '.look > p', '.page h1.title', '.page .container > p', '.crumbs',
      '.pd-gallery', '.pd > div + div', '.spec', '.success', '.table-wrap', '.stat-item',
      '.foot-grid > div', '.band .container > *', '.tile', '.promo'
    ].join(',');
    const els = $$(sel).filter(el => !el.closest('.drawer, .sheet, .hero, .reveal') && !el.classList.contains('reveal'));
    els.forEach(el => el.classList.add('reveal'));

    if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('in')); return; }

    const io = new IntersectionObserver(entries => {
      const vis = entries.filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
      vis.forEach((e, i) => {
        const el = e.target;
        el.style.transitionDelay = Math.min(i * 80, 480) + 'ms';
        el.classList.add('in');
        io.unobserve(el);
        // Drop the reveal classes afterwards so hover transforms stay snappy
        setTimeout(() => { el.style.transitionDelay = ''; el.classList.remove('reveal', 'in'); }, 1500 + i * 80);
      });
    }, { threshold: 0.01, rootMargin: '0px 0px -6% 0px' });
    els.forEach(el => io.observe(el));
  }

  /* =====================================================
     3. Hero: split headline, rotating word, mouse parallax
     ===================================================== */
  function initHero() {
    const hero = $('.hero');
    if (!hero) return;

    const h1 = $('h1', hero);
    if (h1 && !h1.dataset.split) {
      const text = h1.textContent.trim();
      h1.setAttribute('aria-label', text);
      h1.dataset.split = '1';
      h1.textContent = '';
      text.split(/\s+/).forEach((word, i, arr) => {
        const w = document.createElement('span'); w.className = 'w' + (i === arr.length - 1 ? ' grad' : ''); w.setAttribute('aria-hidden', 'true');
        const s = document.createElement('span'); s.style.setProperty('--i', i); s.textContent = word;
        w.appendChild(s); h1.appendChild(w);
        if (i < arr.length - 1) h1.appendChild(document.createTextNode(' '));
      });
    }

    // Typewriter rotator
    const rot = $('.rotator', hero);
    if (rot) {
      const words = (rot.dataset.words || '').split(',').map(s => s.trim()).filter(Boolean);
      if (!words.length) return;
      if (reduce) { rot.textContent = words[0]; }
      else {
        let wi = 0, ci = 0, del = false;
        (function tick() {
          const word = words[wi];
          ci += del ? -1 : 1;
          rot.textContent = word.slice(0, ci);
          let delay = del ? 45 : 95;
          if (!del && ci === word.length) { del = true; delay = 1500; }
          else if (del && ci === 0) { del = false; wi = (wi + 1) % words.length; delay = 350; }
          setTimeout(tick, delay);
        })();
      }
    }

    // Mouse parallax for hero art
    const art = $('.stage', hero);
    if (art && fine && !reduce) {
      let tx = 0, ty = 0, cx = 0, cy = 0, running = false;
      addEventListener('pointermove', e => {
        tx = (e.clientX / innerWidth - .5) * 2;
        ty = (e.clientY / innerHeight - .5) * 2;
        if (!running) { running = true; requestAnimationFrame(loop); }
      }, { passive: true });
      function loop() {
        cx = lerp(cx, tx, .08); cy = lerp(cy, ty, .08);
        art.style.setProperty('--mx', cx.toFixed(3));
        art.style.setProperty('--my', cy.toFixed(3));
        if (Math.abs(cx - tx) > .002 || Math.abs(cy - ty) > .002) requestAnimationFrame(loop);
        else running = false;
      }
    }
  }

  /* =====================================================
     4. Count-up numbers
     ===================================================== */
  function tween(from, to, ms, cb, done) {
    if (reduce) { cb(to); done && done(); return; }
    const t0 = performance.now();
    (function step(now) {
      const p = clamp((now - t0) / ms, 0, 1);
      cb(lerp(from, to, easeOut(p)));
      if (p < 1) requestAnimationFrame(step); else done && done();
    })(t0);
  }
  function initCounters() {
    const els = $$('[data-count]');
    if (!els.length || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target; io.unobserve(el);
      const to = parseFloat(el.dataset.count), pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
      tween(0, to, 1600, v => { el.textContent = pre + Math.round(v) + suf; });
    }), { threshold: 0.5 });
    els.forEach(el => io.observe(el));
  }

  /* =====================================================
     5. Pointer effects: tilt, magnetic, ripple, cursor glow
     ===================================================== */
  function initPointerFX() {
    // Ripple (works on touch too)
    document.addEventListener('pointerdown', e => {
      const t = e.target.closest('.btn, .chip, .size, .stepper button, .tabs button');
      if (!t || t.disabled) return;
      const r = t.getBoundingClientRect();
      const d = Math.max(r.width, r.height) * 2;
      const s = document.createElement('span');
      s.className = 'ripple';
      s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
      t.appendChild(s);
      setTimeout(() => s.remove(), 700);
    }, { passive: true });

    if (!fine || reduce) return;

    // Cursor glow
    const glow = document.createElement('div');
    glow.className = 'cursor-glow';
    document.body.appendChild(glow);
    let gx = innerWidth / 2, gy = innerHeight / 2, px = gx, py = gy, raf = 0;
    function glowLoop() {
      px = lerp(px, gx, .12); py = lerp(py, gy, .12);
      glow.style.transform = `translate(${px}px,${py}px)`;
      raf = (Math.abs(px - gx) > .5 || Math.abs(py - gy) > .5) ? requestAnimationFrame(glowLoop) : 0;
    }

    // Tilt + magnetic
    let tiltEl = null, magEl = null, queued = null;
    function resetTilt(el) {
      el.classList.remove('tilting');
      el.style.removeProperty('--rx'); el.style.removeProperty('--ry');
    }
    function resetMag(el) { el.style.translate = ''; }
    function onMove(e) {
      gx = e.clientX; gy = e.clientY;
      glow.classList.add('on');
      if (!raf) raf = requestAnimationFrame(glowLoop);

      const media = e.target.closest ? e.target.closest('.card-media') : null;
      if (tiltEl && tiltEl !== media) { resetTilt(tiltEl); tiltEl = null; }
      if (media) {
        const r = media.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        media.style.setProperty('--rx', ((.5 - y) * 9).toFixed(2) + 'deg');
        media.style.setProperty('--ry', ((x - .5) * 11).toFixed(2) + 'deg');
        media.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
        media.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
        media.classList.add('tilting');
        tiltEl = media;
      }

      const sp = e.target.closest ? e.target.closest('.card, .tile, .feature, .promo, .stat-item') : null;
      if (sp) {
        const r = sp.getBoundingClientRect();
        sp.style.setProperty('--sx', (e.clientX - r.left).toFixed(0) + 'px');
        sp.style.setProperty('--sy', (e.clientY - r.top).toFixed(0) + 'px');
      }

      const mag = e.target.closest ? e.target.closest('.hero-actions .btn, .news-form .btn, .icon-btn, .buy-row .btn, .badge-spin, .code-pill') : null;
      if (magEl && magEl !== mag) { resetMag(magEl); magEl = null; }
      if (mag) {
        const r = mag.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * .22;
        const dy = (e.clientY - (r.top + r.height / 2)) * .28;
        mag.style.translate = `${clamp(dx, -10, 10).toFixed(1)}px ${clamp(dy, -8, 8).toFixed(1)}px`;
        magEl = mag;
      }
    }
    addEventListener('pointermove', e => { queued = e; requestAnimationFrame(() => { if (queued) { onMove(queued); queued = null; } }); }, { passive: true });
    document.addEventListener('pointerleave', () => glow.classList.remove('on'));

    // Product page zoom
    const pm = $('.pd-main');
    if (pm) {
      const img = $('img', pm);
      pm.addEventListener('pointerenter', () => pm.classList.add('zoom'));
      pm.addEventListener('pointermove', e => {
        const r = pm.getBoundingClientRect();
        img.style.transformOrigin = `${((e.clientX - r.left) / r.width * 100).toFixed(1)}% ${((e.clientY - r.top) / r.height * 100).toFixed(1)}%`;
      });
      pm.addEventListener('pointerleave', () => pm.classList.remove('zoom'));
    }
  }

  /* =====================================================
     6. Wishlist heart burst
     ===================================================== */
  function burst(btn) {
    if (reduce) return;
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (let i = 0; i < 10; i++) {
      const d = document.createElement('i');
      d.className = 'burst-dot';
      d.style.left = cx - 3 + 'px'; d.style.top = cy - 3 + 'px';
      d.style.background = ['#5a3825', '#b07d4f', '#d3b48c', '#8a5a3c'][i % 4];
      document.body.appendChild(d);
      const a = (Math.PI * 2 * i) / 10 + Math.random() * .4, dist = 34 + Math.random() * 26;
      d.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${Math.cos(a) * dist}px,${Math.sin(a) * dist}px) scale(0)`, opacity: 0 }
      ], { duration: 650 + Math.random() * 200, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => d.remove();
    }
  }

  /* =====================================================
     7. Cart: fly-to-bag, count-up totals, badge bump, confetti
     ===================================================== */
  let lastTrigger = null;
  function confetti() {
    if (reduce) return;
    const c = document.createElement('canvas'); c.className = 'confetti';
    c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio;
    document.body.appendChild(c);
    const ctx = c.getContext('2d'); ctx.scale(devicePixelRatio, devicePixelRatio);
    const colors = ['#2e1d14', '#5a3825', '#8a5a3c', '#b07d4f', '#d3b48c', '#f4ebdd'];
    const ps = Array.from({ length: 110 }, () => ({
      x: innerWidth / 2 + (Math.random() - .5) * 120, y: innerHeight * .6,
      vx: (Math.random() - .5) * 15, vy: -Math.random() * 16 - 6,
      s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .4,
      c: colors[(Math.random() * colors.length) | 0]
    }));
    const t0 = performance.now();
    (function frame(now) {
      const t = now - t0;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ps.forEach(p => {
        p.vy += .38; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.globalAlpha = clamp(1 - (t - 1200) / 600, 0, 1);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
      });
      if (t < 1900) requestAnimationFrame(frame); else c.remove();
    })(t0);
  }

  function flyToBag(src) {
    if (reduce || !src) return;
    const target = $('#headerCartCount')?.closest('.icon-btn');
    if (!target) return;
    const a = src.getBoundingClientRect(), b = target.getBoundingClientRect();
    if (!a.width) return;
    const size = Math.min(110, a.width);
    const img = document.createElement('img');
    img.className = 'fly-img'; img.src = src.currentSrc || src.src; img.alt = '';
    img.style.cssText = `width:${size}px;height:${size * 1.25}px;left:${a.left + a.width / 2 - size / 2}px;top:${a.top + a.height / 2 - size * .625}px`;
    document.body.appendChild(img);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    img.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * .5}px,${dy * .5 - 70}px) scale(.55)`, opacity: .95, offset: .5 },
      { transform: `translate(${dx}px,${dy}px) scale(.06)`, opacity: .2 }
    ], { duration: 800, easing: 'cubic-bezier(.5,0,.3,1)' }).onfinish = () => {
      img.remove();
      const badge = $('#headerCartCount'); if (badge) { badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump'); }
      target.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25) rotate(-8deg)' }, { transform: 'scale(1)' }], { duration: 400, easing: 'ease-out' });
    };
  }

  function wrapShop() {
    const money = n => '$' + (Number(n) || 0).toFixed(2);
    const num = el => { const m = el && el.textContent.match(/-?\$?([\d.]+)/); return m ? parseFloat(m[1]) : NaN; };
    const HAS = typeof AURA !== 'undefined';
    let qtyBeforeClick = 0;
    window.__auraQtyBefore = () => qtyBeforeClick;
    const qty = () => (HAS ? AURA.cart.reduce((s, i) => s + i.qty, 0) : 0);

    // Track what the shopper tapped so we know which image should fly
    document.addEventListener('click', e => { lastTrigger = e.target; qtyBeforeClick = qty(); }, true);

    // addToCart -> fly image
    if (typeof window.addToCart === 'function') {
      const orig = window.addToCart;
      window.addToCart = function () {
        let src = null;
        const t = lastTrigger && lastTrigger.closest ? lastTrigger : null;
        if (t) {
          if (t.closest('#quickViewModal')) src = $('#qvImg');
          else if (t.closest('.card')) src = $('.card-media img', t.closest('.card'));
          else if (t.closest('.pd')) src = $('#mainProductImage');
        }
        const r = orig.apply(this, arguments);
        flyToBag(src);
        return r;
      };
    }

    // renderCart -> animate totals + confetti when free shipping unlocks
    if (typeof window.renderCart === 'function') {
      const orig = window.renderCart;
      let lastSub = HAS ? AURA.cart.reduce((s, i) => s + i.price * i.qty, 0) : 0;
      const ids = { cartSubtotal: v => money(v), cartTotal: v => money(v), cartDiscount: v => '-' + money(v) };
      window.renderCart = function () {
        const before = {};
        Object.keys(ids).forEach(id => { before[id] = num(document.getElementById(id)); });
        const r = orig.apply(this, arguments);
        Object.keys(ids).forEach(id => {
          const el = document.getElementById(id); if (!el) return;
          const to = num(el);
          if (isNaN(before[id]) || isNaN(to) || before[id] === to) return;
          tween(before[id], to, 650, v => { el.textContent = ids[id](v); }, () => { el.textContent = ids[id](to); });
        });
        const sub = window.getTotals ? getTotals().subtotal : lastSub;
        if (lastSub < FREE_SHIPPING_AT && sub >= FREE_SHIPPING_AT) { confetti(); }
        lastSub = sub;
        return r;
      };
    }

    // updateBadges -> bump when counts change
    if (typeof window.updateBadges === 'function') {
      const orig = window.updateBadges;
      let lastC = qty(), lastW = HAS ? AURA.wishlist.length : 0;
      window.updateBadges = function () {
        const r = orig.apply(this, arguments);
        const c = qty(), w = AURA.wishlist.length;
        const bump = id => { const el = document.getElementById(id); if (el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); } };
        if (c !== lastC) bump('headerCartCount');
        if (w !== lastW) bump('headerWishlistCount');
        lastC = c; lastW = w;
        return r;
      };
    }

    // openLayer -> stagger the items inside a drawer
    if (typeof window.openLayer === 'function') {
      const orig = window.openLayer;
      window.openLayer = function (id) {
        const r = orig.apply(this, arguments);
        const el = document.getElementById(id);
        if (el && el.classList.contains('drawer')) {
          const items = $$('.line-item', el);
          items.forEach((n, i) => { n.style.setProperty('--i', i); n.classList.add('enter'); });
          setTimeout(() => items.forEach(n => n.classList.remove('enter')), 1400);
        }
        return r;
      };
    }

    // Stepper number + size-guide result "tick"
    document.addEventListener('click', e => {
      const b = e.target.closest('.stepper button'); if (!b) return;
      setTimeout(() => {
        const s = b.parentElement.querySelector('span');
        if (s) { s.classList.remove('tick'); void s.offsetWidth; s.classList.add('tick'); }
      }, 0);
    });
    const rec = document.getElementById('recSizeDisplay');
    if (rec) {
      let last = rec.textContent;
      new MutationObserver(() => {
        if (rec.textContent !== last) { last = rec.textContent; rec.classList.remove('tick'); void rec.offsetWidth; rec.classList.add('tick'); }
      }).observe(rec, { childList: true, characterData: true, subtree: true });
    }
  }

  /* =====================================================
     8. Misc interactions
     ===================================================== */
  function initMisc() {
    // Hearts: burst when saved
    document.addEventListener('click', e => {
      const h = e.target.closest('[data-wish]'); if (!h) return;
      setTimeout(() => { if (h.classList.contains('active')) burst(h); }, 0);
    });

    // Product page: thumbnail crossfade + "Added" confirmation
    document.addEventListener('click', e => {
      const th = e.target.closest('.thumb');
      if (th) {
        const img = document.getElementById('mainProductImage');
        if (img) { img.classList.remove('swap'); void img.offsetWidth; img.classList.add('swap'); }
      }
      const buy = e.target.closest('.buy-row > .btn');
      if (buy && typeof AURA !== 'undefined') {
        const before = window.__auraQtyBefore ? window.__auraQtyBefore() : 0;
        setTimeout(() => {
          const after = AURA.cart.reduce((s, i) => s + i.qty, 0);
          if (after === before) { buy.classList.remove('shake'); void buy.offsetWidth; buy.classList.add('shake'); return; }
          const label = buy.dataset.label || buy.textContent.trim();
          buy.dataset.label = label;
          buy.textContent = 'Added ✓'; buy.classList.add('added');
          setTimeout(() => { buy.textContent = label; buy.classList.remove('added'); }, 1500);
        }, 30);
      }
    });

    // Click-to-copy promo code
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-copy]'); if (!b) return;
      const code = b.dataset.copy;
      const done = () => {
        if (typeof showToast === 'function') showToast('Copied ' + code + ' to your clipboard');
        b.classList.add('copied');
        const sm = b.querySelector('small'); const old = sm ? sm.textContent : '';
        if (sm) sm.textContent = 'Copied ✓';
        setTimeout(() => { b.classList.remove('copied'); if (sm) sm.textContent = old; }, 1800);
        confetti();
      };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(code).then(done, done);
      else {
        const t = document.createElement('textarea'); t.value = code; t.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (err) {} t.remove(); done();
      }
    });

    // Mobile nav stagger index
    $$('#mainNav > *').forEach((el, i) => el.style.setProperty('--n', i));

    // Smooth in-page anchors with header offset
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]'); if (!a || a.getAttribute('href') === '#') return;
      const t = document.querySelector(a.getAttribute('href'));
      if (!t) return;
      e.preventDefault();
      window.scrollTo({ top: t.getBoundingClientRect().top + scrollY - 70, behavior: reduce ? 'auto' : 'smooth' });
    });

    // Page leave transition
    document.addEventListener('click', e => {
      if (reduce || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest('a[href]');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search) || !/^https?:/.test(url.protocol)) return;
      e.preventDefault();
      document.body.classList.add('leaving');
      setTimeout(() => { location.href = a.href; }, 220);
    });
    addEventListener('pageshow', () => document.body.classList.remove('leaving'));

    // Shake the auth sheet on error
    const authMsg = document.getElementById('authMsg');
    if (authMsg) {
      new MutationObserver(() => {
        if (authMsg.textContent.trim()) {
          const f = document.getElementById('authForm');
          f.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(0)' }], { duration: 400 });
        }
      }).observe(authMsg, { childList: true, characterData: true, subtree: true });
    }
  }

  /* =====================================================
     9. Public hook used by main.js when filters change
     ===================================================== */
  window.AuraFX = {
    refreshGrid(grid) {
      if (reduce || !grid) return;
      const cards = [...grid.querySelectorAll('.card')].filter(c => c.style.display !== 'none');
      cards.forEach((c, i) => {
        c.classList.remove('pop'); void c.offsetWidth;
        c.style.setProperty('--k', Math.min(i, 14));
        c.classList.add('in', 'pop');
        setTimeout(() => c.classList.remove('pop'), 1400);
      });
      const empty = document.getElementById('emptyMsg');
      if (empty && empty.style.display !== 'none') empty.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 450, easing: 'ease-out' });
      const cnt = document.getElementById('productsCountDisplay');
      if (cnt) cnt.animate([{ transform: 'translateY(-6px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 350, easing: 'ease-out' });
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    initScroll();
    initHero();
    initReveal();
    initCounters();
    initPointerFX();
    wrapShop();
    initMisc();
  });
})();
