/**
 * AURA STUDIOS | High Fashion Unisex Streetwear
 * Main Interactive Application Script
 */

// Global State
const AURA = {
  cart: JSON.parse(localStorage.getItem('aura_cart')) || [],
  wishlist: JSON.parse(localStorage.getItem('aura_wishlist')) || [],
  freeShippingThreshold: 150.00,
  activeCoupon: null
};

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  initCart();
  initWishlist();
  initEventListeners();
  initFitAdvisor();
  initSearchAndFilter();
  updateHeaderBadges();
});

/* ==========================================================================
   CART ENGINE
   ========================================================================== */
function initCart() {
  renderCartDrawer();
}

function saveCart() {
  localStorage.setItem('aura_cart', JSON.stringify(AURA.cart));
  updateHeaderBadges();
  renderCartDrawer();
}

function addToCart(product, size = 'L', qty = 1) {
  const existingIndex = AURA.cart.findIndex(item => item.id === product.id && item.size === size);
  if (existingIndex > -1) {
    AURA.cart[existingIndex].qty += qty;
  } else {
    AURA.cart.push({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price),
      image: Array.isArray(product.images) ? product.images[0] : product.image,
      size: size,
      qty: qty,
      category: product.category || 'Streetwear',
      fit_type: product.fit_type || 'Unisex Boxy'
    });
  }
  saveCart();
  showToast(`Added to Bag: ${product.name} (${size})`, 'success');
  openCartDrawer();
}

function updateCartQty(index, delta) {
  if (!AURA.cart[index]) return;
  AURA.cart[index].qty += delta;
  if (AURA.cart[index].qty <= 0) {
    AURA.cart.splice(index, 1);
  }
  saveCart();
}

function removeFromCart(index) {
  if (AURA.cart[index]) {
    const item = AURA.cart[index];
    AURA.cart.splice(index, 1);
    saveCart();
    showToast(`Removed ${item.name} from Bag`, 'info');
  }
}

function openCartDrawer() {
  document.getElementById('cartDrawerOverlay')?.classList.add('active');
  document.getElementById('cartDrawer')?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCartDrawer() {
  document.getElementById('cartDrawerOverlay')?.classList.remove('active');
  document.getElementById('cartDrawer')?.classList.remove('active');
  document.body.style.overflow = '';
}

function renderCartDrawer() {
  const container = document.getElementById('cartItemsList');
  const emptyState = document.getElementById('cartEmptyState');
  const footer = document.getElementById('cartDrawerFooter');
  const shippingTrack = document.getElementById('shippingProgressFill');
  const shippingText = document.getElementById('shippingStatusMsg');

  if (!container) return;

  if (AURA.cart.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    if (footer) footer.style.display = 'none';
    if (shippingTrack) shippingTrack.style.width = '0%';
    if (shippingText) shippingText.textContent = `Add $${AURA.freeShippingThreshold.toFixed(2)} for FREE Worldwide Express Shipping`;
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (footer) footer.style.display = 'block';

  let subtotal = 0;
  container.innerHTML = AURA.cart.map((item, idx) => {
    const itemTotal = item.price * item.qty;
    subtotal += itemTotal;
    return `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}" class="cart-item-img">
        <div class="cart-item-info">
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-meta">Size: ${item.size} • ${item.fit_type}</div>
          <div class="cart-item-actions">
            <div class="qty-stepper">
              <button class="qty-btn" onclick="updateCartQty(${idx}, -1)">−</button>
              <span class="qty-display">${item.qty}</span>
              <button class="qty-btn" onclick="updateCartQty(${idx}, 1)">+</button>
            </div>
            <div class="cart-item-price">$${itemTotal.toFixed(2)}</div>
            <button class="btn-remove-item" onclick="removeFromCart(${idx})" title="Remove item">✕</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Free shipping bar calculation
  const remaining = AURA.freeShippingThreshold - subtotal;
  const progressPct = Math.min(100, (subtotal / AURA.freeShippingThreshold) * 100);
  if (shippingTrack) shippingTrack.style.width = `${progressPct}%`;

  if (remaining <= 0) {
    if (shippingText) shippingText.innerHTML = `🎉 You unlocked <strong>FREE Worldwide Express Shipping</strong>!`;
  } else {
    if (shippingText) shippingText.innerHTML = `Add <strong>$${remaining.toFixed(2)}</strong> more for FREE Worldwide Express Shipping`;
  }

  // Cost calculations
  let discountAmount = 0;
  if (AURA.activeCoupon) {
    discountAmount = (subtotal * AURA.activeCoupon.discount_percent) / 100;
  }
  const shippingFee = (subtotal >= AURA.freeShippingThreshold || subtotal === 0) ? 0.00 : 15.00;
  const total = Math.max(0, subtotal - discountAmount + shippingFee);

  const subtotalEl = document.getElementById('cartSubtotalDisplay');
  const discountRow = document.getElementById('cartDiscountRow');
  const discountVal = document.getElementById('cartDiscountValue');
  const shippingVal = document.getElementById('cartShippingDisplay');
  const totalEl = document.getElementById('cartTotalDisplay');

  if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
  if (discountRow) {
    if (discountAmount > 0) {
      discountRow.style.display = 'flex';
      discountVal.textContent = `-$${discountAmount.toFixed(2)} (${AURA.activeCoupon.code})`;
    } else {
      discountRow.style.display = 'none';
    }
  }
  if (shippingVal) shippingVal.textContent = shippingFee === 0 ? 'FREE' : `$${shippingFee.toFixed(2)}`;
  if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
}

// Promo Code validation
async function applyPromoCode() {
  const input = document.getElementById('promoCodeInput');
  if (!input) return;
  const code = input.value.trim().toUpperCase();
  if (!code) return;

  const subtotal = AURA.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  try {
    const res = await fetch('/api/coupons/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code, cart_total: subtotal })
    });
    const data = await res.json();
    if (data.valid) {
      AURA.activeCoupon = data;
      showToast(data.message, 'success');
      renderCartDrawer();
    } else {
      showToast(data.message || 'Invalid coupon code', 'error');
    }
  } catch (e) {
    // Client fallback if offline
    if (code === 'AURA20') {
      AURA.activeCoupon = { code: 'AURA20', discount_percent: 20 };
      showToast('Applied 20% discount!', 'success');
      renderCartDrawer();
    } else {
      showToast('Invalid promo code', 'error');
    }
  }
}

/* ==========================================================================
   WISHLIST ENGINE
   ========================================================================== */
function initWishlist() {
  renderWishlistDrawer();
}

function toggleWishlist(product) {
  const index = AURA.wishlist.findIndex(item => item.id === product.id);
  if (index > -1) {
    AURA.wishlist.splice(index, 1);
    showToast(`Removed ${product.name} from Wishlist`, 'info');
  } else {
    AURA.wishlist.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: Array.isArray(product.images) ? product.images[0] : product.image,
      category: product.category,
      fit_type: product.fit_type
    });
    showToast(`Saved ${product.name} to Wishlist`, 'success');
  }
  localStorage.setItem('aura_wishlist', JSON.stringify(AURA.wishlist));
  updateHeaderBadges();
  renderWishlistDrawer();

  // Update heart icons across page
  document.querySelectorAll(`.wishlist-btn-${product.id}`).forEach(btn => {
    btn.classList.toggle('active', index === -1);
  });
}

function openWishlistDrawer() {
  document.getElementById('wishlistDrawerOverlay')?.classList.add('active');
  document.getElementById('wishlistDrawer')?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeWishlistDrawer() {
  document.getElementById('wishlistDrawerOverlay')?.classList.remove('active');
  document.getElementById('wishlistDrawer')?.classList.remove('active');
  document.body.style.overflow = '';
}

function renderWishlistDrawer() {
  const container = document.getElementById('wishlistItemsList');
  const emptyState = document.getElementById('wishlistEmptyState');
  if (!container) return;

  if (AURA.wishlist.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  container.innerHTML = AURA.wishlist.map((item, idx) => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}" class="cart-item-img">
      <div class="cart-item-info">
        <div class="cart-item-title">${item.name}</div>
        <div class="cart-item-meta">${item.category} • $${parseFloat(item.price).toFixed(2)}</div>
        <div class="cart-item-actions">
          <button class="btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;" onclick='addToCart(${JSON.stringify(item)}, "L", 1)'>
            Move to Bag
          </button>
          <button class="btn-remove-item" onclick='toggleWishlist(${JSON.stringify(item)})'>✕</button>
        </div>
      </div>
    </div>
  `).join('');
}

function updateHeaderBadges() {
  const totalCartQty = AURA.cart.reduce((sum, item) => sum + item.qty, 0);
  const cartBadge = document.getElementById('headerCartCount');
  if (cartBadge) {
    cartBadge.textContent = totalCartQty;
    cartBadge.style.display = totalCartQty > 0 ? 'flex' : 'none';
  }

  const wishlistBadge = document.getElementById('headerWishlistCount');
  if (wishlistBadge) {
    wishlistBadge.textContent = AURA.wishlist.length;
    wishlistBadge.style.display = AURA.wishlist.length > 0 ? 'flex' : 'none';
  }
}

/* ==========================================================================
   QUICK VIEW MODAL
   ========================================================================== */
function openQuickView(productData) {
  const modal = document.getElementById('quickViewModal');
  const backdrop = document.getElementById('modalBackdrop');
  if (!modal || !backdrop) return;

  const images = Array.isArray(productData.images) ? productData.images : [productData.images];
  const primaryImg = images[0];

  document.getElementById('qvImg').src = primaryImg;
  document.getElementById('qvCategory').textContent = `${productData.category} • ${productData.gender || 'UNISEX'}`;
  document.getElementById('qvTitle').textContent = productData.name;
  document.getElementById('qvPrice').textContent = `$${parseFloat(productData.price).toFixed(2)}`;
  document.getElementById('qvFabric').textContent = productData.fabric_weight || '380 GSM Heavy French Terry';
  document.getElementById('qvFit').textContent = productData.fit_type || 'Oversized Boxy Fit';
  document.getElementById('qvDesc').textContent = productData.description || '';

  // Render sizes
  const sizesContainer = document.getElementById('qvSizes');
  const sizes = productData.sizes || ['S', 'M', 'L', 'XL', 'XXL'];
  let selectedSize = sizes[1] || 'M';

  sizesContainer.innerHTML = sizes.map(s => `
    <button type="button" class="size-pill-quick ${s === selectedSize ? 'active' : ''}" onclick="selectQuickViewSize(this, '${s}')">
      ${s}
    </button>
  `).join('');

  // Quick Add Button handler
  const addBtn = document.getElementById('qvAddBtn');
  addBtn.onclick = () => {
    addToCart(productData, selectedSize, 1);
    closeQuickView();
  };

  backdrop.classList.add('active');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function selectQuickViewSize(button, size) {
  button.parentElement.querySelectorAll('.size-pill-quick').forEach(b => b.classList.remove('active'));
  button.classList.add('active');
  const addBtn = document.getElementById('qvAddBtn');
  if (addBtn) addBtn.dataset.size = size;
}

function closeQuickView() {
  document.getElementById('quickViewModal')?.classList.remove('active');
  document.getElementById('modalBackdrop')?.classList.remove('active');
  document.body.style.overflow = '';
}

/* ==========================================================================
   FIT ADVISOR (Unisex Size Calculator)
   ========================================================================== */
function initFitAdvisor() {
  const heightSlider = document.getElementById('heightSlider');
  const weightSlider = document.getElementById('weightSlider');
  const fitPrefRadios = document.querySelectorAll('input[name="fitPref"]');

  if (!heightSlider || !weightSlider) return;

  function calculateSize() {
    const height = parseInt(heightSlider.value, 10); // cm
    const weight = parseInt(weightSlider.value, 10); // kg
    let pref = 'boxy';
    fitPrefRadios.forEach(r => { if (r.checked) pref = r.value; });

    document.getElementById('heightValue').textContent = `${height} cm (${Math.floor(height/30.48)}'${Math.round((height%30.48)/2.54)}")`;
    document.getElementById('weightValue').textContent = `${weight} kg (${Math.round(weight * 2.204)} lbs)`;

    let size = 'M';
    if (weight < 58 && height < 168) {
      size = pref === 'snug' ? 'XS' : 'S';
    } else if (weight < 72 && height < 178) {
      size = pref === 'snug' ? 'S' : (pref === 'boxy' ? 'L' : 'M');
    } else if (weight < 86 && height < 186) {
      size = pref === 'snug' ? 'M' : (pref === 'boxy' ? 'XL' : 'L');
    } else {
      size = pref === 'snug' ? 'L' : 'XXL';
    }

    const badge = document.getElementById('recSizeDisplay');
    const note = document.getElementById('recSizeNote');
    if (badge) badge.textContent = size;
    if (note) {
      note.textContent = pref === 'boxy' 
        ? `We selected Size ${size} for an authentic streetwear drop-shoulder drape.` 
        : `We selected Size ${size} for a balanced, tailored silhouette.`;
    }
  }

  heightSlider.addEventListener('input', calculateSize);
  weightSlider.addEventListener('input', calculateSize);
  fitPrefRadios.forEach(r => r.addEventListener('change', calculateSize));
  calculateSize();
}

function openFitAdvisor() {
  document.getElementById('fitAdvisorModal')?.classList.add('active');
  document.getElementById('modalBackdrop')?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeFitAdvisor() {
  document.getElementById('fitAdvisorModal')?.classList.remove('active');
  document.getElementById('modalBackdrop')?.classList.remove('active');
  document.body.style.overflow = '';
}

/* ==========================================================================
   INTERACTIVE SEARCH & FILTERS
   ========================================================================== */
function initSearchAndFilter() {
  const searchInput = document.getElementById('storeSearchInput');
  const sortSelect = document.getElementById('storeSortSelect');

  if (searchInput) {
    let debounce;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => filterProducts(), 250);
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', () => filterProducts());
  }
}

function filterProducts() {
  const searchVal = (document.getElementById('storeSearchInput')?.value || '').toLowerCase();
  const sortVal = document.getElementById('storeSortSelect')?.value || 'featured';
  const activeCategory = document.querySelector('.filter-pill.active')?.dataset.category || 'all';

  const cards = Array.from(document.querySelectorAll('.product-card'));
  let visibleCount = 0;

  cards.forEach(card => {
    const name = (card.dataset.name || '').toLowerCase();
    const category = (card.dataset.category || '').toLowerCase();
    const badge = (card.dataset.badge || '').toLowerCase();

    const matchesCategory = activeCategory === 'all' || category === activeCategory.toLowerCase();
    const matchesSearch = !searchVal || name.includes(searchVal) || category.includes(searchVal) || badge.includes(searchVal);

    if (matchesCategory && matchesSearch) {
      card.style.display = 'flex';
      visibleCount++;
    } else {
      card.style.display = 'none';
    }
  });

  const countDisplay = document.getElementById('productsCountDisplay');
  if (countDisplay) {
    countDisplay.textContent = `Showing ${visibleCount} unisex items`;
  }
}

function selectCategoryFilter(btn, category) {
  document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  filterProducts();
}

/* ==========================================================================
   TOAST NOTIFICATIONS
   ========================================================================== */
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✦' : 'ℹ'}</span>
    <span class="toast-text">${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

/* ==========================================================================
   EVENT LISTENERS & MODAL CLOSE TRIGGERS
   ========================================================================== */
function initEventListeners() {
  // Close buttons
  document.getElementById('cartCloseBtn')?.addEventListener('click', closeCartDrawer);
  document.getElementById('cartDrawerOverlay')?.addEventListener('click', closeCartDrawer);
  document.getElementById('wishlistCloseBtn')?.addEventListener('click', closeWishlistDrawer);
  document.getElementById('wishlistDrawerOverlay')?.addEventListener('click', closeWishlistDrawer);
  document.getElementById('modalBackdrop')?.addEventListener('click', () => {
    closeQuickView();
    closeFitAdvisor();
    closeAuthModal();
  });

  // ESC key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCartDrawer();
      closeWishlistDrawer();
      closeQuickView();
      closeFitAdvisor();
      closeAuthModal();
    }
  });
}

// Auth Modal
function openAuthModal() {
  document.getElementById('authModal')?.classList.add('active');
  document.getElementById('modalBackdrop')?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeAuthModal() {
  document.getElementById('authModal')?.classList.remove('active');
  document.getElementById('modalBackdrop')?.classList.remove('active');
  document.body.style.overflow = '';
}
