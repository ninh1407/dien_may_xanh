// Checkout Page JavaScript
class CheckoutManager {
    constructor() {
        this.cart = this.getCartFromStorage();
        this.shippingFee = 30000; // 30,000 VND
        this.taxRate = 0.08; // 8% tax
        this.init();
    }

    getCartFromStorage() {
        try {
            if (typeof localStorage !== 'undefined' && localStorage.getItem('cart')) {
                return JSON.parse(localStorage.getItem('cart'));
            }
        } catch (error) {
            console.warn('Không thể đọc giỏ hàng từ localStorage:', error);
        }
        return [];
    }

    init() {
        this.loadCartItems();
        this.setupEventListeners();
        this.updateOrderSummary();
        this.setupFormValidation();
    }

    loadCartItems() {
        const orderItemsContainer = document.querySelector('.order-items');
        if (!orderItemsContainer) return;

        orderItemsContainer.innerHTML = '';

        if (this.cart.length === 0) {
            orderItemsContainer.innerHTML = '<p class="empty-cart-message">Giỏ hàng trống</p>';
            return;
        }

        this.cart.forEach(item => {
            const orderItem = document.createElement('div');
            orderItem.className = 'order-item';
            orderItem.innerHTML = `
                <img src="${item.image}" alt="${item.name}">
                <div class="order-item-info">
                    <div class="order-item-name">${item.name}</div>
                    <div class="order-item-price">${this.formatPrice(item.price)}</div>
                    <div class="order-item-quantity">Số lượng: ${item.quantity}</div>
                </div>
            `;
            orderItemsContainer.appendChild(orderItem);
        });
    }

    setupEventListeners() {
        // Payment method selection
        const paymentMethods = document.querySelectorAll('input[name="payment-method"]');
        paymentMethods.forEach(method => {
            method.addEventListener('change', (e) => {
                this.handlePaymentMethodChange(e.target.value);
            });
        });

        // Promo code application
        const promoBtn = document.querySelector('.promo-code button');
        if (promoBtn) {
            promoBtn.addEventListener('click', () => {
                this.applyPromoCode();
            });
        }

        // Place order button
        const placeOrderBtn = document.querySelector('.place-order-btn');
        if (placeOrderBtn) {
            placeOrderBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.placeOrder();
            });
        }

        // Form validation on input
        const formInputs = document.querySelectorAll('.shipping-form input, .shipping-form select');
        formInputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });
        });

        // Credit card formatting
        const creditCardInput = document.getElementById('card-number');
        if (creditCardInput) {
            creditCardInput.addEventListener('input', (e) => {
                this.formatCreditCard(e.target);
            });
        }

        const expiryInput = document.getElementById('expiry-date');
        if (expiryInput) {
            expiryInput.addEventListener('input', (e) => {
                this.formatExpiry(e.target);
            });
        }
    }

    handlePaymentMethodChange(method) {
        const creditCardForm = document.querySelector('.credit-card-form');
        const momoInstructions = document.querySelector('.momo-instructions');
        const bankTransferInstructions = document.querySelector('.bank-transfer-instructions');

        // Hide all payment-specific forms
        if (creditCardForm) creditCardForm.style.display = 'none';
        if (momoInstructions) momoInstructions.style.display = 'none';
        if (bankTransferInstructions) bankTransferInstructions.style.display = 'none';

        // Show relevant form based on selected method
        switch (method) {
            case 'credit-card':
                if (creditCardForm) creditCardForm.style.display = 'block';
                break;
            case 'momo':
                if (momoInstructions) momoInstructions.style.display = 'block';
                break;
            case 'bank-transfer':
                if (bankTransferInstructions) bankTransferInstructions.style.display = 'block';
                break;
        }
    }

    updateOrderSummary() {
        const subtotal = this.calculateSubtotal();
        const tax = subtotal * this.taxRate;
        const total = subtotal + tax + this.shippingFee;

        // Update DOM elements
        const subtotalElement = document.querySelector('.subtotal-amount');
        const taxElement = document.querySelector('.tax-amount');
        const shippingElement = document.querySelector('.shipping-amount');
        const totalElement = document.querySelector('.total-amount');

        if (subtotalElement) subtotalElement.textContent = this.formatPrice(subtotal);
        if (taxElement) taxElement.textContent = this.formatPrice(tax);
        if (shippingElement) shippingElement.textContent = this.formatPrice(this.shippingFee);
        if (totalElement) totalElement.textContent = this.formatPrice(total);
    }

    calculateSubtotal() {
        return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    formatPrice(price) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price);
    }

    applyPromoCode() {
        const promoInput = document.querySelector('.promo-code input');
        const promoBtn = document.querySelector('.promo-code button');
        
        if (!promoInput || !promoBtn) return;

        const code = promoInput.value.trim().toUpperCase();
        
        if (!code) {
            this.showNotification('Vui lòng nhập mã giảm giá', 'warning');
            return;
        }

        // Simulate promo code validation
        promoBtn.innerHTML = '<span class="loading"></span>';
        promoBtn.disabled = true;

        setTimeout(() => {
            promoBtn.innerHTML = 'Áp dụng';
            promoBtn.disabled = false;

            const validCodes = {
                'SALE10': { discount: 0.1, description: 'Giảm 10%' },
                'SALE20': { discount: 0.2, description: 'Giảm 20%' },
                'FREESHIP': { discount: 0, description: 'Miễn phí vận chuyển' }
            };

            const promo = validCodes[code];
            if (promo) {
                this.applyDiscount(promo);
                this.showNotification(`Mã ${code} đã được áp dụng: ${promo.description}`, 'success');
            } else {
                this.showNotification('Mã giảm giá không hợp lệ', 'error');
            }
        }, 1000);
    }

    applyDiscount(promo) {
        const subtotal = this.calculateSubtotal();
        let discount = 0;

        if (promo.discount > 0) {
            discount = subtotal * promo.discount;
        } else if (code === 'FREESHIP') {
            discount = this.shippingFee;
        }

        // Update order summary with discount
        this.updateOrderSummaryWithDiscount(discount);
    }

    updateOrderSummaryWithDiscount(discount) {
        const subtotal = this.calculateSubtotal();
        const tax = subtotal * this.taxRate;
        const total = subtotal + tax + this.shippingFee - discount;

        // Add discount row to order summary
        const orderTotals = document.querySelector('.order-totals');
        const existingDiscount = document.querySelector('.discount-row');
        
        if (existingDiscount) {
            existingDiscount.remove();
        }

        if (discount > 0) {
            const discountRow = document.createElement('div');
            discountRow.className = 'total-row discount-row';
            discountRow.innerHTML = `
                <span>Giảm giá</span>
                <span style="color: #ff4757;">-${this.formatPrice(discount)}</span>
            `;
            
            const finalRow = document.querySelector('.total-row.final');
            if (finalRow) {
                orderTotals.insertBefore(discountRow, finalRow);
            }
        }

        // Update total
        const totalElement = document.querySelector('.total-amount');
        if (totalElement) totalElement.textContent = this.formatPrice(total);
    }

    setupFormValidation() {
        // Add validation patterns
        const validations = {
            'full-name': {
                required: true,
                minLength: 2,
                message: 'Vui lòng nhập họ tên đầy đủ'
            },
            'phone': {
                required: true,
                pattern: /^[0-9]{10,11}$/,
                message: 'Số điện thoại không hợp lệ'
            },
            'email': {
                required: true,
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Email không hợp lệ'
            },
            'address': {
                required: true,
                minLength: 10,
                message: 'Vui lòng nhập địa chỉ đầy đủ'
            },
            'city': {
                required: true,
                message: 'Vui lòng chọn thành phố'
            },
            'district': {
                required: true,
                message: 'Vui lòng chọn quận/huyện'
            }
        };

        this.validations = validations;
    }

    validateField(field) {
        const fieldName = field.name || field.id;
        const validation = this.validations[fieldName];
        
        if (!validation) return true;

        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        if (validation.required && !value) {
            isValid = false;
            errorMessage = validation.message;
        } else if (validation.minLength && value.length < validation.minLength) {
            isValid = false;
            errorMessage = validation.message;
        } else if (validation.pattern && !validation.pattern.test(value)) {
            isValid = false;
            errorMessage = validation.message;
        }

        this.showFieldError(field, errorMessage, !isValid);
        return isValid;
    }

    showFieldError(field, message, showError) {
        // Remove existing error
        const existingError = field.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        // Toggle error state
        if (showError) {
            field.classList.add('error');
            if (message) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.textContent = message;
                field.parentNode.appendChild(errorDiv);
            }
        } else {
            field.classList.remove('error');
            field.classList.add('success');
        }
    }

    formatCreditCard(input) {
        let value = input.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
        input.value = formattedValue;
    }

    formatExpiry(input) {
        let value = input.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.substring(0, 2) + '/' + value.substring(2, 4);
        }
        input.value = value;
    }

    validateForm() {
        const form = document.querySelector('.shipping-form');
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        // Validate payment method
        const selectedPayment = document.querySelector('input[name="payment-method"]:checked');
        if (!selectedPayment) {
            this.showNotification('Vui lòng chọn phương thức thanh toán', 'warning');
            isValid = false;
        }

        return isValid;
    }

    placeOrder() {
        if (!this.validateForm()) {
            return;
        }

        const placeOrderBtn = document.querySelector('.place-order-btn');
        if (!placeOrderBtn) return;

        // Show loading state
        placeOrderBtn.innerHTML = '<span class="loading"></span> Đang xử lý...';
        placeOrderBtn.disabled = true;

        // Simulate order processing
        setTimeout(() => {
            this.processOrder();
        }, 2000);
    }

    processOrder() {
        // Generate order number
        const orderNumber = 'DH' + Date.now().toString().slice(-8);
        
        // Get form data
        const formData = this.getFormData();
        
        // Create order object
        const order = {
            orderNumber,
            items: this.cart,
            customerInfo: formData,
            total: this.calculateFinalTotal(),
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        // Save order to localStorage (simulate database)
        this.saveOrder(order);
        
        // Clear cart
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('cart');
            }
        } catch (error) {
            console.warn('Không thể xóa giỏ hàng trong localStorage:', error);
        }
        
        // Show success message
        this.showOrderSuccess(orderNumber);
    }

    getFormData() {
        const form = document.querySelector('.shipping-form');
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        // Get payment method
        const paymentMethod = document.querySelector('input[name="payment-method"]:checked');
        data.paymentMethod = paymentMethod ? paymentMethod.value : '';

        return data;
    }

    calculateFinalTotal() {
        const subtotal = this.calculateSubtotal();
        const tax = subtotal * this.taxRate;
        const discount = this.getAppliedDiscount();
        return subtotal + tax + this.shippingFee - discount;
    }

    getAppliedDiscount() {
        // Get discount from promo code or other sources
        const discountRow = document.querySelector('.discount-row');
        if (discountRow) {
            const discountText = discountRow.querySelector('span:last-child').textContent;
            return parseInt(discountText.replace(/[^0-9]/g, ''));
        }
        return 0;
    }

    saveOrder(order) {
        // Get existing orders or initialize empty array
        try {
            if (typeof localStorage !== 'undefined') {
                const orders = JSON.parse(localStorage.getItem('orders') || '[]');
                orders.push(order);
                localStorage.setItem('orders', JSON.stringify(orders));
            }
        } catch (error) {
            console.warn('Không thể lưu đơn hàng vào localStorage:', error);
        }
    }

    showOrderSuccess(orderNumber) {
        // Create success modal
        const modal = document.createElement('div');
        modal.className = 'order-success-modal';
        modal.innerHTML = `
            <div class="success-content">
                <div class="success-icon">✓</div>
                <h2>Đặt hàng thành công!</h2>
                <p>Mã đơn hàng của bạn: <strong>${orderNumber}</strong></p>
                <p>Cảm ơn bạn đã mua hàng tại Điện Máy Xanh!</p>
                <div class="success-buttons">
                    <button onclick="window.location.href='index.html'" class="btn-primary">Tiếp tục mua sắm</button>
                    <button onclick="window.location.href='order-tracking.html'" class="btn-secondary">Theo dõi đơn hàng</button>
                </div>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .order-success-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }
            .success-content {
                background: white;
                padding: 2rem;
                border-radius: 15px;
                text-align: center;
                max-width: 400px;
                animation: slideIn 0.3s ease;
            }
            .success-icon {
                width: 60px;
                height: 60px;
                background: #00b894;
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 2rem;
                margin: 0 auto 1rem;
            }
            .success-buttons {
                display: flex;
                gap: 1rem;
                margin-top: 1.5rem;
            }
            .btn-primary, .btn-secondary {
                padding: 0.8rem 1.5rem;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 0.9rem;
                transition: all 0.3s ease;
            }
            .btn-primary {
                background: #667eea;
                color: white;
            }
            .btn-secondary {
                background: #f8f9fa;
                color: #333;
                border: 1px solid #ddd;
            }
            @keyframes slideIn {
                from { transform: translateY(-50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(modal);
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                color: white;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                z-index: 1000;
                animation: slideInRight 0.3s ease;
            }
            .notification-success { background: #00b894; }
            .notification-error { background: #ff4757; }
            .notification-warning { background: #ffa502; }
            .notification-info { background: #667eea; }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
            style.remove();
        }, 3000);
    }
}

// Initialize checkout manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CheckoutManager();
});

// Add some utility functions for Vietnamese locations
const vietnamLocations = {
    cities: [
        'Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ',
        'An Giang', 'Bà Rịa - Vũng Tàu', 'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu',
        'Bắc Ninh', 'Bến Tre', 'Bình Định', 'Bình Dương', 'Bình Phước',
        'Bình Thuận', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Đắk Nông',
        'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Giang',
        'Hà Nam', 'Hà Tĩnh', 'Hải Dương', 'Hậu Giang', 'Hòa Bình',
        'Hưng Yên', 'Khánh Hòa', 'Kiên Giang', 'Kon Tum', 'Lai Châu',
        'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định',
        'Nghệ An', 'Ninh Bình', 'Ninh Thuận', 'Phú Thọ', 'Phú Yên',
        'Quảng Bình', 'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị',
        'Sóc Trăng', 'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên',
        'Thanh Hóa', 'Thừa Thiên Huế', 'Tiền Giang', 'Trà Vinh', 'Tuyên Quang',
        'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái'
    ]
};

// Populate city dropdown
function populateCities() {
    const citySelect = document.getElementById('city');
    if (!citySelect) return;

    vietnamLocations.cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
    });
}

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', () => {
    populateCities();
});