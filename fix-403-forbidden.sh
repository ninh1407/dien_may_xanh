#!/bin/bash
# Script fix lỗi 403 Forbidden cho Nginx

echo "🔧 Đang fix lỗi 403 Forbidden..."

# 1. Xác định đúng web root directory
WEB_ROOT="/var/www/dien-may-xanh"
PROJECT_DIR="/var/www/dien-may-xanh/dien_may_xanh-main"

echo "📁 Web root: $WEB_ROOT"
echo "📁 Project dir: $PROJECT_DIR"

# 2. Tạo web root nếu chưa có
sudo mkdir -p $WEB_ROOT/uploads

# 3. Copy toàn bộ static files từ project vào web root
echo "📋 Copy static files..."
if [ -d "$PROJECT_DIR" ]; then
    # Copy HTML files
    sudo cp $PROJECT_DIR/*.html $WEB_ROOT/ 2>/dev/null || true
    # Copy CSS files  
    sudo cp $PROJECT_DIR/*.css $WEB_ROOT/ 2>/dev/null || true
    # Copy JS files
    sudo cp $PROJECT_DIR/*.js $WEB_ROOT/ 2>/dev/null || true
    # Copy images nếu có
    sudo cp -r $PROJECT_DIR/images $WEB_ROOT/ 2>/dev/null || true
fi

# 4. Tạo index.html mặc định nếu không có
if [ ! -f "$WEB_ROOT/index.html" ]; then
    echo "📝 Tạo index.html mặc định..."
    sudo tee $WEB_ROOT/index.html > /dev/null <<'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Điện Máy Xanh</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2c5aa0; text-align: center; }
        .links { margin-top: 30px; }
        .links a { display: block; padding: 15px; margin: 10px 0; background: #2c5aa0; color: white; text-decoration: none; border-radius: 5px; text-align: center; }
        .links a:hover { background: #1e3d6f; }
        .status { padding: 15px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; color: #155724; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌐 Điện Máy Xanh - Web Server</h1>
        <div class="status">
            ✅ Server đang hoạt động!
        </div>
        <div class="links">
            <a href="/home.html">🏪 Trang chủ</a>
            <a href="/products.html">📦 Sản phẩm</a>
            <a href="/login.html">🔐 Đăng nhập</a>
            <a href="/register.html">📝 Đăng ký</a>
            <a href="/cart.html">🛒 Giỏ hàng</a>
        </div>
    </div>
</body>
</html>
EOF
fi

# 5. Set đúng permissions
echo "🔐 Set permissions..."
sudo chown -R www-data:www-data $WEB_ROOT
sudo chmod -R 755 $WEB_ROOT
sudo chmod -R 644 $WEB_ROOT/*.html $WEB_ROOT/*.css $WEB_ROOT/*.js 2>/dev/null || true

# 6. Kiểm tra file có tồn tại không
echo "📋 Kiểm tra files trong web root:"
ls -la $WEB_ROOT/

# 7. Test truy cập file
echo "🧪 Test truy cập file:"
sudo -u www-data test -r "$WEB_ROOT/index.html" && echo "✅ index.html readable" || echo "❌ index.html not readable"

# 8. Fix Nginx config nếu cần
echo "🔧 Cập nhật Nginx config..."
sudo tee /etc/nginx/sites-available/dien-may-xanh > /dev/null <<EOF
server {
    listen 80;
    server_name 20.205.30.184;
    
    # Root directory
    root /var/www/dien-may-xanh;
    index index.html index.htm;
    
    # Logging
    access_log /var/log/nginx/dien-may-xanh.access.log;
    error_log /var/log/nginx/dien-may-xanh.error.log;
    
    # Static files - phục vụ trực tiếp
    location / {
        try_files \$uri \$uri/ =404;
    }
    
    # API routes - proxy to Node.js
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Uploads directory
    location /uploads {
        alias /var/www/dien-may-xanh/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 9. Test và reload Nginx
if sudo nginx -t; then
    echo "✅ Config hợp lệ"
    sudo systemctl reload nginx
    echo "✅ Nginx đã reload thành công!"
else
    echo "❌ Config có lỗi"
    exit 1
fi

echo "✅ Đã fix xong lỗi 403 Forbidden!"
echo "🌐 Test tại: http://20.205.30.184"
echo "📁 Web root: $WEB_ROOT"
echo "📄 Files: $(ls $WEB_ROOT/ 2>/dev/null | head -5)"