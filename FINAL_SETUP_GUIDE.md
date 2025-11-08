# 🚀 HƯỚNG DẪN CHẠY WEB TRÊN UBUNTU SERVER 20.205.30.184

## 📋 TỔNG HỢP CÁC BƯỚC SAU KHI ĐÃ CHECK XONG

### 🔥 BƯỚC 1: COPY CÁC SCRIPT LÊN SERVER

```bash
# Trên máy local, copy các file lên server
scp start-server.sh check-status.sh setup-nginx.sh setup-firewall.sh user@20.205.30.184:/var/www/dien-may-xanh/

# Hoặc nếu bạn đã có code trên server, chỉ cần chmod
ssh user@20.205.30.184
cd /var/www/dien-may-xanh
chmod +x *.sh
```

### ⚡ BƯỚC 2: CHẠY SERVER

```bash
# Chạy server với PM2
./start-server.sh

# Hoặc chạy thủ công:
pm2 start server.js --name "dien-may-xanh"
```

### 🔍 BƯỚC 3: KIỂM TRA SERVER

```bash
# Kiểm tra trạng thái
./check-status.sh

# Hoặc kiểm tra thủ công:
curl http://localhost:5000/api/health
```

### 🌐 BƯỚC 4: CÀI ĐẶT NGINX (NẾU CHƯA CÓ)

```bash
# Cài và cấu hình Nginx
./setup-nginx.sh

# Test Nginx
curl http://localhost
```

### 🔓 BƯỚC 5: MỞ FIREWALL

```bash
# Mở firewall
./setup-firewall.sh

# Hoặc thủ công:
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## ✅ KIỂM TRA CUỐI CÙNG

### 1. Kiểm tra từ server:
```bash
curl http://localhost:5000/api/health
```

### 2. Kiểm tra từ bên ngoài:
Mở browser và truy cập:
- **Web chính**: http://20.205.30.184
- **Health check**: http://20.205.30.184:5000/api/health

### 3. Kiểm tra logs nếu lỗi:
```bash
# Xem logs PM2
pm2 logs dien-may-xanh --lines 20

# Xem logs Nginx
sudo tail -f /var/log/nginx/error.log

# Xem logs MongoDB
sudo tail -f /var/log/mongodb/mongod.log
```

## 🎯 LỆNH TẮT CẦN NHỚ

```bash
# Quản lý server
pm2 status              # Xem status
pm2 logs dien-may-xanh  # Xem logs
pm2 restart dien-may-xanh # Restart
pm2 stop dien-may-xanh  # Dừng server

# Quản lý Nginx
sudo systemctl status nginx
sudo nginx -t           # Test config
sudo systemctl reload nginx

# Quản lý MongoDB
sudo systemctl status mongod
sudo systemctl start mongod
sudo systemctl stop mongod

# Quản lý firewall
sudo ufw status
sudo ufw allow 80
sudo ufw allow 443
```

## 🚨 LỖI THƯỜNG GẶP VÀ CÁCH FIX

### Lỗi: "Cannot connect to MongoDB"
```bash
# Fix: Khởi động MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Lỗi: "Port 80 already in use"
```bash
# Fix: Tắt Apache nếu đang chạy
sudo systemctl stop apache2
sudo systemctl disable apache2
sudo systemctl restart nginx
```

### Lỗi: "CORS error"
```bash
# Fix: Kiểm tra .env file
cat .env | grep FRONTEND_URL
# Nên là: FRONTEND_URL=http://20.205.30.184
```

### Lỗi: "Connection refused"
```bash
# Fix: Kiểm tra firewall
sudo ufw allow 80
sudo ufw allow 5000
sudo ufw enable
```

## 📱 TEST TRÊN ĐIỆN THOẠI

Mở điện thoại, truy cập:
- http://20.205.30.184
- Nếu thấy giao diện web -> THÀNH CÔNG! 🎉

## 🎊 CHÚC MỪNG!

Nếu bạn thấy web hiển thị trên http://20.205.30.184 thì đã HOÀN THÀNH! 🚀

Nếu gặp lỗi, hãy:
1. Chụp ảnh lỗi
2. Chạy `./check-status.sh`
3. Gửi kết quả để được hỗ trợ