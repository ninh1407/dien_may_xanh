#!/bin/bash
# Script để chạy web trên Ubuntu Server 20.205.30.184

echo "🚀 Bắt đầu chạy web trên Ubuntu Server..."

# 1. Vào thư mục project
cd /var/www/dien-may-xanh || cd ~/dien-may-xanh

echo "📁 Đang ở thư mục: $(pwd)"

# 2. Kiểm tra nếu dependencies chưa được cài
if [ ! -d "node_modules" ]; then
    echo "📦 Đang cài dependencies..."
    npm install
fi

# 3. Kiểm tra environment
npm run check-env

# 4. Dừng server cũ nếu đang chạy
echo "🛑 Dừng server cũ nếu có..."
pm2 stop dien-may-xanh 2>/dev/null || true

# 5. Chạy server mới với PM2
echo "▶️  Chạy server với PM2..."
pm2 start server.js --name "dien-may-xanh" --env production

# 6. Hiển thị status
echo "📊 Server Status:"
pm2 status

# 7. Hiển thị logs
echo "📝 Logs (10 dòng cuối):"
pm2 logs dien-may-xanh --lines 10 --nostream

echo "✅ Server đã được khởi động!"
echo "🌐 Truy cập web tại: http://20.205.30.184"
echo "🔍 Health check: http://20.205.30.184:5000/api/health"
echo ""
echo "📌 Lệnh hữu ích:"
echo "  - Xem logs: pm2 logs dien-may-xanh"
echo "  - Restart: pm2 restart dien-may-xanh"
echo "  - Stop: pm2 stop dien-may-xanh"
echo "  - Status: pm2 status"