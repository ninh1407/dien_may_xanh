#!/bin/bash
# Script cấu hình Nginx cho Ubuntu Server

echo "🌐 Cấu hình Nginx cho web..."

# 1. Cài Nginx nếu chưa có
if ! command -v nginx &> /dev/null; then
    echo "📦 Đang cài đặt Nginx..."
    sudo apt update
    sudo apt install nginx -y
fi

# 2. Tạo config file
sudo tee /etc/nginx/sites-available/dien-may-xanh > /dev/null <<EOF
server {
    listen 80;
    server_name 20.205.30.184;
    
    # Frontend files
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files uploads
    location /uploads {
        alias /var/www/dien-may-xanh/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 3. Enable site
sudo ln -sf /etc/nginx/sites-available/dien-may-xanh /etc/nginx/sites-enabled/

# 4. Test config
if sudo nginx -t; then
    echo "✅ Config Nginx hợp lệ"
else
    echo "❌ Config Nginx có lỗi"
    exit 1
fi

# 5. Reload Nginx
sudo systemctl reload nginx
sudo systemctl enable nginx

echo "✅ Nginx đã được cấu hình thành công!"
echo "🌐 Web sẽ chạy trên: http://20.205.30.184"