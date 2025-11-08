# Hướng dẫn Setup Server trên Ubuntu 20.205.30.184

## 🚀 Cài đặt Node.js và Dependencies

```bash
# Cập nhật system
sudo apt update && sudo apt upgrade -y

# Cài đặt Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Cài đặt PM2 để quản lý process
sudo npm install -g pm2

# Cài đặt MongoDB (nếu chưa có)
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org

# Khởi động MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

## 📁 Setup Project

```bash
# Clone hoặc copy project vào /var/www
cd /var/www
git clone your-repo-url dien-may-xanh
# Hoặc copy từ local

# Vào thư mục project
cd dien-may-xanh

# Cài dependencies
npm install

# Kiểm tra environment
npm run check-env
```

## ⚙️ Cấu hình Environment

Sửa file `.env` với các giá trị sau:

```env
# Server Configuration - Ubuntu Production
NODE_ENV=production
PORT=5000
FRONTEND_URL=http://20.205.30.184
ALLOWED_ORIGINS=http://20.205.30.184,http://localhost:3000

# Database - Tùy chọn 1 trong 3:
# Option 1: MongoDB local
MONGODB_URI=mongodb://localhost:27017/dien-may-xanh

# Option 2: MongoDB Atlas (khuyến nghị)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dien-may-xanh

# Option 3: MongoDB remote server
# MONGODB_URI=mongodb://remote_ip:27017/dien-may-xanh

# JWT - Thay đổi giá trị này!
JWT_SECRET=your-very-secret-jwt-key-here-make-it-long
JWT_EXPIRE=7d

# Email (nếu cần gửi email)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Security
BCRYPT_ROUNDS=12
```

## 🔥 Chạy Server với PM2

```bash
# Khởi động server với PM2
pm2 start server.js --name "dien-may-xanh"

# Xem logs
pm2 logs dien-may-xanh

# Kiểm tra status
pm2 status

# Restart nếu cần
pm2 restart dien-may-xanh

# Dừng server
pm2 stop dien-may-xanh

# Cấu hình khởi động cùng system
pm2 startup
pm2 save
```

## 🌐 Setup Nginx (Reverse Proxy)

```bash
# Cài đặt Nginx
sudo apt install nginx -y

# Tạo config file
sudo nano /etc/nginx/sites-available/dien-may-xanh
```

Thêm config sau:

```nginx
server {
    listen 80;
    server_name 20.205.30.184;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads {
        alias /var/www/dien-may-xanh/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/dien-may-xanh /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## 🔒 Mở Port (nếu dùng UFW)

```bash
# Mở port 80 và 443
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 5000  # Nếu cần truy cập trực tiếp

# Enable firewall
sudo ufw enable
```

## 🧪 Kiểm tra Server

```bash
# Kiểm tra health endpoint
curl http://localhost:5000/api/health

# Kiểm tra từ bên ngoài (trên máy local)
curl http://20.205.30.184/api/health
```

## 📊 Monitor với PM2

```bash
# Xem dashboard
pm2 monit

# Xem logs
pm2 logs dien-may-xanh --lines 50

# Restart tự động khi file thay đổi (development)
pm2 start server.js --name "dien-may-xanh" --watch
```

## 🔄 Auto-restart on reboot

```bash
# Save PM2 process list
pm2 save

# Setup startup script
pm2 startup systemd

# Chạy lệnh được hiển thị từ output trên, ví dụ:
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u your-user --hp /home/your-user
```

## 🛠️ Troubleshooting

### Lỗi MongoDB connection
```bash
# Kiểm tra MongoDB status
sudo systemctl status mongod

# Xem MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Kiểm tra kết nối
mongo --eval "db.runCommand('ping')"
```

### Lỗi PM2
```bash
# Xem tất cả logs
pm2 logs --lines 100

# Reset PM2
pm2 kill
pm2 start server.js --name "dien-may-xanh"
```

### Lỗi Nginx
```bash
# Test config
sudo nginx -t

# Xem logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Reload Nginx
sudo systemctl reload nginx
```

## ✅ Checklist hoàn thành:
- [ ] Node.js và NPM đã cài
- [ ] MongoDB đang chạy
- [ ] Dependencies đã cài
- [ ] Environment đã config
- [ ] Server chạy với PM2
- [ ] Nginx đang chạy
- [ ] Port đã mở
- [ ] Health check OK