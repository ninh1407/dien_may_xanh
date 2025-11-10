# Triển khai trên Ubuntu Server

Tài liệu này hướng dẫn chạy nhanh (demo) và triển khai chuẩn với MongoDB, PM2, Nginx.

## Yêu cầu
- Ubuntu 20.04+ (khuyến nghị).
- Node.js v18+, npm.
- Quyền `sudo` và mở port `80/443` (nếu dùng Nginx) hoặc `5000` (chạy trực tiếp).
- Tùy chọn: MongoDB cho dữ liệu động sản phẩm/danh mục.

---

## Cách 1: Chạy nhanh (Demo, không cần MongoDB)
```bash
# Cài Node.js nhanh với nvm
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 18 && nvm use 18

# Vào thư mục dự án và cấu hình
cp .env.example .env
# Sửa .env: PORT=5000, để trống MONGODB_URI

npm install
node server.js
# Truy cập: http://<IP_MAY_CHU>:5000/
```

Lưu ý: Không có MongoDB, trang vẫn chạy giao diện, nhưng phần danh mục/sản phẩm nổi bật sẽ trống vì API trả về rỗng.

---

## Cách 2: Triển khai chuẩn (MongoDB + PM2 + Nginx)

### Cài Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Cài MongoDB
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update && sudo apt install -y mongodb-org
sudo systemctl enable --now mongod
```

Khởi tạo DB và user:
```bash
mongosh
use dmx
db.createUser({ user: "dmx", pwd: "strong_password", roles: ["readWrite"] })
```

### Thiết lập .env
```bash
cp .env.example .env
# Sửa các biến:
# PORT=5000
# MONGODB_URI=mongodb://dmx:strong_password@127.0.0.1:27017/dmx?authSource=dmx
# JWT_SECRET=<chuoi_bao_mat>
# BASE_URL=https://<domain-hoac-ip>
node scripts/check-env.js
```

### Cài dependencies và seed dữ liệu
```bash
npm install
# Tùy chọn: crawl dữ liệu mẫu
node scripts/crawl-dmx-lite.cjs
node scripts/seed.js
```

### Chạy bằng PM2 (khuyến nghị cho production)
```bash
sudo npm i -g pm2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 status
pm2 logs dmx
```

### Cấu hình Nginx reverse proxy
```bash
sudo apt install -y nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/dmx
sudo ln -s /etc/nginx/sites-available/dmx /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Sửa `server_name` trong `deploy/nginx.conf` thành domain/IP của bạn.

### Kích hoạt HTTPS (Let’s Encrypt) – tùy chọn
```bash
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
sudo certbot --nginx -d <domain> -d www.<domain>
```

---

## Kiểm tra nhanh
```bash
curl -I http://127.0.0.1:5000/
curl http://127.0.0.1:5000/api/products?featured=true&limit=12
```

Qua Nginx: truy cập `http://<domain>` hoặc `https://<domain>` nếu đã bật SSL.

---

## Khắc phục sự cố
- Mở firewall: `sudo ufw allow 'Nginx Full'`
- CSS/JS không tải khi qua Nginx: dùng đường dẫn tuyệt đối `/styles.css`, `/script.js`.
- Menu/sản phẩm không thấy: kiểm tra `MONGODB_URI` và seed `scripts/seed.js`.
- Log PM2: `pm2 logs dmx`; Log Nginx: `/var/log/nginx/error.log`.

---

## Tài liệu liên quan
- `UBUNTU_SERVER_SETUP.md`
- `FINAL_SETUP_GUIDE.md`
- `SETUP_GUIDE.md`