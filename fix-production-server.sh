#!/bin/bash

echo "🚀 Đang fix server production 20.205.30.184..."

# 1. Backup server.js hiện tại
cp server.js server.js.backup

# 2. Fix CORS cho production server
sed -i 's|const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '"'"'http://localhost:3000'"'"')|const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '"'"'http://localhost:3000,http://localhost:5000,http://127.0.0.1:5000,http://20.205.30.184:5000,http://20.205.30.184,https://20.205.30.184'"'"')|g' server.js

# 3. Thêm static files và HTML routes vào server.js
# Tìm dòng "// Static files" và thêm sau đó
sed -i '/\/\/ Static files/a\
// Serve static HTML files\
app.use(express.static(__dirname));\
\
// Route cho trang chủ và các trang HTML\
app.get('"'"'/'"'"', (req, res) => {\
  res.sendFile(path.join(__dirname, '"'"'index.html'"'"'));\
});\
\
app.get('"'"'/index.html'"'"', (req, res) => {\
  res.sendFile(path.join(__dirname, '"'"'index.html'"'"'));\
});\
\
app.get('"'"'/register.html'"'"', (req, res) => {\
  res.sendFile(path.join(__dirname, '"'"'register.html'"'"'));\
});\
\
app.get('"'"'/login.html'"'"', (req, res) => {\
  res.sendFile(path.join(__dirname, '"'"'login.html'"'"'));\
});\
\
app.get('"'"'/products.html'"'"', (req, res) => {\
  res.sendFile(path.join(__dirname, '"'"'products.html'"'"'));\
});\
\
app.get('"'"'/cart.html'"'"', (req, res) => {\
  res.sendFile(path.join(__dirname, '"'"'cart.html'"'"'));\
});\
\
app.get('"'"'/debug.html'"'"', (req, res) => {\
  res.sendFile(path.join(__dirname, '"'"'debug.html'"'"'));\
});' server.js

# 4. Fix CORS origin check - cho phép undefined origin (truy cập trực tiếp)
sed -i 's|if (!origin || allowedOrigins.includes(origin)) {|if (!origin || origin === '"'"'undefined'"'"' || allowedOrigins.includes(origin)) {|g' server.js

# 5. Tạo upload directories nếu chưa có
mkdir -p uploads/avatars uploads/categories uploads/products uploads/reviews
chmod 755 uploads uploads/*

# 6. Kiểm tra và tạo .env nếu cần
if [ ! -f .env ]; then
    cp .env.example .env
    echo "JWT_SECRET=production-secret-key-2024" >> .env
    echo "PORT=5000" >> .env
fi

# 7. Thêm JWT_SECRET nếu thiếu
if ! grep -q "JWT_SECRET" .env; then
    echo "JWT_SECRET=production-secret-key-2024" >> .env
fi

# 8. Restart server
echo "🔄 Đang restart server..."
pm2 restart dien-may-xanh

# 9. Kiểm tra status
echo "✅ Kiểm tra status server:"
pm2 status dien-may-xanh

echo "🎉 Fix production server hoàn tất!"
echo "📡 Test tại: http://20.205.30.184:5000/debug.html"
echo "🏠 Trang chủ: http://20.205.30.184:5000/"