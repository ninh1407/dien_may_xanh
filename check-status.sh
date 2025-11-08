#!/bin/bash
# Script kiểm tra status của web server

echo "🔍 Kiểm tra trạng thái web server..."
echo "==================================="

# 1. Kiểm tra PM2 status
echo "📊 PM2 Status:"
pm2 status

echo ""

# 2. Kiểm tra server health
echo "🏥 Health Check:"
curl -s http://localhost:5000/api/health || echo "❌ Server không phản hồi"

echo ""

# 3. Kiểm tra port 5000
echo "🔌 Port 5000:"
netstat -tlnp | grep :5000 || echo "❌ Port 5000 không mở"

echo ""

# 4. Kiểm tra MongoDB
echo "🗄️  MongoDB Status:"
sudo systemctl status mongod --no-pager -l

echo ""

# 5. Kiểm tra Nginx (nếu có)
echo "🌐 Nginx Status:"
sudo systemctl status nginx --no-pager -l 2>/dev/null || echo "ℹ️  Nginx chưa được cài đặt"

echo ""
echo "==================================="
echo "📝 Gợi ý khắc phục lỗi:"
echo "  - Nếu server không chạy: pm2 start server.js --name 'dien-may-xanh'"
echo "  - Nếu MongoDB lỗi: sudo systemctl start mongod"
echo "  - Xem logs: pm2 logs dien-may-xanh --lines 20"
echo "  - Nếu cần restart: pm2 restart dien-may-xanh"