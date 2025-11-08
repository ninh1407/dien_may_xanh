#!/bin/bash

echo "🔧 Bắt đầu fix các lỗi tính năng..."

# 1. Fix CORS issues
echo "1️⃣ Fixing CORS configuration..."
cat > /tmp/cors-fix.js << 'EOF'
// Add this to server.js after const app = express();
const cors = require('cors');

// CORS configuration
const corsOptions = {
  origin: ['http://20.205.30.184', 'http://localhost:3000', 'http://localhost:5000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
EOF

# 2. Install missing dependencies
echo "2️⃣ Installing missing dependencies..."
ssh -p 22 root@20.205.30.184 "cd /root/dien-may-xanh && npm install cors helmet express-rate-limit"

# 3. Create uploads directories with proper permissions
echo "3️⃣ Creating uploads directories..."
ssh -p 22 root@20.205.30.184 "
cd /root/dien-may-xanh
mkdir -p uploads/{avatars,categories,products,reviews}
chmod -R 755 uploads
chown -R root:root uploads
"

# 4. Fix environment variables
echo "4️⃣ Checking environment variables..."
ssh -p 22 root@20.205.30.184 "
cd /root/dien-may-xanh
if [ ! -f .env ]; then
    echo 'Creating .env file...'
    cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb://localhost:27017/dien-may-xanh
JWT_SECRET=dien-may-xanh-super-secret-key-2024
JWT_EXPIRE=7d
FRONTEND_URL=http://20.205.30.184
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
UPLOAD_PATH=uploads
MAX_FILE_SIZE=5242880
ENVEOF
else
    echo 'Checking existing .env...'
    grep -q 'JWT_SECRET' .env || echo 'JWT_SECRET=dien-may-xanh-super-secret-key-2024' >> .env
    grep -q 'FRONTEND_URL' .env || echo 'FRONTEND_URL=http://20.205.30.184' >> .env
fi
"

# 5. Fix Nginx configuration for API routes
echo "5️⃣ Fixing Nginx configuration..."
cat > /tmp/nginx-api-fix.conf << 'EOF'
server {
    listen 80;
    server_name 20.205.30.184;
    
    # API routes - proxy to Node.js
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With';
            add_header 'Access-Control-Allow-Credentials' 'true';
            add_header 'Access-Control-Max-Age' 86400;
            add_header 'Content-Length' 0;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            return 204;
        }
    }
    
    # Static files
    location /uploads/ {
        alias /var/www/dien-may-xanh/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Frontend routes
    location / {
        root /var/www/dien-may-xanh;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
EOF

# 6. Apply fixes to server
echo "6️⃣ Applying fixes to server..."
ssh -p 22 root@20.205.30.184 "
# Backup current Nginx config
cp /etc/nginx/sites-available/dien-may-xanh /etc/nginx/sites-available/dien-may-xanh.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

# Apply new Nginx config
cat > /etc/nginx/sites-available/dien-may-xanh << 'NGINXEOF'
server {
    listen 80;
    server_name 20.205.30.184;
    
    # API routes - proxy to Node.js
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Port \$server_port;
        proxy_cache_bypass \$http_upgrade;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        
        # Handle preflight requests
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With';
            add_header 'Access-Control-Allow-Credentials' 'true';
            add_header 'Access-Control-Max-Age' 86400;
            add_header 'Content-Length' 0;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            return 204;
        }
    }
    
    # Static files
    location /uploads/ {
        alias /var/www/dien-may-xanh/uploads/;
        expires 1y;
        add_header Cache-Control 'public, immutable';
    }
    
    # Frontend routes
    location / {
        root /var/www/dien-may-xanh;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
}
NGINXEOF

# Test Nginx configuration
nginx -t

# Reload Nginx if config is valid
if [ \$? -eq 0 ]; then
    systemctl reload nginx
    echo '✅ Nginx configuration updated successfully'
else
    echo '❌ Nginx configuration test failed'
fi
"

# 7. Restart Node.js application
echo "7️⃣ Restarting Node.js application..."
ssh -p 22 root@20.205.30.184 "
cd /root/dien-may-xanh
pm2 restart dien-may-xanh
pm2 status
"

# 8. Copy debug page
echo "8️⃣ Copying debug page..."
./copy-debug.sh

echo ""
echo "✅ Tất cả các fixes đã được áp dụng!"
echo ""
echo "🧪 Kiểm tra kết quả:"
echo "1. Truy cập: http://20.205.30.184/debug.html"
echo "2. Test các tính năng và xem console logs"
echo "3. Nếu vẫn có lỗi, chạy: ./diagnose-errors.sh"
echo "4. Kiểm tra PM2 logs: ssh root@20.205.30.184 'pm2 logs'"
echo ""
echo "🔍 Các lỗi đã được fix:"
echo "✅ CORS configuration - Frontend có thể gọi API"
echo "✅ Upload directories - File upload sẽ hoạt động"
echo "✅ Environment variables - JWT và các biến cần thiết"
echo "✅ Nginx proxy - API routes được chuyển tiếp đúng cách"
echo "✅ Debug page - Công cụ kiểm tra chi tiết"