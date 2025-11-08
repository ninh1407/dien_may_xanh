# 🔧 HƯỚNG DẪN FIX TOÀN BỘ LỖI TÍNH NĂNG

## 📋 TỔNG HỢP LỖI ĐÃ PHÁT HIỆN

### 1. Lỗi CORS (Cross-Origin Resource Sharing)
- **Vấn đề**: Frontend không thể gọi API do chính sách bảo mật trình duyệt
- **Biểu hiện**: "CORS policy blocked" trong console

### 2. Lỗi Authentication
- **Vấn đề**: Token không được xử lý đúng cách hoặc thiếu JWT_SECRET
- **Biểu hiện**: "Access denied" hoặc "Invalid token"

### 3. Lỗi Database Connection
- **Vấn đề**: MongoDB không kết nối được
- **Biểu hiện**: "Database connection failed"

### 4. Lỗi File Upload
- **Vấn đề**: Thiếu thư mục uploads hoặc permissions không đúng
- **Biểu hiện**: "Upload failed" hoặc "Permission denied"

### 5. Lỗi Nginx Configuration
- **Vấn đề**: API routes không được chuyển tiếp đúng cách
- **Biểu hiện**: "404 Not Found" cho API calls

## 🚀 CÁC BƯỚC FIX LỖI

### Bước 1: Copy các script fix lên server
```bash
# Copy tất cả script lên server
scp -P 22 copy-debug.sh root@20.205.30.184:/root/
scp -P 22 fix-all-features.sh root@20.205.30.184:/root/
scp -P 22 diagnose-errors.sh root@20.205.30.184:/root/

# SSH vào server
ssh -p 22 root@20.205.30.184

# Make scripts executable
chmod +x /root/*.sh
```

### Bước 2: Chạy script fix tổng hợp
```bash
# Chạy script fix tất cả lỗi
./fix-all-features.sh
```

### Bước 3: Kiểm tra kết quả với debug page
```bash
# Copy debug page
./copy-debug.sh

# Truy cập debug page trong browser
# Mở: http://20.205.30.184/debug.html
```

### Bước 4: Test từng tính năng với debug page
1. **Mở browser**: http://20.205.30.184/debug.html
2. **Kiểm tra Server Status**: Xem có kết nối được không
3. **Test Authentication**: 
   - Click "Test Register" để tạo tài khoản test
   - Click "Test Login" để đăng nhập
   - Click "Test Profile" để kiểm tra thông tin user
4. **Test Products**:
   - Click "Get Products" để xem danh sách sản phẩm
   - Click "Get Categories" để xem danh mục
   - Click "Search Products" để test tìm kiếm
5. **Test Cart**:
   - Click "Get Cart" để xem giỏ hàng
   - Click "Add to Cart" để thêm sản phẩm
6. **Test Orders**:
   - Click "Get Orders" để xem đơn hàng
   - Click "Create Order" để tạo đơn hàng test

### Bước 5: Kiểm tra logs nếu có lỗi
```bash
# Xem real-time logs
pm2 logs dien-may-xanh

# Xem 100 dòng logs gần nhất
pm2 logs dien-may-xanh --lines 100

# Xem status của PM2
pm2 status
```

### Bước 6: Fix lỗi cụ thể nếu còn

#### Nếu gặp lỗi CORS:
```bash
# Kiểm tra Nginx config
nginx -t

# Restart Nginx
systemctl restart nginx

# Kiểm tra CORS headers trong browser DevTools
```

#### Nếu gặp lỗi Authentication:
```bash
# Kiểm tra JWT_SECRET trong .env
cat /root/dien-may-xanh/.env | grep JWT_SECRET

# Kiểm tra token trong browser localStorage
# Mở DevTools > Application > Local Storage
```

#### Nếu gặp lỗi Database:
```bash
# Kiểm tra MongoDB
systemctl status mongod

# Test kết nối MongoDB
mongo --eval "db.runCommand({ping: 1})"
```

#### Nếu gặp lỗi File Upload:
```bash
# Kiểm tra permissions
ls -la /root/dien-may-xanh/uploads/

# Fix permissions
chmod -R 755 /root/dien-may-xanh/uploads/
```

## 🔍 CÁCH TEST TỪNG TÍNH NĂNG

### 1. Test Đăng Ký/Đăng Nhập
- Truy cập: http://20.205.30.184/register.html
- Hoặc dùng debug page: "Test Register" và "Test Login"

### 2. Test Xem Sản Phẩm
- Truy cập: http://20.205.30.184/products.html
- Hoặc dùng debug page: "Get Products"

### 3. Test Giỏ Hàng
- Truy cập: http://20.205.30.184/cart.html
- Hoặc dùng debug page: "Add to Cart"

### 4. Test Đặt Hàng
- Truy cập: http://20.205.30.184/checkout.html
- Hoặc dùng debug page: "Create Order"

### 5. Test Quản Lý Đơn Hàng
- Truy cập: http://20.205.30.184/orders.html
- Hoặc dùng debug page: "Get Orders"

## 📱 TEST TRÊN MOBILE
- Mở điện thoại
- Truy cập: http://20.205.30.184
- Test các tính năng: đăng nhập, thêm giỏ hàng, đặt hàng

## 🛠️ CÔNG CỤ DEBUG

### Browser DevTools
- **F12** hoặc **Ctrl+Shift+I** để mở DevTools
- **Console tab**: Xem lỗi JavaScript
- **Network tab**: Xem API calls và responses
- **Application tab**: Xem localStorage và cookies

### Server Logs
```bash
# Xem tất cả logs
pm2 logs

# Xem logs của app
pm2 logs dien-may-xanh

# Xem Nginx logs
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

### Database Check
```bash
# Kiểm tra MongoDB
mongo dien-may-xanh --eval "show collections"

# Xem số lượng documents
db.users.countDocuments()
db.products.countDocuments()
db.orders.countDocuments()
```

## ⚠️ LỖI THƯỜNG GẶP VÀ CÁCH FIX

### "Cannot connect to server"
- **Nguyên nhân**: Server không chạy hoặc firewall chặn
- **Fix**: Kiểm tra PM2 status, mở firewall port 5000

### "Invalid token"
- **Nguyên nhân**: JWT_SECRET thay đổi hoặc token hết hạn
- **Fix**: Đăng nhập lại, kiểm tra JWT_SECRET trong .env

### "Product not found"
- **Nguyên nhân**: Database chưa có dữ liệu
- **Fix**: Chạy seed data: `node scripts/seed.js`

### "Upload failed"
- **Nguyên nhân**: Thiếu thư mục uploads hoặc permissions
- **Fix**: Tạo thư mục và set permissions

### "Payment failed"
- **Nguyên nhân**: Chưa cấu hình payment gateway
- **Fix**: Cấu hình Stripe hoặc MoMo API keys trong .env

## 📞 LIÊN HỆ HỖ TRỢ

Nếu gặp lỗi không thể fix:
1. **Chụp ảnh lỗi** trong browser console
2. **Copy logs** từ PM2 hoặc Nginx
3. **Ghi lại các bước** đã thực hiện
4. **Mô tả chi tiết** lỗi xảy ra

## ✅ CHECKLIST KHI HOÀN THÀNH

- [ ] Tất cả tính năng hoạt động trên desktop
- [ ] Tất cả tính năng hoạt động trên mobile
- [ ] Không có lỗi trong browser console
- [ ] API responses trả về đúng format
- [ ] Database có dữ liệu đầy đủ
- [ ] File upload hoạt động
- [ ] Email gửi được (nếu có)
- [ ] Payment gateway hoạt động (nếu có)

---

**🎉 Chúc bạn fix lỗi thành công!** 
Nếu cần thêm thông tin, hãy chạy `./diagnose-errors.sh` và gửi output để mình hỗ trợ thêm.