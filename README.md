# Điện Máy Xanh - Thương mại điện tử cho thiết bị điện tử

Một nền tảng thương mại điện tử hiện đại chuyên về thiết bị điện tử và đồ gia dụng, được xây dựng với Node.js, Express và MongoDB.

## Tính năng chính

- **Quản lý người dùng**: Đăng ký, đăng nhập, xác thực email, quên mật khẩu
- **Quản lý sản phẩm**: CRUD sản phẩm, tìm kiếm, lọc, phân trang
- **Quản lý danh mục**: Phân cấp danh mục, danh mục nổi bật
- **Giỏ hàng**: Thêm/xóa sản phẩm, tính toán tổng tiền
- **Đơn hàng**: Tạo đơn hàng, theo dõi trạng thái, quản lý đơn hàng
- **Thanh toán**: Tích hợp Stripe, MoMo, ZaloPay, chuyển khoản ngân hàng
- **Đánh giá**: Hệ thống đánh giá sản phẩm, xác thực đánh giá
- **Upload file**: Upload ảnh sản phẩm, avatar, hình ảnh danh mục
- **Email**: Gửi email xác thực, thông báo đơn hàng, cập nhật trạng thái
- **Bảo mật**: JWT authentication, rate limiting, data sanitization

## Công nghệ sử dụng

- **Backend**: Node.js, Express.js
- **Database**: MongoDB với Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Payment**: Stripe, MoMo, ZaloPay APIs
- **Email**: Nodemailer
- **File Upload**: Multer
- **Security**: Helmet, express-rate-limit, express-mongo-sanitize
- **Validation**: express-validator

## Yêu cầu hệ thống

- Node.js (>= 16.0.0)
- npm (>= 8.0.0)
- MongoDB (>= 4.4)

## Cài đặt

1. **Clone repository**:
```bash
git clone https://github.com/your-username/dien-may-xanh-backend.git
cd dien-may-xanh-backend
```

2. **Cài đặt dependencies**:
```bash
npm install
```

3. **Cấu hình môi trường**:
Copy file `.env.example` thành `.env` và cập nhật các giá trị:
```bash
cp .env.example .env
```

Các biến môi trường quan trọng:
- `MONGODB_URI`: Chuỗi kết nối MongoDB
- `JWT_SECRET`: Khóa bí mật cho JWT
- `EMAIL_USER` & `EMAIL_PASS`: Thông tin email để gửi thông báo
- `STRIPE_SECRET_KEY`: Khóa bí mật Stripe (nếu sử dụng Stripe)

4. **Chạy database seed** (tùy chọn):
```bash
npm run seed
```

5. **Khởi động server**:
```bash
# Development
npm run dev

# Production
npm start
```

Server sẽ chạy tại: `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký người dùng mới
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/profile` - Lấy thông tin người dùng
- `POST /api/auth/verify-email` - Xác thực email
- `POST /api/auth/forgot-password` - Quên mật khẩu
- `POST /api/auth/reset-password` - Đặt lại mật khẩu
- `POST /api/auth/refresh-token` - Làm mới token
- `POST /api/auth/logout` - Đăng xuất

### Products
- `GET /api/products` - Lấy danh sách sản phẩm (có phân trang, lọc)
- `GET /api/products/:slug` - Lấy chi tiết sản phẩm
- `POST /api/products` - Tạo sản phẩm mới (admin)
- `PUT /api/products/:id` - Cập nhật sản phẩm (admin)
- `DELETE /api/products/:id` - Xóa sản phẩm (admin)
- `POST /api/products/:id/reviews` - Thêm đánh giá sản phẩm
- `GET /api/products/:id/reviews` - Lấy đánh giá sản phẩm

### Categories
- `GET /api/categories` - Lấy danh sách danh mục
- `GET /api/categories/featured` - Lấy danh mục nổi bật
- `GET /api/categories/:slug` - Lấy chi tiết danh mục
- `GET /api/categories/:slug/products` - Lấy sản phẩm theo danh mục
- `POST /api/categories` - Tạo danh mục mới (admin)
- `PUT /api/categories/:id` - Cập nhật danh mục (admin)
- `DELETE /api/categories/:id` - Xóa danh mục (admin)

### Cart
- `GET /api/cart` - Lấy giỏ hàng
- `POST /api/cart/add` - Thêm sản phẩm vào giỏ hàng
- `PUT /api/cart/update` - Cập nhật số lượng sản phẩm
- `DELETE /api/cart/remove/:productId` - Xóa sản phẩm khỏi giỏ hàng
- `DELETE /api/cart/clear` - Xóa toàn bộ giỏ hàng
- `GET /api/cart/summary` - Lấy tóm tắt giỏ hàng
- `POST /api/cart/validate` - Kiểm tra giỏ hàng trước khi thanh toán

### Orders
- `POST /api/orders` - Tạo đơn hàng mới
- `GET /api/orders/my-orders` - Lấy đơn hàng của người dùng
- `GET /api/orders/:id` - Lấy chi tiết đơn hàng
- `PUT /api/orders/:id/status` - Cập nhật trạng thái đơn hàng (admin)
- `PUT /api/orders/:id/cancel` - Hủy đơn hàng
- `GET /api/orders/admin/all` - Lấy tất cả đơn hàng (admin)
- `GET /api/orders/admin/stats` - Thống kê đơn hàng (admin)

### Users
- `GET /api/users/profile` - Lấy thông tin cá nhân
- `PUT /api/users/profile` - Cập nhật thông tin cá nhân
- `POST /api/users/upload-avatar` - Upload avatar
- `PUT /api/users/change-password` - Đổi mật khẩu
- `GET /api/users/addresses` - Lấy địa chỉ
- `POST /api/users/addresses` - Thêm địa chỉ mới
- `PUT /api/users/addresses/:id` - Cập nhật địa chỉ
- `DELETE /api/users/addresses/:id` - Xóa địa chỉ
- `GET /api/users/wishlist` - Lấy danh sách yêu thích
- `POST /api/users/wishlist` - Thêm vào danh sách yêu thích
- `DELETE /api/users/wishlist/:productId` - Xóa khỏi danh sách yêu thích

### Payments
- `GET /api/payments/methods` - Lấy phương thức thanh toán
- `POST /api/payments/stripe/create-intent` - Tạo Stripe payment intent
- `POST /api/payments/stripe/confirm` - Xác nhận thanh toán Stripe
- `POST /api/payments/momo` - Thanh toán MoMo
- `POST /api/payments/zalopay` - Thanh toán ZaloPay
- `POST /api/payments/bank-transfer` - Chuyển khoản ngân hàng
- `PUT /api/payments/bank-transfer/:id/confirm` - Xác nhận chuyển khoản (admin)
- `POST /api/payments/stripe/webhook` - Webhook cho Stripe events

## Cấu trúc thư mục

```
dien-may-xanh-backend/
├── config/              # Cấu hình database và các dịch vụ
├── controllers/         # Logic xử lý request (sẽ tạo sau)
├── middleware/          # Middleware xác thực, upload, validation
├── models/             # MongoDB models
├── routes/             # API routes
├── scripts/            # Scripts tiện ích (seed, migrate)
├── uploads/            # File upload storage
├── utils/              # Utility functions
├── server.js           # Entry point
├── package.json        # Dependencies và scripts
└── .env               # Environment variables
```

## Testing

Chạy tests:
```bash
npm test
```

Chạy tests với coverage:
```bash
npm run test:coverage
```

## Deployment

1. **Chuẩn bị production build**:
```bash
npm install --production
```

2. **Cấu hình environment variables** cho production

3. **Deploy lên server** của bạn (Heroku, AWS, Digital Ocean, v.v.)

## Contributing

1. Fork repository
2. Tạo branch cho feature mới (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add some amazing feature'`)
4. Push lên branch (`git push origin feature/amazing-feature`)
5. Tạo Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

Nếu bạn gặp vấn đề, vui lòng tạo issue trên GitHub hoặc liên hệ qua email: support@dienmayxanh.com

## Changelog

Xem [CHANGELOG.md](CHANGELOG.md) để biết chi tiết về các thay đổi.