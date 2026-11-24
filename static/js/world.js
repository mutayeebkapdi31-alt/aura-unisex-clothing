/**
 * AURA STUDIOS - "World" layer (plain JS, no libraries)
 * - Draws the little "Buddy" characters (inline SVG) and brings them to life:
 *   eyes + face follow the pointer, they blink, bob, wave, hop and talk when tapped.
 * - Scatters buddies down the page background (they peek in from the edges).
 * - Drives the floating ribbon strips, sidebar, mobile dock, slider and search shortcut.
 * Everything here is decoration: if this file fails, the shop still works.
 */
(function () {
  'use strict';

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const rand = (a, b) => a + Math.random() * (b - a);

  /* =====================================================
     1. Character art
     ===================================================== */
  const SPECS = {
    mocha:    { body: '#8a5a3c', belly: '#a67855', foot: '#6b4229', cheek: '#f0a58c', gear: 'beanie', gc: '#f4ebdd', gc2: '#d9c4a2', pom: '#c08a5b' },
    foam:     { body: '#f6eee1', belly: '#fffaf1', foot: '#d9c6a6', cheek: '#eba58c', gear: 'shades', gc: '#2e1d14', shirt: '#5a3825', stroke: '#cdb48f' },
    latte:    { body: '#c28d5d', belly: '#d6a678', foot: '#9c6a40', cheek: '#f2a98e', gear: 'cap', gc: '#3a2418', gc2: '#5a3825', shirt: '#f4ebdd' },
    biscuit:  { body: '#dfc29a', belly: '#efd9b6', foot: '#b99467', cheek: '#eea58a', gear: 'scarf', gc: '#7a4e33', gc2: '#f4ebdd' },
    espresso: { body: '#4a2f20', belly: '#614031', foot: '#2e1d14', cheek: '#d98a6c', gear: 'hood', gc: '#f4ebdd', gc2: '#cdb48f' }
  };
  const NAMES = Object.keys(SPECS);
  let uid = 0;

  function buddySVG(name) {
    const s = SPECS[name] || SPECS.mocha;
    const id = 'bd' + (++uid);
    const stroke = s.stroke ? `stroke="${s.stroke}" stroke-width="3"` : '';
    const bodyPath = 'M100 34C152 34 174 82 174 134C174 192 146 222 100 222C54 222 26 192 26 134C26 82 48 34 100 34Z';

    let shirt = '';
    if (s.shirt) {
      shirt = `<g clip-path="url(#${id})"><path d="M20 168H180V244H20Z" fill="${s.shirt}"/>
        <path d="M80 168Q100 186 120 168" fill="none" stroke="rgba(0,0,0,.2)" stroke-width="4" stroke-linecap="round"/>
        <text x="100" y="212" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-weight="800" font-size="26" fill="${s.body}">A</text></g>`;
    }

    let behindFace = '', frontFace = '';
    if (s.gear === 'hood') {
      behindFace = `<g clip-path="url(#${id})"><path d="M20 176H180V244H20Z" fill="${s.gc}"/></g>
        <ellipse cx="100" cy="114" rx="80" ry="84" fill="${s.gc}"/>
        <ellipse cx="100" cy="122" rx="60" ry="62" fill="${s.body}"/>
        <path d="M84 178v28M116 178v28" stroke="${s.gc2}" stroke-width="5" stroke-linecap="round"/>
        <path d="M62 214H138" stroke="${s.gc2}" stroke-width="3" stroke-linecap="round" opacity=".7"/>`;
    }
    if (s.gear === 'beanie') {
      frontFace = `<path d="M34 82C34 44 64 24 100 24C136 24 166 44 166 82Z" fill="${s.gc}"/>
        <path d="M68 36V72M100 26V72M132 36V72" stroke="rgba(46,29,20,.1)" stroke-width="3"/>
        <rect x="30" y="70" width="140" height="22" rx="11" fill="${s.gc2}"/>
        <g class="pom"><circle cx="100" cy="19" r="13" fill="${s.pom}"/></g>`;
    } else if (s.gear === 'cap') {
      frontFace = `<path d="M36 84C36 48 66 32 100 32C134 32 164 48 164 84Z" fill="${s.gc}"/>
        <path d="M100 32V84" stroke="rgba(255,255,255,.12)" stroke-width="3"/>
        <circle cx="100" cy="33" r="5" fill="${s.gc2}"/>
        <path d="M116 82Q182 72 198 92Q160 100 116 92Z" fill="${s.gc2}"/>`;
    } else if (s.gear === 'scarf') {
      frontFace = `<path d="M30 162Q100 190 170 162L172 188Q100 214 28 188Z" fill="${s.gc}"/>
        <path d="M62 173v22M92 180v22M122 180v22M152 172v22" stroke="${s.gc2}" stroke-width="5" stroke-linecap="round" opacity=".85"/>
        <path d="M126 186L152 238L118 232Z" fill="${s.gc}"/><path d="M130 206L148 214M127 218L145 226" stroke="${s.gc2}" stroke-width="4" stroke-linecap="round" opacity=".85"/>`;
    }

    const shades = s.gear === 'shades'
      ? `<g class="shades"><rect x="50" y="98" width="44" height="30" rx="13" fill="${s.gc}"/><rect x="106" y="98" width="44" height="30" rx="13" fill="${s.gc}"/>
          <path d="M94 109H106" stroke="${s.gc}" stroke-width="5" stroke-linecap="round"/>
          <path d="M58 106l9 -3M114 106l9 -3" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".4"/></g>`
      : '';

    return `<svg class="bsvg" viewBox="0 0 200 246" role="img" aria-label="${name} character" focusable="false">
      <defs><clipPath id="${id}"><path d="${bodyPath}"/></clipPath></defs>
      <ellipse class="shadow" cx="100" cy="234" rx="58" ry="7" fill="rgba(46,29,20,.2)"/>
      <g class="bd"><g class="hopg">
        <ellipse cx="72" cy="224" rx="22" ry="10" fill="${s.foot}"/><ellipse cx="128" cy="224" rx="22" ry="10" fill="${s.foot}"/>
        <ellipse class="armL" cx="24" cy="160" rx="14" ry="30" fill="${s.body}" ${stroke} transform="rotate(14 24 160)"/>
        <ellipse class="armR" cx="176" cy="160" rx="14" ry="30" fill="${s.body}" ${stroke} transform="rotate(-14 176 160)"/>
        <path d="${bodyPath}" fill="${s.body}" ${stroke}/>
        <ellipse cx="100" cy="176" rx="44" ry="38" fill="${s.belly}" opacity=".55"/>
        <path d="M52 76C58 58 72 50 88 48" stroke="#fff" opacity=".35" stroke-width="6" stroke-linecap="round" fill="none"/>
        ${shirt}${behindFace}
        <g class="face">
          <g class="eyes">
            <g class="eye"><ellipse cx="74" cy="114" rx="13" ry="15" fill="#fff"/><g class="pupil"><circle cx="74" cy="116" r="7.5" fill="#2e1d14"/><circle cx="71.5" cy="113" r="2.4" fill="#fff"/></g></g>
            <g class="eye"><ellipse cx="126" cy="114" rx="13" ry="15" fill="#fff"/><g class="pupil"><circle cx="126" cy="116" r="7.5" fill="#2e1d14"/><circle cx="123.5" cy="113" r="2.4" fill="#fff"/></g></g>
          </g>
          <g class="happy-eyes"><path d="M61 118Q74 100 87 118M113 118Q126 100 139 118" fill="none" stroke="#2e1d14" stroke-width="5" stroke-linecap="round"/></g>
          <ellipse cx="56" cy="138" rx="10" ry="6" fill="${s.cheek}" opacity=".6"/><ellipse cx="144" cy="138" rx="10" ry="6" fill="${s.cheek}" opacity=".6"/>
          <path class="mouth-smile" d="M88 142Q100 154 112 142" fill="none" stroke="#2e1d14" stroke-width="4" stroke-linecap="round"/>
          <g class="mouth-open"><path d="M84 140Q100 166 116 140Z" fill="#2e1d14"/><path d="M92 153Q100 160 108 153Q100 148 92 153Z" fill="#e5806b"/></g>
          ${shades}
        </g>
        ${frontFace}
      </g></g></svg>`;
  }

  const LINES = [
    'Code AURA20 = 20% off over $50.',
    '460 GSM. Yes, that is heavy.',
    'Free shipping over $150!',
    'Oversized is always the right size.',
    'Not sure of your size? Try the size guide.',
    'Hoodie weather? Always.',
    'Tap the heart to save a piece.',
    '30 days to return. No stress.',
    'Psst... check the looks page.',
    'Brown goes with everything.',
    'Heavyweight. Unisex. Zero fuss.',
    'Hi! I am just here for the vibes.'
  ];
  let lineIx = Math.floor(Math.random() * LINES.length);

  /* =====================================================
     2. Buddy registry: any element with [data-buddy] becomes a character
     ===================================================== */
  const buddies = [];

  function makeBuddy(el, name) {
    if (el.dataset.ready) return;
    name = name || el.dataset.buddy || NAMES[0];
    el.dataset.ready = '1';
    el.classList.add('buddy', 'b-' + name);
    const inLink = !!el.closest('a');
    if (inLink) el.setAttribute('aria-hidden', 'true');
    else { el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); el.setAttribute('aria-label', 'Say hi to ' + name); }
    el.innerHTML = buddySVG(name);
    const b = {
      el, name, visible: true,
      pupils: $$('.pupil', el), face: $('.face', el),
      idle: rand(0, 6)
    };
    el.style.setProperty('--bob', rand(3.2, 5).toFixed(2) + 's');
    el.style.setProperty('--bobd', (-rand(0, 4)).toFixed(2) + 's');
    el.style.setProperty('--wavd', (-rand(0, 9)).toFixed(2) + 's');
    el.style.setProperty('--blinkd', (-rand(0, 5)).toFixed(2) + 's');
    el.addEventListener('click', e => { if (!inLink) { e.preventDefault(); react(b); } });
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); react(b); } });
    buddies.push(b);
    if (io) io.observe(el);
    return b;
  }

  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => entries.forEach(e => {
        const b = buddies.find(x => x.el === e.target);
        if (b) b.visible = e.isIntersecting;
      }), { rootMargin: '120px' })
    : null;

  /* ---------- Eyes + face follow the pointer ---------- */
  let px = innerWidth / 2, py = innerHeight / 3, lookQueued = false;
  function look() {
    lookQueued = false;
    buddies.forEach(b => {
      if (!b.visible || b.el.classList.contains('happy')) return;
      const r = b.el.getBoundingClientRect();
      if (!r.width) return;
      const dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height * .45);
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(d / 14, 6);
      const ox = (dx / d) * k, oy = (dy / d) * k;
      b.pupils.forEach(p => { p.style.transform = `translate(${ox.toFixed(1)}px,${oy.toFixed(1)}px)`; });
      if (b.face) b.face.style.transform = `translate(${(ox * .7).toFixed(1)}px,${(oy * .5).toFixed(1)}px)`;
    });
  }
  function queueLook() { if (!lookQueued) { lookQueued = true; requestAnimationFrame(look); } }
  addEventListener('pointermove', e => { px = e.clientX; py = e.clientY; queueLook(); }, { passive: true });
  addEventListener('pointerdown', e => { px = e.clientX; py = e.clientY; queueLook(); }, { passive: true });
  // On touch screens they glance in the direction you scroll
  let lastSY = scrollY;
  addEventListener('scroll', () => {
    if (fine) return;
    const dy = scrollY - lastSY; lastSY = scrollY;
    if (Math.abs(dy) < 2) return;
    px = innerWidth / 2; py = dy > 0 ? innerHeight : 0; queueLook();
  }, { passive: true });

  /* ---------- Tap / click reaction ---------- */
  let bubble = null, bubbleTimer = 0;
  function say(b, text) {
    if (bubble) bubble.remove();
    clearTimeout(bubbleTimer);
    bubble = document.createElement('div');
    bubble.className = 'buddy-bubble';
    bubble.textContent = text;
    document.body.appendChild(bubble);
    const r = b.el.getBoundingClientRect(), w = bubble.offsetWidth, h = bubble.offsetHeight;
    let left = clamp(r.left + r.width / 2 - w / 2, 10, innerWidth - w - 10);
    let top = r.top - h - 12, below = false;
    if (top < 70) { top = r.bottom + 4; below = true; }
    bubble.style.left = left + 'px';
    bubble.style.top = top + 'px';
    bubble.style.setProperty('--tail', clamp(r.left + r.width / 2 - left, 18, w - 18) + 'px');
    bubble.classList.toggle('below', below);
    requestAnimationFrame(() => bubble && bubble.classList.add('on'));
    bubbleTimer = setTimeout(() => { if (bubble) { bubble.classList.remove('on'); const x = bubble; setTimeout(() => x.remove(), 250); bubble = null; } }, 2800);
  }
  function sparkles(b) {
    if (reduce) return;
    const r = b.el.getBoundingClientRect();
    for (let i = 0; i < 7; i++) {
      const s = document.createElement('i');
      s.className = 'sparkle';
      s.textContent = i % 2 ? '✦' : '♥';
      s.style.left = r.left + r.width / 2 + 'px';
      s.style.top = r.top + r.height * .3 + 'px';
      s.style.fontSize = rand(11, 20) + 'px';
      document.body.appendChild(s);
      const a = rand(-Math.PI * .95, -Math.PI * .05), dist = rand(40, 90);
      s.animate([
        { transform: 'translate(-50%,-50%) scale(.4)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * dist}px), calc(-50% + ${Math.sin(a) * dist}px)) scale(1.1) rotate(${rand(-40, 40)}deg)`, opacity: 0 }
      ], { duration: rand(700, 1100), easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => s.remove();
    }
  }
  function react(b) {
    const el = b.el;
    lineIx = (lineIx + 1) % LINES.length;
    say(b, LINES[lineIx]);
    sparkles(b);
    if (reduce) return;
    el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop');
    el.classList.add('happy');
    b.pupils.forEach(p => { p.style.transform = ''; });
    clearTimeout(b.calm);
    b.calm = setTimeout(() => { el.classList.remove('happy'); el.classList.remove('hop'); }, 1800);
  }

  // Idle: every few seconds one visible buddy waves / hops on its own
  if (!reduce) {
    setInterval(() => {
      if (document.hidden) return;
      const vis = buddies.filter(b => b.visible && !b.el.classList.contains('hop'));
      if (!vis.length) return;
      const b = vis[(Math.random() * vis.length) | 0];
      b.el.classList.add('hop');
      setTimeout(() => b.el.classList.remove('hop'), 900);
    }, 5200);
  }

  /* =====================================================
     3. Background world: buddies + stars scattered down the page
     ===================================================== */
  const world = $('.world');
  const planted = [];
  function docHeight() { return Math.max(document.documentElement.scrollHeight, innerHeight); }

  function plant() {
    if (!world) return;
    const H = docHeight();
    world.style.height = H + 'px';
    const small = innerWidth < 700;
    const gap = small ? 760 : 880;
    const n = clamp(Math.round(H / gap), 2, 9);
    while (planted.length < n) {
      const i = planted.length;
      const el = document.createElement('div');
      el.className = 'bg-buddy';
      el.dataset.buddy = NAMES[i % NAMES.length];
      world.appendChild(el);
      const b = makeBuddy(el);
      planted.push({ el, b, p: rand(.05, .16) * (i % 2 ? 1 : -1), tilt: rand(-9, 9) });
    }
    while (planted.length > n) {
      const p = planted.pop();
      const ix = buddies.indexOf(p.b); if (ix > -1) buddies.splice(ix, 1);
      p.el.remove();
    }
    // collect text-bearing boxes (document coordinates) so characters can dodge them
    const ink = $$('main h1, main h2, main h3, main p, main .eyebrow, main .hero-actions, main .hero-pills, main .toolbar, main .crumbs, main label, main .btn, main .stat-num')
      .filter(el => !el.closest('.card, .tile, .promo, .stat-item, .feature, .panel, .vibe, .stage, .slider-track, .table-wrap, .drawer, .sheet, .hero-word'))
      .map(el => el.getBoundingClientRect())
      .filter(r => r.width > 4 && r.height > 4)
      .map(r => ({ l: r.left - 10, r: r.right + 10, t: r.top + scrollY - 10, b: r.bottom + scrollY + 10 }));
    function overlap(x0, x1, y0, y1) {
      let a = 0;
      for (const k of ink) {
        const w = Math.min(x1, k.r) - Math.max(x0, k.l), h = Math.min(y1, k.b) - Math.max(y0, k.t);
        if (w > 0 && h > 0) a += w * h;
      }
      return a;
    }
    planted.forEach((p, i) => {
      const side = i % 2 === 0 ? 'L' : 'R';
      p.el.dataset.side = side;
      p.el.style.setProperty('--tilt', (side === 'L' ? 1 : -1) * Math.abs(p.tilt) + 'deg');
      const w = p.el.offsetWidth || 130, hgt = w * 1.23;
      const rect = p.el.getBoundingClientRect();
      const ideal = (i + .5) * (H / n) - hgt / 2;
      const lo = 140, hi = H - hgt - 240;
      let best = clamp(ideal, lo, hi), bestCost = Infinity;
      for (let d = 0; d <= 620; d += 30) {
        for (const sgn of d ? [1, -1] : [1]) {
          const y = clamp(ideal + sgn * d, lo, hi);
          const cost = overlap(rect.left, rect.right, y, y + hgt) * 40 + d;
          if (cost < bestCost) { bestCost = cost; best = y; }
        }
      }
      p.y = best;
      p.h = hgt;
      p.el.style.top = best + 'px';
    });
    // twinkling stars
    const want = clamp(Math.round(H / 260), 6, 26);
    let stars = $$('.star', world);
    while (stars.length < want) {
      const s = document.createElement('i');
      s.className = 'star'; s.textContent = '✦'; s.setAttribute('aria-hidden', 'true');
      s.style.left = rand(2, 96) + '%';
      s.style.fontSize = rand(10, 22) + 'px';
      s.style.setProperty('--td', rand(2.4, 5) + 's');
      s.style.animationDelay = -rand(0, 5) + 's';
      world.appendChild(s); stars.push(s);
    }
    stars.forEach((s, i) => { s.style.top = (i + rand(.1, .9)) * (H / stars.length) + 'px'; });
    parallax();
  }

  function parallax() {
    if (reduce) return;
    const vh = innerHeight, mid = scrollY + vh / 2;
    planted.forEach(p => {
      const d = p.y + (p.h || 180) / 2 - mid;
      if (Math.abs(d) > vh * 1.3) return;
      p.el.style.setProperty('--py', (d * p.p).toFixed(1) + 'px');
    });
  }

  /* =====================================================
     4. Floating ribbons: drift with scroll, lean with scroll speed
     ===================================================== */
  const ribbons = $$('.rib');
  let vel = 0, skew = 0, ribY = scrollY, ribRaf = 0;
  function ribbonLoop() {
    const dy = scrollY - ribY; ribY = scrollY;
    vel = vel * .86 + dy * .14;
    skew += (clamp(vel * -.35, -14, 14) - skew) * .15;
    ribbons.forEach((r, i) => {
      const f = [1, -1.4, .8][i % 3];
      const y = Math.sin(scrollY / 520 + i * 2.1) * 46;
      r.style.setProperty('--ry', y.toFixed(1) + 'px');
      r.style.setProperty('--rs', (skew * f).toFixed(2) + 'deg');
    });
    ribRaf = (Math.abs(vel) > .05 || Math.abs(skew) > .05) ? requestAnimationFrame(ribbonLoop) : 0;
  }
  if (ribbons.length && !reduce) {
    addEventListener('scroll', () => { if (!ribRaf) ribRaf = requestAnimationFrame(ribbonLoop); }, { passive: true });
    ribbonLoop();
  }

  let pTick = false;
  addEventListener('scroll', () => { if (!pTick) { pTick = true; requestAnimationFrame(() => { parallax(); pTick = false; }); } }, { passive: true });

  /* =====================================================
     5. Sidebar, search, dock, slider
     ===================================================== */
  function initUI() {
    // open sidebar
    $$('[data-open-side]').forEach(b => b.addEventListener('click', () => { if (window.openLayer) openLayer('sideBar'); }));
    // links inside the sidebar close it (buttons open their own layer)
    const side = $('#sideBar');
    if (side) side.addEventListener('click', e => {
      const a = e.target.closest('a[href]');
      if (a && window.closeLayers) closeLayers(true);
    });
    // copy buttons inside sidebar / promo (promo already handled by animations.js; sidebar one here)
    $$('[data-side-copy]').forEach(b => b.addEventListener('click', () => {
      const code = b.dataset.sideCopy;
      try { navigator.clipboard.writeText(code); } catch (e) {}
      if (window.showToast) showToast('Code ' + code + ' copied');
    }));

    // search shortcut
    function focusSearch() {
      const input = $('#storeSearchInput');
      if (!input) return false;
      if (window.closeLayers) closeLayers(true);
      const sec = $('#storeSection');
      if (sec) sec.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      setTimeout(() => input.focus({ preventScroll: true }), reduce ? 0 : 600);
      return true;
    }
    $$('[data-search]').forEach(b => b.addEventListener('click', e => {
      if (focusSearch()) { e.preventDefault(); }
    }));
    if (location.hash === '#search') setTimeout(focusSearch, 300);

    // active dock item
    const path = location.pathname;
    $$('.dock [data-path]').forEach(a => {
      const p = a.dataset.path;
      a.classList.toggle('active', p === path && (p !== '/' || !location.search));
    });

    // mirror header badges into the dock
    [['headerWishlistCount', 'dockWishCount'], ['headerCartCount', 'dockCartCount']].forEach(([from, to]) => {
      const src = document.getElementById(from), dst = document.getElementById(to);
      if (!src || !dst) return;
      const sync = () => { dst.textContent = src.textContent; dst.style.display = src.style.display === 'flex' ? 'flex' : 'none'; };
      new MutationObserver(sync).observe(src, { childList: true, characterData: true, subtree: true, attributes: true });
      sync();
    });

    // horizontal slider (scroll-snap) with arrows + progress
    $$('[data-slider]').forEach(sl => {
      const track = $('.slider-track', sl), prev = $('[data-prev]', sl), next = $('[data-next]', sl), bar = $('.slider-bar > i', sl);
      if (!track) return;
      const step = () => { const c = track.firstElementChild; return c ? c.getBoundingClientRect().width + 16 : 280; };
      const update = () => {
        const max = track.scrollWidth - track.clientWidth;
        if (prev) prev.disabled = track.scrollLeft < 4;
        if (next) next.disabled = track.scrollLeft > max - 4;
        if (bar) bar.style.width = (max > 0 ? 18 + 82 * (track.scrollLeft / max) : 100) + '%';
      };
      prev && prev.addEventListener('click', () => track.scrollBy({ left: -step() * 2, behavior: reduce ? 'auto' : 'smooth' }));
      next && next.addEventListener('click', () => track.scrollBy({ left: step() * 2, behavior: reduce ? 'auto' : 'smooth' }));
      track.addEventListener('scroll', update, { passive: true });
      addEventListener('resize', update);
      update();
      // drag to scroll with a mouse
      let down = false, sx = 0, sl0 = 0, moved = false;
      track.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl0 = track.scrollLeft; });
      addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) { moved = true; track.classList.add('drag'); } track.scrollLeft = sl0 - dx; });
      addEventListener('pointerup', () => { if (!down) return; down = false; track.classList.remove('drag'); });
      track.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    });
  }

  /* =====================================================
     6. Boot
     ===================================================== */
  function boot() {
    $$('[data-buddy]').forEach(el => makeBuddy(el));
    plant();
    initUI();
    queueLook();

    // re-plant when the page height changes (filters, images, window size)
    let lastH = docHeight(), lastSmall = innerWidth < 700, t = 0;
    const again = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const h = docHeight(), small = innerWidth < 700;
        if (Math.abs(h - lastH) > 160 || small !== lastSmall) { lastH = h; lastSmall = small; plant(); }
      }, 400);
    };
    addEventListener('resize', again);
    addEventListener('load', () => setTimeout(plant, 250));
    if ('ResizeObserver' in window) new ResizeObserver(again).observe(document.body);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.AURA_WORLD = { makeBuddy, buddies };
})();
