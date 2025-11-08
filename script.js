// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize main page functionality if we're on the main page
    if (document.getElementById('products')) {
        loadProducts();
        setupEventListeners();
    }
    
    // Always initialize cart functionality
    updateCartCount();
    setupGlobalEventListeners();
});

// Product data
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

// Load products
function loadProducts() {
    const productsContainer = document.getElementById('products');
    if (!productsContainer) return; // Exit if products container doesn't exist
    
    const filteredProducts = filterProducts();
    displayProducts(filteredProducts);
}

// Filter products based on category and search
function filterProducts() {
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');
    const search = urlParams.get('search');
    
    let filtered = products;
    
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

// Display products
function displayProducts(productsToShow) {
    const productsContainer = document.getElementById('products');
    if (!productsContainer) return; // Exit if products container doesn't exist
    
    if (productsToShow.length === 0) {
        productsContainer.innerHTML = '<p class="no-products">Không tìm thấy sản phẩm nào.</p>';
        return;
    }
    
    productsContainer.innerHTML = productsToShow.map(product => `
        <div class="product-card" data-category="${product.category}">
            <div class="product-image">
                <img src="${product.image}" alt="${product.name}">
                <div class="product-overlay">
                    <button class="btn-quick-view" onclick="quickView(${product.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-add-to-cart" onclick="addToCart(${product.id})">
                        <i class="fas fa-shopping-cart"></i>
                    </button>
                </div>
                <div class="discount-badge">
                    -${Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                </div>
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <div class="product-rating">
                    <div class="stars">
                        ${generateStars(product.rating)}
                    </div>
                    <span class="rating-text">${product.rating} (${product.reviews})</span>
                </div>
                <div class="product-price">
                    <span class="current-price">${formatPrice(product.price)}</span>
                    <span class="original-price">${formatPrice(product.originalPrice)}</span>
                </div>
                <button class="btn-buy-now" onclick="buyNow(${product.id})">
                    Mua ngay
                </button>
            </div>
        </div>
    `).join('');
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

// Add to cart
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.id === productId);
    
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

// Buy now
function buyNow(productId) {
    addToCart(productId);
    setTimeout(() => {
        window.location.href = 'checkout.html';
    }, 1000);
}

// Quick view
function quickView(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <div class="product-detail">
                <img src="${product.image}" alt="${product.name}">
                <div class="product-info">
                    <h2>${product.name}</h2>
                    <div class="product-rating">
                        <div class="stars">${generateStars(product.rating)}</div>
                        <span>${product.rating} (${product.reviews} đánh giá)</span>
                    </div>
                    <div class="product-price">
                        <span class="current-price">${formatPrice(product.price)}</span>
                        <span class="original-price">${formatPrice(product.originalPrice)}</span>
                    </div>
                    <p>${product.description}</p>
                    <div class="product-features">
                        <h4>Đặc điểm nổi bật:</h4>
                        <ul>
                            ${product.features.map(feature => `<li>${feature}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="product-actions">
                        <button class="btn-add-to-cart" onclick="addToCart(${product.id})">
                            <i class="fas fa-shopping-cart"></i> Thêm vào giỏ
                        </button>
                        <button class="btn-buy-now" onclick="buyNow(${product.id})">
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
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">Giỏ hàng trống</p>';
        return;
    }
    
    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p class="price">${formatPrice(item.price)}</p>
                <div class="quantity-controls">
                    <button onclick="updateQuantity(${item.id}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateQuantity(${item.id}, 1)">+</button>
                </div>
            </div>
            <button class="remove-item" onclick="removeFromCart(${item.id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
    
    updateCartTotal();
}

// Update quantity
function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
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

// Remove from cart
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCartToStorage(cart);
    updateCartCount();
    loadCartItems();
    showNotification('Đã xóa sản phẩm khỏi giỏ hàng', 'info');
}

// Update cart total
function updateCartTotal() {
    const cartTotal = document.querySelector('.cart-total');
    if (!cartTotal) return;
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = formatPrice(total);
}