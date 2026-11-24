/**
 * AURA STUDIOS - storefront script (plain JavaScript, no external libraries)
 */

/* ---------- Helpers ---------- */
const FREE_SHIPPING_AT = 150;
const SHIPPING_FEE = 15;

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function money(n) { return '$' + (Number(n) || 0).toFixed(2); }
function icon(id) { return `<svg class="i"><use href="#i-${id}"/></svg>`; }
function load(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode / storage full */ }
}

const AURA = {
  cart: load('aura_cart_v2', []),
  wishlist: load('aura_wishlist_v2', []),
  coupon: load('aura_coupon_v2', null)
};
window.AURA_CATALOG = window.AURA_CATALOG || {};

function imageOf(p) { return Array.isArray(p.images) ? p.images[0] : p.image; }

/* ---------- Layers (drawers / sheets) ---------- */
let lastFocus = null;
function openLayer(id) {
  const el = document.getElementById(id);
  if (!el) return;
  closeLayers(true);
  lastFocus = document.activeElement;
  el.classList.add('active');
  el.setAttribute('aria-hidden', 'false');
  document.getElementById('overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
  const first = el.querySelector('[data-close], input, button');
  if (first) setTimeout(() => first.focus({ preventScroll: true }), 50);
}
function closeLayers(silent) {
  document.querySelectorAll('.drawer.active, .sheet.active').forEach(el => {
    el.classList.remove('active');
    el.setAttribute('aria-hidden', 'true');
  });
  document.getElementById('overlay')?.classList.remove('active');
  document.body.style.overflow = '';
  if (!silent && lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
}
const openCartDrawer = () => openLayer('cartDrawer');
const closeCartDrawer = () => closeLayers();
const openWishlistDrawer = () => openLayer('wishlistDrawer');
const closeWishlistDrawer = () => closeLayers();
const openFitAdvisor = () => openLayer('fitAdvisorModal');
const closeFitAdvisor = () => closeLayers();
const openAuthModal = () => openLayer('authModal');
const closeAuthModal = () => closeLayers();
const closeQuickView = () => closeLayers();

/* ---------- Toasts ---------- */
function showToast(message, type) {
  const box = document.getElementById('toastContainer');
  if (!box) return;
  const t = document.createElement('div');
  t.className = 'toast' + (type === 'error' ? ' error' : '');
  t.textContent = message;
  box.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2800);
}

/* ---------- Totals ---------- */
function cartSubtotal() { return AURA.cart.reduce((s, i) => s + i.price * i.qty, 0); }
function getTotals() {
  const subtotal = cartSubtotal();
  if (AURA.coupon && subtotal < (AURA.coupon.min_spend || 0)) {
    AURA.coupon = null; save('aura_coupon_v2', null);
  }
  const discount = AURA.coupon ? Math.round(subtotal * AURA.coupon.discount_percent) / 100 : 0;
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_AT ? 0 : SHIPPING_FEE;
  return { subtotal, discount, shipping, total: Math.max(0, subtotal - discount + shipping) };
}

/* ---------- Cart ---------- */
function persistCart() {
  save('aura_cart_v2', AURA.cart);
  updateBadges();
  renderCart();
  document.dispatchEvent(new CustomEvent('aura:cart'));
}
function addToCart(product, size, qty) {
  qty = qty || 1;
  const found = AURA.cart.find(i => i.id === product.id && i.size === size);
  if (found) found.qty = Math.min(10, found.qty + qty);
  else AURA.cart.push({
    id: product.id, name: product.name, price: parseFloat(product.price),
    image: imageOf(product), size, qty, category: product.category || ''
  });
  persistCart();
  showToast(`Added to bag: ${product.name} (${size})`);
}
function updateCartQty(i, d) {
  const item = AURA.cart[i]; if (!item) return;
  item.qty = Math.min(10, item.qty + d);
  if (item.qty <= 0) AURA.cart.splice(i, 1);
  persistCart();
}
function removeFromCart(i) { AURA.cart.splice(i, 1); persistCart(); }

function renderCart() {
  const list = document.getElementById('cartItems');
  if (!list) return;
  const empty = document.getElementById('cartEmpty');
  const foot = document.getElementById('cartFoot');
  const meter = document.getElementById('shipMeter');
  const has = AURA.cart.length > 0;
  list.style.display = has ? '' : 'none';
  empty.style.display = has ? 'none' : '';
  foot.style.display = has ? '' : 'none';
  meter.style.display = has ? '' : 'none';
  if (!has) { list.innerHTML = ''; return; }

  list.innerHTML = AURA.cart.map((it, i) => `
    <div class="line-item">
      <img src="${esc(it.image)}" alt="${esc(it.name)}">
      <div>
        <div class="line-title">${esc(it.name)}</div>
        <div class="line-meta">Size ${esc(it.size)}</div>
        <div class="line-row">
          <div class="stepper">
            <button type="button" data-act="qty" data-i="${i}" data-d="-1" aria-label="Decrease quantity">−</button>
            <span>${it.qty}</span>
            <button type="button" data-act="qty" data-i="${i}" data-d="1" aria-label="Increase quantity">+</button>
          </div>
          <button type="button" class="remove" data-act="remove" data-i="${i}" aria-label="Remove ${esc(it.name)}">${icon('close')}</button>
          <span class="price">${money(it.price * it.qty)}</span>
        </div>
      </div>
    </div>`).join('');

  const t = getTotals();
  const left = FREE_SHIPPING_AT - t.subtotal;
  document.getElementById('shipFill').style.width = Math.min(100, t.subtotal / FREE_SHIPPING_AT * 100) + '%';
  document.getElementById('shipMsg').innerHTML = left <= 0
    ? 'You have <strong>free shipping</strong>.'
    : `Add <strong>${money(left)}</strong> more for free shipping.`;
  document.getElementById('cartSubtotal').textContent = money(t.subtotal);
  const row = document.getElementById('cartDiscountRow');
  row.style.display = t.discount > 0 ? 'flex' : 'none';
  if (t.discount > 0) {
    document.getElementById('cartDiscountLabel').textContent = `Discount (${AURA.coupon.code})`;
    document.getElementById('cartDiscount').textContent = '-' + money(t.discount);
  }
  document.getElementById('cartShipping').textContent = t.shipping === 0 ? 'Free' : money(t.shipping);
  document.getElementById('cartTotal').textContent = money(t.total);
}

async function applyPromoCode(inputId) {
  const input = document.getElementById(inputId || 'promoInput');
  const code = (input?.value || '').trim().toUpperCase();
  if (!code) { showToast('Enter a promo code', 'error'); return; }
  try {
    const res = await fetch('/api/coupons/apply', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, cart_total: cartSubtotal() })
    });
    const data = await res.json();
    if (data.valid) {
      AURA.coupon = { code: data.code, discount_percent: data.discount_percent, min_spend: data.min_spend || 0 };
      save('aura_coupon_v2', AURA.coupon);
      showToast(data.message);
      renderCart();
      document.dispatchEvent(new CustomEvent('aura:cart'));
    } else {
      showToast(data.message || 'Invalid promo code', 'error');
    }
  } catch (e) {
    showToast('Could not check the code. Please try again.', 'error');
  }
}

/* ---------- Wishlist ---------- */
function toggleWishlist(product) {
  const i = AURA.wishlist.findIndex(w => w.id === product.id);
  if (i > -1) { AURA.wishlist.splice(i, 1); showToast('Removed from saved items'); }
  else {
    AURA.wishlist.push({ id: product.id, name: product.name, price: product.price, image: imageOf(product), category: product.category, slug: product.slug });
    showToast('Saved');
  }
  save('aura_wishlist_v2', AURA.wishlist);
  updateBadges(); renderWishlist(); syncHearts();
}
function syncHearts() {
  document.querySelectorAll('[data-wish]').forEach(b => {
    const on = AURA.wishlist.some(w => w.id === b.dataset.wish);
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}
function renderWishlist() {
  const list = document.getElementById('wishlistItems');
  if (!list) return;
  const empty = document.getElementById('wishlistEmpty');
  const has = AURA.wishlist.length > 0;
  list.style.display = has ? '' : 'none';
  empty.style.display = has ? 'none' : '';
  list.innerHTML = AURA.wishlist.map((w, i) => `
    <div class="line-item">
      <img src="${esc(w.image)}" alt="${esc(w.name)}">
      <div>
        <div class="line-title">${esc(w.name)}</div>
        <div class="line-meta">${esc(w.category)} · ${money(w.price)}</div>
        <div class="line-row">
          <a class="btn btn-sm btn-outline" href="/product/${encodeURIComponent(w.slug || w.id)}">Choose size</a>
          <button type="button" class="remove" data-act="unwish" data-i="${i}" aria-label="Remove ${esc(w.name)}">${icon('close')}</button>
        </div>
      </div>
    </div>`).join('');
}
function updateBadges() {
  const q = AURA.cart.reduce((s, i) => s + i.qty, 0);
  const c = document.getElementById('headerCartCount');
  if (c) { c.textContent = q; c.style.display = q ? 'flex' : 'none'; }
  const w = document.getElementById('headerWishlistCount');
  if (w) { w.textContent = AURA.wishlist.length; w.style.display = AURA.wishlist.length ? 'flex' : 'none'; }
}

/* ---------- Quick view ---------- */
let qvState = { product: null, size: null };
function sizeInStock(p, s) {
  const inv = p.inventory || {};
  return inv[s] === undefined || Number(inv[s]) > 0;
}
function openQuickView(p) {
  if (!p) return;
  const sizes = p.sizes || [];
  qvState = { product: p, size: sizes.find(s => sizeInStock(p, s)) || null };
  document.getElementById('qvImg').src = imageOf(p);
  document.getElementById('qvImg').alt = p.name;
  document.getElementById('qvCategory').textContent = `${p.category} · ${p.gender || 'Unisex'}`;
  document.getElementById('qvTitle').textContent = p.name;
  document.getElementById('qvPrice').textContent = money(p.price);
  document.getElementById('qvDesc').textContent = p.description || '';
  document.getElementById('qvLink').href = '/product/' + encodeURIComponent(p.slug || p.id);
  const box = document.getElementById('qvSizes');
  box.innerHTML = sizes.map(s => `<button type="button" class="size ${s === qvState.size ? 'active' : ''}" data-act="qv-size" data-size="${esc(s)}" ${sizeInStock(p, s) ? '' : 'disabled'}>${esc(s)}</button>`).join('');
  const add = document.getElementById('qvAddBtn');
  add.disabled = !qvState.size;
  add.textContent = qvState.size ? 'Add to bag' : 'Sold out';
  add.onclick = () => {
    if (!qvState.size) return;
    addToCart(qvState.product, qvState.size, 1);
    closeLayers(); openCartDrawer();
  };
  openLayer('quickViewModal');
}

/* ---------- Size guide ---------- */
function initFitAdvisor() {
  const h = document.getElementById('heightSlider'), w = document.getElementById('weightSlider');
  if (!h || !w) return;
  const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
  const radios = document.querySelectorAll('input[name="fitPref"]');
  function calc() {
    const height = +h.value, weight = +w.value;
    const pref = [...radios].find(r => r.checked)?.value || 'boxy';
    const ft = Math.floor(height / 30.48), inch = Math.round((height % 30.48) / 2.54);
    document.getElementById('heightValue').textContent = `${height} cm (${ft}'${inch === 12 ? 11 : inch}")`;
    document.getElementById('weightValue').textContent = `${weight} kg (${Math.round(weight * 2.2046)} lb)`;
    let idx = 3;
    if (weight < 58 && height < 168) idx = 0;
    else if (weight < 72 && height < 178) idx = 1;
    else if (weight < 86 && height < 186) idx = 2;
    if (pref === 'boxy') idx = Math.min(sizes.length - 1, idx + 1);
    document.getElementById('recSizeDisplay').textContent = sizes[idx];
    document.getElementById('recSizeNote').textContent = pref === 'boxy'
      ? 'A size up for a loose, oversized drape.' : 'True to size for a cleaner, regular fit.';
  }
  h.addEventListener('input', calc); w.addEventListener('input', calc);
  radios.forEach(r => r.addEventListener('change', calc));
  calc();
}

/* ---------- Shop filters (home page) ---------- */
function initShop() {
  const section = document.getElementById('storeSection');
  if (!section) return;
  const grid = document.getElementById('productsGridContainer');
  const cards = [...grid.querySelectorAll('.card')];
  cards.forEach((c, i) => c.dataset.index = i);
  const search = document.getElementById('storeSearchInput');
  const sort = document.getElementById('storeSortSelect');
  let category = section.dataset.active || 'all';
  let firstRun = true;

  function apply() {
    const q = (search.value || '').trim().toLowerCase();
    let shown = 0;
    cards.forEach(c => {
      const okCat = category === 'all' || c.dataset.category === category;
      const okQ = !q || (c.dataset.name + ' ' + c.dataset.category + ' ' + c.dataset.fit).toLowerCase().includes(q);
      c.style.display = okCat && okQ ? '' : 'none';
      if (okCat && okQ) shown++;
    });
    const by = {
      price_asc: (a, b) => a.dataset.price - b.dataset.price,
      price_desc: (a, b) => b.dataset.price - a.dataset.price,
      rating: (a, b) => b.dataset.rating - a.dataset.rating,
      featured: (a, b) => a.dataset.index - b.dataset.index
    }[sort.value] || ((a, b) => a.dataset.index - b.dataset.index);
    [...cards].sort(by).forEach(c => grid.appendChild(c));
    document.getElementById('emptyMsg').style.display = shown ? 'none' : '';
    document.getElementById('productsCountDisplay').textContent = `${shown} ${shown === 1 ? 'item' : 'items'}`;
    document.querySelectorAll('.chip').forEach(b => b.classList.toggle('active', b.dataset.category === category));
    if (!firstRun && window.AuraFX) window.AuraFX.refreshGrid(grid);  // animate cards after a filter/sort change
    firstRun = false;
  }
  document.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => {
    category = b.dataset.category;
    try { history.replaceState(null, '', category === 'all' ? location.pathname : `?category=${encodeURIComponent(category)}`); } catch (e) {}
    apply();
  }));
  let t; search.addEventListener('input', () => { clearTimeout(t); t = setTimeout(apply, 150); });
  sort.addEventListener('change', apply);
  apply();
}

/* ---------- Account ---------- */
let authMode = 'login';
function switchAuthTab(mode) {
  authMode = mode;
  document.getElementById('tabLogin').classList.toggle('active', mode === 'login');
  document.getElementById('tabRegister').classList.toggle('active', mode === 'register');
  document.getElementById('nameField').style.display = mode === 'register' ? '' : 'none';
  document.getElementById('authSubmit').textContent = mode === 'register' ? 'Create account' : 'Sign in';
  document.getElementById('authPassword').autocomplete = mode === 'register' ? 'new-password' : 'current-password';
  document.getElementById('authMsg').textContent = '';
}
async function handleAuthSubmit(e) {
  e.preventDefault();
  const msg = document.getElementById('authMsg');
  const btn = document.getElementById('authSubmit');
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const full_name = document.getElementById('authName').value.trim();
  if (!email || !password || (authMode === 'register' && !full_name)) { msg.textContent = 'Please fill in all fields.'; return; }
  btn.disabled = true; msg.textContent = '';
  try {
    const res = await fetch(authMode === 'register' ? '/api/auth/register' : '/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Welcome, ' + data.user.full_name);
      setTimeout(() => { location.href = data.user.role === 'admin' ? '/admin' : location.pathname; }, 500);
    } else { msg.textContent = data.error || 'Something went wrong.'; btn.disabled = false; }
  } catch (err) { msg.textContent = 'Network error. Please try again.'; btn.disabled = false; }
}

/* ---------- Global events ---------- */
function bindEvents() {
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act], [data-close], [data-wish], [data-quick]');
    if (el && el.hasAttribute('data-close')) { closeLayers(); return; }
    if (!el) return;

    if (el.dataset.wish) {
      const p = AURA_CATALOG[el.dataset.wish]; if (p) toggleWishlist(p); return;
    }
    if (el.dataset.quick) { openQuickView(AURA_CATALOG[el.dataset.quick]); return; }

    const i = +el.dataset.i;
    switch (el.dataset.act) {
      case 'qty': updateCartQty(i, +el.dataset.d); break;
      case 'remove': removeFromCart(i); break;
      case 'unwish': AURA.wishlist.splice(i, 1); save('aura_wishlist_v2', AURA.wishlist); updateBadges(); renderWishlist(); syncHearts(); break;
      case 'qv-size':
        qvState.size = el.dataset.size;
        document.querySelectorAll('#qvSizes .size').forEach(b => b.classList.toggle('active', b === el));
        break;
    }
  });
  document.getElementById('overlay')?.addEventListener('click', () => closeLayers());
  window.addEventListener('keydown', e => { if (e.key === 'Escape') { closeLayers(); setMenu(false); } });

  const toggle = document.getElementById('menuToggle');
  toggle?.addEventListener('click', () => setMenu(!document.getElementById('mainNav').classList.contains('open')));
  document.getElementById('mainNav')?.addEventListener('click', e => { if (e.target.closest('a, button')) setMenu(false); });
  document.addEventListener('click', e => { if (!e.target.closest('.site-header')) setMenu(false); });
  window.addEventListener('resize', () => { if (innerWidth >= 900) setMenu(false); });
}
function setMenu(open) {
  const nav = document.getElementById('mainNav'), btn = document.getElementById('menuToggle');
  if (!nav || !btn) return;
  nav.classList.toggle('open', open);
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  renderCart(); renderWishlist(); updateBadges(); syncHearts();
  initFitAdvisor(); initShop();
  if (new URLSearchParams(location.search).get('auth') === 'login' && !window.AURA_USER) {
    openAuthModal();
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
  }
});
