#!/bin/bash
# Script mở firewall cho Ubuntu Server

echo "🔓 Mở firewall ports cho web..."

# 1. Kiểm tra UFW status
echo "📋 Trạng thái firewall hiện tại:"
sudo ufw status

# 2. Mở các port cần thiết
echo "🔓 Đang mở ports..."
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw allow 5000/tcp comment 'Node.js Server'

# 3. Enable UFW nếu chưa enable
if ! sudo ufw status | grep -q "Status: active"; then
    echo "⚡ Enabling UFW..."
    echo "y" | sudo ufw enable
fi

# 4. Hiển thị status sau khi config
echo ""
echo "📋 Trạng thái firewall sau khi cấu hình:"
sudo ufw status numbered

echo ""
echo "✅ Firewall đã được cấu hình!"
echo "🌐 Các port đã mở:"
echo "  - 80 (HTTP)"
echo "  - 443 (HTTPS)"
echo "  - 5000 (Node.js)"