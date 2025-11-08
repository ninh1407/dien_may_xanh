#!/bin/bash

echo "🔍 Kiểm tra chi tiết lỗi tính năng..."

# Check server logs
echo "📋 Kiểm tra logs server..."
ssh -p 22 root@20.205.30.184 "pm2 logs dien-may-xanh --lines 50"

echo ""
echo "🔧 Kiểm tra các vấn đề phổ biến..."

# Check environment variables
echo "1. Kiểm tra biến môi trường..."
ssh -p 22 root@20.205.30.184 "cd /root/dien-may-xanh && cat .env | grep -E '(JWT_SECRET|MONGO_URI|NODE_ENV)'"

echo ""
echo "2. Kiểm tra database connection..."
ssh -p 22 root@20.205.30.184 "cd /root/dien-may-xanh && node -e \"
const mongoose = require('mongoose');
const config = require('./config/database');
mongoose.connect(config.database, config.options)
  .then(() => console.log('✅ Database connected successfully'))
  .catch(err => console.log('❌ Database connection failed:', err.message));
setTimeout(() => mongoose.disconnect(), 3000);
\""

echo ""
echo "3. Kiểm tra API endpoints với curl..."

# Test health endpoint
echo "Testing health endpoint..."
curl -s http://20.205.30.184:5000/health | jq . || echo "Health check failed"

# Test products endpoint
echo "Testing products endpoint..."
curl -s http://20.205.30.184:5000/api/products | jq . || echo "Products API failed"

# Test auth endpoint
echo "Testing auth endpoint..."
curl -s -X POST http://20.205.30.184:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpassword"}' | jq . || echo "Auth API failed"

echo ""
echo "4. Kiểm tra file uploads directory..."
ssh -p 22 root@20.205.30.184 "ls -la /root/dien-may-xanh/uploads/"

echo ""
echo "5. Kiểm tra CORS configuration..."
ssh -p 22 root@20.205.30.184 "cd /root/dien-may-xanh && grep -A 10 -B 5 'cors' server.js || echo 'CORS not found in server.js'"

echo ""
echo "6. Kiểm tra middleware configuration..."
ssh -p 22 root@20.205.30.184 "cd /root/dien-may-xanh && ls -la middleware/"

echo ""
echo "📊 Tổng hợp lỗi thường gặp:"
echo "1. ❌ Lỗi CORS - Frontend không thể gọi API"
echo "2. ❌ Lỗi Authentication - Token không hợp lệ hoặc thiếu"
echo "3. ❌ Lỗi Database - MongoDB connection failed"
echo "4. ❌ Lỗi Validation - Dữ liệu gửi lên không đúng format"
echo "5. ❌ Lỗi File Upload - Thiếu thư mục uploads hoặc permissions"
echo "6. ❌ Lỗi Environment Variables - Thiếu JWT_SECRET hoặc các biến cần thiết"

echo ""
echo "🛠️ Các bước fix lỗi:"
echo "1. Copy file debug.html lên server: ./copy-debug.sh"
echo "2. Truy cập: http://20.205.30.184/debug.html"
echo "3. Test từng tính năng và xem console logs"
echo "4. Kiểm tra PM2 logs: ssh root@20.205.30.184 'pm2 logs'"
echo "5. Restart server nếu cần: ssh root@20.205.30.184 'cd /root/dien-may-xanh && pm2 restart dien-may-xanh'"