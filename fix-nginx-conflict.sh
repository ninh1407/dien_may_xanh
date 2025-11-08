#!/bin/bash
# Script fix lỗi conflicting server name trong Nginx

echo "🔧 Đang fix lỗi conflicting server name..."

# 1. Tìm các config trùng lặp
echo "📋 Tìm các file config trùng IP 20.205.30.184..."
sudo grep -r "20.205.30.184" /etc/nginx/sites-enabled/

# 2. Backup config hiện tại
echo "💾 Backup config hiện tại..."
sudo cp /etc/nginx/sites-available/dien-may-xanh /etc/nginx/sites-available/dien-may-xanh.backup

# 3. Xóa symlink cũ nếu có
sudo rm -f /etc/nginx/sites-enabled/dien-may-xanh

# 4. Tạo config mới sạch sẽ
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
}
EOF

# 5. Tạo symlink mới
sudo ln -sf /etc/nginx/sites-available/dien-may-xanh /etc/nginx/sites-enabled/

# 6. Xóa các config mặc định gây xung đột
sudo rm -f /etc/nginx/sites-enabled/default

# 7. Test config
if sudo nginx -t; then
    echo "✅ Config Nginx hợp lệ"
    sudo systemctl reload nginx
    echo "✅ Nginx đã reload thành công!"
else
    echo "❌ Config Nginx có lỗi, khôi phục backup..."
    sudo cp /etc/nginx/sites-available/dien-may-xanh.backup /etc/nginx/sites-available/dien-may-xanh
    sudo nginx -t && sudo systemctl reload nginx
fi

echo "✅ Đã fix xong lỗi conflicting server name!"