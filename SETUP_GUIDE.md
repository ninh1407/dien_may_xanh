# Hướng dẫn cài đặt và chạy dự án Điện Máy Xanh

## Yêu cầu hệ thống

Trước khi bắt đầu, đảm bảo máy tính của bạn đã cài đặt:

1. **Node.js** (phiên bản 14.0.0 trở lên)
   - Tải từ: https://nodejs.org/
   - Kiểm tra: `node --version`

2. **MongoDB** (hoặc MongoDB Atlas cho cloud)
   - Tải từ: https://www.mongodb.com/try/download/community
   - Hoặc dùng MongoDB Atlas: https://www.mongodb.com/atlas/database

3. **Git** (tùy chọn)
   - Tải từ: https://git-scm.com/

## Các bước cài đặt

### Bước 1: Tải và giải nén dự án
```bash
# Nếu có Git, clone repository
git clone <repository-url>
cd dien-may-xanh

# Hoặc giải nén file zip và vào thư mục dự án
cd dien-may-xanh
```

### Bước 2: Cài đặt dependencies
```bash
npm install
```

### Bước 3: Cấu hình môi trường
1. Copy file `.env.example` thành `.env`
2. Mở file `.env` và cập nhật các giá trị:

```env
PORT=3000
FRONTEND_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/dienmayxanh
JWT_SECRET=your-super-secret-jwt-key-here
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
```

**Lưu ý:**
- Nếu dùng MongoDB Atlas, thay `MONGODB_URI` bằng connection string của bạn
- Tạo app password cho Gmail nếu dùng email Gmail

### Bước 4: Khởi tạo dữ liệu mẫu
```bash
npm run seed
```

### Bước 5: Chạy server

**Development mode** (có auto-reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

### Bước 6: Truy cập ứng dụng
Mở trình duyệt và truy cập:
- Website: `http://localhost:3000`
- API: `http://localhost:3000/api`

## Tài khoản mặc định

Sau khi chạy `npm run seed`, bạn có thể đăng nhập với:

**Admin:**
- Email: admin@dienmayxanh.com
- Mật khẩu: admin123

**Người dùng mẫu:**
- Email: user@example.com
- Mật khẩu: user123

## Cấu trúc thư mục

```
dien-may-xanh/
├── 📁 config/              # Cấu hình database
├── 📁 middleware/          # Middleware xử lý yêu cầu
│   ├── auth.js            # Xác thực JWT
│   └── upload.js          # Xử lý upload file
├── 📁 models/              # MongoDB models
│   ├── Category.js        # Model danh mục
│   ├── Order.js           # Model đơn hàng
│   ├── Product.js         # Model sản phẩm
│   ├── Review.js          # Model đánh giá
│   └── User.js            # Model người dùng
├── 📁 routes/              # API routes
│   ├── auth.js            # Đăng ký, đăng nhập
│   ├── cart.js            # Giỏ hàng
│   ├── categories.js      # Danh mục
│   ├── orders.js          # Đơn hàng
│   ├── payments.js        # Thanh toán
│   ├── products.js        # Sản phẩm
│   └── users.js           # Người dùng
├── 📁 scripts/             # Scripts utility
│   └── seed.js            # Tạo dữ liệu mẫu
├── 📁 uploads/             # File upload storage
│   ├── avatars/           # Avatar người dùng
│   ├── categories/        # Hình danh mục
│   ├── products/          # Hình sản phẩm
│   └── reviews/           # Hình đánh giá
├── 📁 utils/               # Utility functions
│   └── email.js           # Gửi email
├── 📄 *.html               # Frontend pages
├── 📄 *.css                # Stylesheets
├── 📄 *.js                 # JavaScript files
├── 📄 server.js            # Server chính
├── 📄 package.json         # Dependencies
├── 📄 .env                 # Environment variables
└── 📄 README.md            # Tài liệu chính
```

## Các trang chính

### Frontend Pages
- `home.html` - Trang chủ
- `products.html` - Danh sách sản phẩm
- `product-detail.html` - Chi tiết sản phẩm
- `cart.html` - Giỏ hàng
- `checkout.html` - Thanh toán
- `order-success.html` - Đặt hàng thành công
- `orders.html` - Quản lý đơn hàng
- `profile.html` - Thông tin cá nhân
- `login.html` - Đăng nhập
- `register.html` - Đăng ký

## API Endpoints chính

### Authentication
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/profile` - Thông tin người dùng
- `PUT /api/auth/profile` - Cập nhật thông tin

### Products
- `GET /api/products` - Danh sách sản phẩm
- `GET /api/products/:id` - Chi tiết sản phẩm
- `GET /api/products/search?q=keyword` - Tìm kiếm
- `GET /api/products/category/:category` - Theo danh mục

### Cart
- `GET /api/cart/:userId` - Giỏ hàng
- `POST /api/cart/add` - Thêm vào giỏ
- `PUT /api/cart/update` - Cập nhật số lượng
- `DELETE /api/cart/remove` - Xóa khỏi giỏ

### Orders
- `GET /api/orders/user/:userId` - Đơn hàng của tôi
- `POST /api/orders` - Tạo đơn hàng
- `PUT /api/orders/:id/status` - Cập nhật trạng thái
- `DELETE /api/orders/:id` - Hủy đơn hàng

### Reviews
- `GET /api/reviews/product/:productId` - Đánh giá sản phẩm
- `POST /api/reviews` - Thêm đánh giá
- `PUT /api/reviews/:id/like` - Thích đánh giá

## Xử lý lỗi thường gặp

### 1. MongoDB connection failed
**Lỗi:** `MongoNetworkError: failed to connect to server`
**Giải pháp:**
- Kiểm tra MongoDB service đang chạy
- Kiểm tra connection string trong `.env`
- Nếu dùng MongoDB Atlas, whitelist IP của bạn

### 2. Port 3000 đã được sử dụng
**Lỗi:** `Error: listen EADDRINUSE: address already in use :::3000`
**Giải pháp:**
- Thay đổi `PORT` trong `.env` hoặc
- Kill process đang dùng port 3000

### 3. JWT secret thiếu
**Lỗi:** `JsonWebTokenError: jwt secret is required`
**Giải pháp:**
- Thêm `JWT_SECRET=your-secret-key` vào `.env`

### 4. Email gửi không được
**Lỗi:** `Error: Invalid login`
**Giải pháp:**
- Dùng app-specific password cho Gmail
- Kiểm tra cấu hình email trong `.env`

## Tính năng nổi bật

### 🔍 Tìm kiếm thông minh
- Tìm kiếm theo tên, mô tả, thương hiệu
- Lọc theo giá, danh mục, đánh giá
- Gợi ý sản phẩm liên quan

### 🛒 Giỏ hàng linh hoạt
- Lưu giỏ hàng cho khách vãng lai
- Đồng bộ giỏ hàng khi đăng nhập
- Áp dụng mã giảm giá nhiều loại

### 💳 Thanh toán đa dạng
- Thanh toán khi nhận hàng (COD)
- Chuyển khoản ngân hàng
- Ví điện tử MoMo, ZaloPay
- Thẻ tín dụng qua Stripe

### 📱 Giao diện responsive
- Tối ưu cho mọi kích thước màn hình
- Trải nghiệm người dùng mượt mà
- Tốc độ tải trang nhanh

### 🔐 Bảo mật cao
- Mã hóa mật khẩu với bcrypt
- Xác thực JWT token
- Validate dữ liệu đầu vào
- Bảo vệ routes quan trọng

## Tài liệu hỗ trợ

- `README.md` - Tài liệu tổng quan dự án
- `API_DOCUMENTATION.md` - Tài liệu API chi tiết
- `postman_collection.json` - Collection Postman để test API

## Hướng dẫn sử dụng Postman Collection

1. **Import Collection:**
   - Mở Postman
   - Click "Import" → "Upload Files"
   - Chọn file `postman_collection.json`

2. **Cấu hình Environment:**
   - Tạo mới Environment với tên "Điện Máy Xanh"
   - Thêm các biến:
     ```
     base_url = http://localhost:3000/api
     user_token = (để trống, sẽ được cập nhật sau)
     admin_token = (để trống, sẽ được cập nhật sau)
     ```

3. **Test API:**
   - **Đăng ký user:** Sử dụng endpoint "Register User"
   - **Đăng nhập:** Sử dụng endpoint "Login User"
   - **Copy token:** Từ response login, copy token và paste vào biến `user_token` trong Environment
   - **Test các endpoints:** Các endpoints khác sẽ tự động sử dụng token này

## Lưu ý quan trọng

1. Đảm bảo MongoDB đang chạy trước khi khởi động server
2. Kiểm tra file `.env` đã được cấu hình đầy đủ
3. Sử dụng admin account để truy cập các chức năng quản trị
4. Kiểm tra logs để debug khi gặp lỗi
5. **Admin Dashboard:** Truy cập `http://localhost:3000/admin.html` để vào trang quản trị

## Hỗ trợ kỹ thuật

Nếu gặp lỗi trong quá trình cài đặt hoặc chạy dự án:
1. Kiểm tra lại các bước cài đặt
2. Kiểm tra logs và error messages
3. Đảm bảo tất cả dependencies đã được cài đặt
4. Kiểm tra kết nối MongoDB
5. Xem chi tiết lỗi trong terminal/console

## License

Dự án này được cấp phép theo MIT License.

---

Chúc bạn cài đặt và sử dụng thành công! 🎉

## Triển khai Production trên Ubuntu (Public ra ngoài)

### 1) Chuẩn bị máy chủ
- Cập nhật hệ thống: `sudo apt update && sudo apt upgrade -y`
- Cài Node.js LTS (gợi ý dùng NodeSource):
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get install -y nodejs
  node -v && npm -v
  ```
- (Tùy chọn) Cài `git`, `ufw`: `sudo apt install git ufw -y`

### 2) Cấu hình Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

### 3) Cấu hình môi trường
- Tạo file `.env` (hoặc `.env.production`) trên server với các giá trị production:
  ```env
  NODE_ENV=production
  PORT=5000
  FRONTEND_URL=https://your-domain.com
  ALLOWED_ORIGINS=https://your-domain.com,https://admin.your-domain.com
  MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority
  JWT_SECRET=<chuoi_bi_mat_ngau_nhien>
  EMAIL_HOST=smtp.gmail.com
  EMAIL_PORT=587
  EMAIL_USER=your-email@gmail.com
  EMAIL_PASS=your-app-password
  EMAIL_FROM=your-email@gmail.com
  EMAIL_FROM_NAME="Điện Máy Xanh"
  ```
- Kiểm tra: `npm run check-env`

### 4) Chạy ứng dụng bằng systemd
- Tạo service file: `sudo nano /etc/systemd/system/dmx.service`
  ```ini
  [Unit]
  Description=DMX Node.js API
  After=network.target

  [Service]
  Type=simple
  WorkingDirectory=/home/<user>/Dien_may_xanh
  ExecStart=/usr/bin/node server.js
  Restart=always
  RestartSec=10
  Environment=NODE_ENV=production
  EnvironmentFile=/home/<user>/Dien_may_xanh/.env

  [Install]
  WantedBy=multi-user.target
  ```
- Reload và chạy:
  ```bash
  sudo systemctl daemon-reload
  sudo systemctl enable dmx
  sudo systemctl start dmx
  sudo systemctl status dmx
  ```

### 5) Reverse Proxy với Nginx
- Cài đặt Nginx: `sudo apt install nginx -y`
- Tạo cấu hình site: `sudo nano /etc/nginx/sites-available/dmx`
  ```nginx
  server {
    listen 80;
    server_name your-domain.com;

    location / {
      proxy_pass http://127.0.0.1:5000;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
      proxy_cache_bypass $http_upgrade;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }
  }
  ```
- Kích hoạt cấu hình và reload:
  ```bash
  sudo ln -s /etc/nginx/sites-available/dmx /etc/nginx/sites-enabled/dmx
  sudo nginx -t
  sudo systemctl reload nginx
  ```

### 6) SSL miễn phí với Let’s Encrypt (Certbot)
- Cài Certbot: `sudo apt install certbot python3-certbot-nginx -y`
- Cấp chứng chỉ: `sudo certbot --nginx -d your-domain.com`
- Gia hạn tự động: `sudo systemctl status certbot.timer`

### 7) Kiểm tra cuối
- API Health: `curl https://your-domain.com/api/health`
- Logs service: `journalctl -u dmx -f`

### 8) Ghi chú triển khai
- Ứng dụng đã bật `trust proxy` để hoạt động đúng sau Nginx
- CORS hỗ trợ nhiều origin qua biến `ALLOWED_ORIGINS`
- Thư mục uploads: đảm bảo quyền ghi cho người chạy service
  ```bash
  sudo chown -R <user>:<user> /home/<user>/Dien_may_xanh/uploads
  ```

Khi cần, tôi có thể kiểm tra cấu hình Nginx hoặc systemd của bạn.