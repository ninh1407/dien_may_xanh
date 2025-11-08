#!/bin/bash
# Script fix lỗi Nginx redirect cycle

echo "🔧 Đang fix lỗi Nginx redirect cycle..."

# 1. Backup config cũ
sudo cp /etc/nginx/sites-available/dien-may-xanh /etc/nginx/sites-available/dien-may-xanh.backup.$(date +%s)

# 2. Tạo config đúng cho static files + API proxy
echo "📋 Tạo config Nginx mới..."
sudo tee /etc/nginx/sites-available/dien-may-xanh > /dev/null <<'EOF'
server {
    listen 80;
    server_name 20.205.30.184;
    
    # Root directory cho static files
    root /var/www/dien-may-xanh;
    index index.html index.htm;
    
    # Xử lý static files trực tiếp
    location / {
        try_files $uri $uri/ @backend;
    }
    
    # Proxy cho API và các route backend
    location @backend {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Proxy riêng cho API routes
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Static files uploads
    location /uploads {
        alias /var/www/dien-may-xanh/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Cấm truy cập các file nguy hiểm
    location ~ /\. {
        deny all;
    }
    
    location ~ /(config|logs|temp|vendor) {
        deny all;
    }
}
EOF

# 3. Tạo thư mục web root nếu chưa có
sudo mkdir -p /var/www/dien-may-xanh/uploads

# 4. Copy static files từ project vào web root
echo "📁 Copy static files..."
if [ -d "/var/www/dien-may-xanh/dien_may_xanh-main" ]; then
    sudo cp -r /var/www/dien-may-xanh/dien_may_xanh-main/*.html /var/www/dien-may-xanh/
    sudo cp -r /var/www/dien-may-xanh/dien_may_xanh-main/*.css /var/www/dien-may-xanh/
    sudo cp -r /var/www/dien-may-xanh/dien_may_xanh-main/*.js /var/www/dien-may-xanh/
fi

# 5. Set permissions
sudo chown -R www-data:www-data /var/www/dien-may-xanh
sudo chmod -R 755 /var/www/dien-may-xanh

# 6. Test config
if sudo nginx -t; then
    echo "✅ Config hợp lệ"
    sudo systemctl reload nginx
    echo "✅ Nginx đã reload thành công!"
else
    echo "❌ Config có lỗi"
    exit 1
fi

echo "✅ Đã fix xong lỗi redirect cycle!"
echo "🌐 Test tại: http://20.205.30.184"