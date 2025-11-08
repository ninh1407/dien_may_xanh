# Hướng dẫn Fix Lỗi Web Không Chạy Được

## ✅ Các lỗi đã được fix:

### 1. 🔧 Lỗi CORS (Cross-Origin Resource Sharing)
**Vấn đề**: CORS chặn request từ frontend
**Đã fix**: 
- Development mode: Cho phép tất cả origins
- Production mode: Chỉ cho phép origins cụ thể

### 2. 🔧 Lỗi MongoDB Connection
**Vấn đề**: Không kết nối được MongoDB
**Đã fix**: 
- Cấu hình lại MongoDB URI
- Thêm hướng dẫn sử dụng MongoDB local

### 3. 🔧 Lỗi Environment
**Vấn đề**: Sai environment configuration
**Đã fix**: 
- Chuyển từ production sang development
- Cập nhật frontend URL về localhost

## 🚀 Cách chạy web:

### Bước 1: Cài đặt MongoDB (nếu chưa có)
```bash
# Windows: Tải và cài đặt từ https://www.mongodb.com/try/download/community
# Sau đó chạy MongoDB service
```

### Bước 2: Cài đặt dependencies
```bash
npm install
```

### Bước 3: Kiểm tra environment
```bash
npm run check-env
```

### Bước 4: Chạy server
```bash
# Cách 1: Chạy thường
npm start

# Cách 2: Chạy với auto-reload (development)
npm run dev
```

### Bước 5: Mở frontend
- Mở file `index.html` hoặc `home.html` trong browser
- Hoặc dùng Live Server extension trong VS Code

## 🔍 Kiểm tra server đang chạy:
- Truy cập: http://localhost:5000/api/health
- Nếu thấy response JSON -> server đang chạy tốt

## 🛠️ Lỗi thường gặp và cách fix:

### Lỗi "MongoDB connection failed"
**Nguyên nhân**: MongoDB chưa chạy
**Fix**: 
1. Kiểm tra MongoDB service: `services.msc` -> tìm MongoDB
2. Khởi động MongoDB service
3. Hoặc sửa file `.env` thành: `MONGODB_URI=mongodb://127.0.0.1:27017/dien-may-xanh`

### Lỗi "CORS error"
**Nguyên nhân**: Domain không được phép
**Fix**: Đã fix tự động trong development mode

### Lỗi "Cannot GET /"
**Nguyên nhân**: Truy cập sai đường dẫn
**Fix**: Dùng file HTML trong thư mục gốc, không truy cập trực tiếp vào localhost:5000

## 📁 Cấu trúc thư mục quan trọng:
- `server.js` - File server chính
- `.env` - Configuration (đã được cập nhật)
- `index.html`, `home.html` - Frontend
- `config/database.js` - Database connection
- `routes/` - API endpoints

## 🔧 Nếu vẫn bị lỗi:
1. Kiểm tra console log khi chạy server
2. Chụp ảnh lỗi gửi cho developer
3. Kiểm tra port 5000 có bị chiếm không
4. Thử restart máy và chạy lại

## 📞 Hỗ trợ:
- Kiểm tra log trong terminal/command prompt
- Kiểm tra file `README.md` gốc
- Xem file `SETUP_GUIDE.md` nếu có