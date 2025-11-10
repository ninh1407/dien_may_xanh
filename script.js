// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    // Khởi tạo trang chủ
    if (document.getElementById('productGrid')) { // Changed condition
        loadHomepageData(); // New function to load dynamic data
        setupEventListeners();
        initHeroSlider();
    }
    
    // Luôn khởi tạo giỏ hàng
    updateCartCount();
    setupGlobalEventListeners();
});

// Product data - This will be removed and fetched from API
/*
const products = [
    {
        id: 1,
        name: "Smart TV Samsung 55 inch 4K",
        price: 12990000,
        originalPrice: 15990000,
        image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d2?w=400",
        category: "tivi",
        rating: 4.5,
        reviews: 128,
        description: "Smart TV Samsung 55 inch với công nghệ 4K UHD, mang đến hình ảnh sắc nét và màu sắc rực rỡ.",
        features: ["4K UHD", "Smart TV", "HDR10+", "50W Sound"]
    },
    {
        id: 2,
        name: "Tủ lạnh Panasonic 2 cánh 300L",
        price: 8990000,
        originalPrice: 10990000,
        image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400",
        category: "tulanh",
        rating: 4.3,
        reviews: 89,
        description: "Tủ lạnh Panasonic 300L với công nghệ Inverter tiết kiệm điện và làm lạnh nhanh.",
        features: ["Inverter", "300L", "2 Cánh", "Tiết kiệm điện"]
    },
    {
        id: 3,
        name: "Máy giặt LG Inverter 9kg",
        price: 6990000,
        originalPrice: 8490000,
        image: "https://images.unsplash.com/photo-1626806787461-102c1bfa9d1e?w=400",
        category: "maygiat",
        rating: 4.4,
        reviews: 156,
        description: "Máy giặt LG Inverter 9kg với công nghệ giặt hơi nước và tính năng tự động vệ sinh lồng giặt.",
        features: ["Inverter", "9kg", "Giặt hơi nước", "Tự động vệ sinh"]
    },
    {
        id: 4,
        name: "Điều hòa Daikin 1.5HP Inverter",
        price: 11990000,
        originalPrice: 13990000,
        image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400",
        category: "dieuhoa",
        rating: 4.6,
        reviews: 234,
        description: "Điều hòa Daikin 1.5HP với công nghệ Inverter tiết kiệm điện và lọc không khí hiệu quả.",
        features: ["Inverter", "1.5HP", "Tiết kiệm điện", "Lọc không khí"]
    },
    {
        id: 5,
        name: "Máy lạnh Toshiba 1HP",
        price: 8990000,
        originalPrice: 10490000,
        image: "https://images.unsplash.com/photo-1604287094566-bdb8b9c000d1?w=400",
        category: "dieuhoa",
        rating: 4.2,
        reviews: 98,
        description: "Máy lạnh Toshiba 1HP với công nghệ làm lạnh nhanh và hoạt động êm ái.",
        features: ["1HP", "Làm lạnh nhanh", "Hoạt động êm", "Tiết kiệm điện"]
    },
    {
        id: 6,
        name: "Tủ lạnh Samsung Side by Side 600L",
        price: 18990000,
        originalPrice: 21990000,
        image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400",
        category: "tulanh",
        rating: 4.7,
        reviews: 67,
        description: "Tủ lạnh Samsung Side by Side 600L với công nghệ Twin Cooling Plus và bảng điều khiển cảm ứng.",
        features: ["600L", "Side by Side", "Twin Cooling Plus", "Cảm ứng"]
    }
];
*/
let products = []; // Will be populated from API

let cart = [];

// Safe localStorage access
function getCartFromStorage() {
    try {
        if (typeof Storage !== 'undefined') {
            const stored = localStorage.getItem('cart');
            return stored ? JSON.parse(stored) : [];
        }
    } catch (error) {
        console.warn('Cannot access localStorage:', error);
    }
    return [];
}

function saveCartToStorage(cartData) {
    try {
        if (typeof Storage !== 'undefined') {
            localStorage.setItem('cart', JSON.stringify(cartData));
        }
    } catch (error) {
        console.warn('Cannot save to localStorage:', error);
    }
}

// Initialize cart
cart = getCartFromStorage();

// Load products - REPLACED with loadHomepageData
async function loadHomepageData() {
    await Promise.all([
        loadCategories(),
        loadFeaturedProducts()
    ]);
}

// NEW: Load categories for mega menu
async function loadCategories() {
    try {
        const response = await fetch('/api/categories?hierarchy=true&parent=null');
        if (!response.ok) throw new Error('Failed to fetch categories');
        
        const result = await response.json();
        if (result.success) {
            const menu = document.getElementById('megaMenuDynamic');
            if (menu) {
                renderCategories(result.data, menu);
            }
        }
    } catch (error) {
        console.error("Error loading categories:", error);
    }
}

// NEW: Render categories into the menu
function renderCategories(categories, parentElement) {
    parentElement.innerHTML = categories.map(category => `
        <li>
            <a href="/products.html?category=${category.slug}">
                <i class="${category.icon || 'fas fa-tag'}"></i>
                ${category.name}
                ${category.children && category.children.length > 0 ? '<i class="fas fa-chevron-down"></i>' : ''}
            </a>
            ${category.children && category.children.length > 0 ? `
                <div class="submenu">
                    <ul>
                        ${category.children.map(child => `
                            <li><a href="/products.html?category=${child.slug}">${child.name}</a></li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}
        </li>
    `).join('');
}


// NEW: Load featured products
async function loadFeaturedProducts() {
    try {
        const response = await fetch('/api/products?featured=true&limit=12');
        if (!response.ok) throw new Error('Failed to fetch featured products');

        const result = await response.json();
        if (result.success && result.data.products) {
            products = result.data.products; // Store products globally
            displayProducts(products);
        }
    } catch (error) {
        console.error("Error loading featured products:", error);
        const grid = document.getElementById('productGrid');
        if (grid) {
            grid.innerHTML = '<p class="error-message">Không thể tải sản phẩm. Vui lòng thử lại sau.</p>';
        }
    }
}


// Load products - This function is now just a wrapper around display
function loadProducts() {
    const grid = document.getElementById('productGrid');
    if (!grid) return;
    // Data is now loaded by loadFeaturedProducts, so we just filter and display
    const filteredProducts = filterProducts(); 
    displayProducts(filteredProducts);
}

// Filter products based on category and search
function filterProducts() {
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');
    const search = urlParams.get('search');
    
    let filtered = products; // Uses the globally fetched products
    
    if (category && category !== 'all') {
        filtered = filtered.filter(product => product.category === category);
    }
    
    if (search) {
        filtered = filtered.filter(product => 
            product.name.toLowerCase().includes(search.toLowerCase()) ||
            product.description.toLowerCase().includes(search.toLowerCase())
        );
    }
    
    return filtered;
}

// Display products - MODIFIED to handle API data structure
function displayProducts(productsToShow) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;
    
    if (productsToShow.length === 0) {
        grid.innerHTML = '<p class="no-products">Không tìm thấy sản phẩm nào.</p>';
        return;
    }
    
    grid.innerHTML = productsToShow.map(product => {
        const originalPrice = product.price.originalPrice;
        const salePrice = product.price.salePrice || originalPrice;
        const discount = originalPrice > salePrice ? Math.round(((originalPrice - salePrice) / originalPrice) * 100) : 0;

        return `
        <div class="product-card" data-category="${product.category.slug}">
            <div class="product-image">
                <img src="${(product.images && product.images[0] && product.images[0].url) ? product.images[0].url : (product.images && product.images[0] ? product.images[0] : 'https://via.placeholder.com/300')}" alt="${product.name}">
                <div class="product-overlay">
                    <button class="btn-quick-view" onclick="quickView('${product._id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-add-to-cart" onclick="addToCart('${product._id}')">
                        <i class="fas fa-shopping-cart"></i>
                    </button>
                </div>
                ${discount > 0 ? `<div class="discount-badge">-${discount}%</div>` : ''}
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <div class="product-rating">
                    <div class="stars">
                        ${generateStars(product.ratings ? product.ratings.average : 0)}
                    </div>
                    <span class="rating-text">${product.ratings ? product.ratings.average.toFixed(1) : 'Mới'} (${product.ratings ? product.ratings.count : 0})</span>
                </div>
                <div class="product-price">
                    <span class="current-price">${formatPrice(salePrice)}</span>
                    ${discount > 0 ? `<span class="original-price">${formatPrice(originalPrice)}</span>` : ''}
                </div>
                <button class="btn-buy-now" onclick="buyNow('${product._id}')">
                    Mua ngay
                </button>
            </div>
        </div>
    `}).join('');
}

// Hero slider đơn giản
function initHeroSlider() {
    const slides = Array.from(document.querySelectorAll('.hero-slide'));
    const prevBtn = document.querySelector('.hero-nav.prev');
    const nextBtn = document.querySelector('.hero-nav.next');
    const dotsContainer = document.getElementById('heroDots');
    if (!slides.length || !prevBtn || !nextBtn || !dotsContainer) return;
    let index = 0;

    function render() {
        slides.forEach((s, i) => s.classList.toggle('active', i === index));
        dotsContainer.innerHTML = slides.map((_, i) => `<button class="dot${i===index?' active':''}" data-i="${i}"></button>`).join('');
        Array.from(dotsContainer.querySelectorAll('.dot')).forEach(btn => {
            btn.addEventListener('click', () => {
                index = parseInt(btn.dataset.i, 10);
                render();
            });
        });
    }

    prevBtn.addEventListener('click', () => {
        index = (index - 1 + slides.length) % slides.length;
        render();
    });
    nextBtn.addEventListener('click', () => {
        index = (index + 1) % slides.length;
        render();
    });
    // Tự động chạy
    setInterval(() => {
        index = (index + 1) % slides.length;
        render();
    }, 5000);
    render();
}

// Generate star rating
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 !== 0;
    let stars = '';
    
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    
    if (halfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star"></i>';
    }
    
    return stars;
}

// Format price
function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(price);
}

// Add to cart - MODIFIED to use _id
function addToCart(productId) {
    const product = products.find(p => p._id === productId);
    if (!product) {
        console.error("Product not found for ID:", productId);
        return;
    }
    
    const existingItem = cart.find(item => item._id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }
    
    saveCartToStorage(cart);
    updateCartCount();
    showNotification(`${product.name} đã được thêm vào giỏ hàng!`, 'success');
}

// Update cart count
function updateCartCount() {
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
        cartCount.style.display = totalItems > 0 ? 'block' : 'none';
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Buy now - MODIFIED to use _id
function buyNow(productId) {
    addToCart(productId);
    setTimeout(() => {
        window.location.href = 'checkout.html';
    }, 1000);
}

// Quick view - MODIFIED to use _id
function quickView(productId) {
    const product = products.find(p => p._id === productId);
    if (!product) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';

    const originalPrice = product.price.originalPrice;
    const salePrice = product.price.salePrice || originalPrice;

    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <div class="product-detail">
        <img src="${(product.images && product.images[0] && product.images[0].url) ? product.images[0].url : (product.images && product.images[0] ? product.images[0] : 'https://via.placeholder.com/400')}" alt="${product.name}">
                <div class="product-info">
                    <h2>${product.name}</h2>
                    <div class="product-rating">
                        <div class="stars">${generateStars(product.ratings ? product.ratings.average : 0)}</div>
                        <span>${product.ratings ? product.ratings.average.toFixed(1) : 'Mới'} (${product.ratings ? product.ratings.count : 0} đánh giá)</span>
                    </div>
                    <div class="product-price">
                        <span class="current-price">${formatPrice(salePrice)}</span>
                        ${originalPrice > salePrice ? `<span class="original-price">${formatPrice(originalPrice)}</span>` : ''}
                    </div>
                    <p>${product.description}</p>
                    <div class="product-features">
                        <h4>Đặc điểm nổi bật:</h4>
                        <ul>
                            ${(product.attributes || []).map(attr => `<li><strong>${attr.key}:</strong> ${attr.value}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="product-actions">
                        <button class="btn-add-to-cart" onclick="addToCart('${product._id}')">
                            <i class="fas fa-shopping-cart"></i> Thêm vào giỏ
                        </button>
                        <button class="btn-buy-now" onclick="buyNow('${product._id}')">
                            Mua ngay
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.style.display = 'block';
    
    modal.querySelector('.close').onclick = function() {
        modal.remove();
    };
    
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.remove();
        }
    };
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-btn');
    
    if (searchInput && searchBtn) {
        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
    
    // Category filters
    const categoryFilters = document.querySelectorAll('.category-filter');
    categoryFilters.forEach(filter => {
        filter.addEventListener('click', function(e) {
            e.preventDefault();
            const category = this.dataset.category;
            filterProductsByCategory(category);
        });
    });
    
    // Mobile menu toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
    }
}

// Setup global event listeners that work on all pages
function setupGlobalEventListeners() {
    // Cart icon click
    const cartIcon = document.querySelector('.cart-icon');
    if (cartIcon) {
        cartIcon.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'checkout.html';
        });
    }
}

// Perform search
function performSearch() {
    const searchInput = document.querySelector('.search-input');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.trim();
    if (searchTerm) {
        window.location.href = `index.html?search=${encodeURIComponent(searchTerm)}`;
    }
}

// Filter products by category
function filterProductsByCategory(category) {
    window.location.href = `index.html?category=${category}`;
}

// Load cart items (for checkout page)
function loadCartItems() {
    const cartItems = document.querySelector('.cart-items');
    if (!cartItems) return; // Exit if not on cart/checkout page
    
    // Cart data is now based on API structure
    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">Giỏ hàng trống</p>';
        return;
    }
    
    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
        <img src="${(item.images && item.images[0] && item.images[0].url) ? item.images[0].url : (item.images && item.images[0] ? item.images[0] : 'https://via.placeholder.com/100')}" alt="${item.name}">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p class="price">${formatPrice(item.price.salePrice || item.price.originalPrice)}</p>
                <div class="quantity-controls">
                    <button onclick="updateQuantity('${item._id}', -1)">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateQuantity('${item._id}', 1)">+</button>
                </div>
            </div>
            <button class="remove-item" onclick="removeFromCart('${item._id}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
    
    updateCartTotal();
}

// Update quantity - MODIFIED for _id
function updateQuantity(productId, change) {
    const item = cart.find(item => item._id === productId);
    if (!item) return;
    
    item.quantity += change;
    if (item.quantity <= 0) {
        removeFromCart(productId);
        return;
    }
    
    saveCartToStorage(cart);
    updateCartCount();
    loadCartItems();
}

// Remove from cart - MODIFIED for _id
function removeFromCart(productId) {
    cart = cart.filter(item => item._id !== productId);
    saveCartToStorage(cart);
    updateCartCount();
    loadCartItems();
    showNotification('Đã xóa sản phẩm khỏi giỏ hàng', 'info');
}

// Update cart total - MODIFIED for API price structure
function updateCartTotal() {
    const cartTotal = document.querySelector('.cart-total');
    if (!cartTotal) return;
    
    const total = cart.reduce((sum, item) => sum + ((item.price.salePrice || item.price.originalPrice) * item.quantity), 0);
    cartTotal.textContent = formatPrice(total);
}