# Stock Advisor - Hetzner Deployment Guide

This guide will help you deploy Stock Advisor on your Hetzner server with the domain `stock-advisor.services`.

## Prerequisites

- Hetzner Cloud server (Ubuntu 22.04 LTS recommended)
- Domain `stock-advisor.services` pointing to your server IP
- SSH access to your server

## Step 1: Server Setup

### 1.1 Connect to your Hetzner server

```bash
ssh root@your-server-ip
```

### 1.2 Update system packages

```bash
apt update && apt upgrade -y
```

### 1.3 Install Node.js (v20 LTS)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version  # Should show v20.x.x
npm --version
```

### 1.4 Install Nginx

```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

### 1.5 Install Certbot for SSL

```bash
apt install -y certbot python3-certbot-nginx
```

### 1.6 Install PM2 (process manager)

```bash
npm install -g pm2
```

## Step 2: Clone and Setup Application

### 2.1 Clone the repository

```bash
cd /var/www
git clone https://github.com/briculinos/stock-advisor.git
cd stock-advisor
```

### 2.2 Setup Backend

```bash
cd backend
npm install

# Create production environment file
cat > .env << 'ENVEOF'
PORT=3001
NODE_ENV=production

# API Keys
OPENAI_API_KEY=your_openai_api_key_here
BRAVE_API_KEY=your_brave_api_key_here

# JWT Secret - IMPORTANT: Generate a secure secret
JWT_SECRET=your_secure_random_jwt_secret_here

# Email Whitelist - Add your allowed emails
WHITELISTED_EMAILS=your-email@example.com,admin@stock-advisor.services

# CORS - Add your domain
ALLOWED_ORIGINS=https://stock-advisor.services,https://www.stock-advisor.services
ENVEOF

# Generate a secure JWT secret
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
# Copy the output and update JWT_SECRET in .env file

# Edit .env to add your actual values
nano .env
```

### 2.3 Setup Frontend

```bash
cd ../frontend
npm install

# Create production environment file
cat > .env.production << 'ENVEOF'
REACT_APP_API_URL=https://stock-advisor.services/api
ENVEOF

# Build the frontend
npm run build
```

## Step 3: Configure Email Whitelist

Choose one of these methods:

### Method A: Environment Variable (Recommended for production)

Already configured in `.env` file above with `WHITELISTED_EMAILS`

### Method B: JSON File

```bash
cd ../backend
mkdir -p data
cat > data/email-whitelist.json << 'JSONEOF'
[
  "your-email@example.com",
  "admin@stock-advisor.services",
  "user1@example.com"
]
JSONEOF
```

## Step 4: Setup PM2 to Run Backend

```bash
cd /var/www/stock-advisor/backend

# Start backend with PM2
pm2 start npm --name "stock-advisor-backend" -- run dev
pm2 save
pm2 startup
# Follow the instructions from the output
```

## Step 5: Configure Nginx

### 5.1 Create Nginx configuration

```bash
cat > /etc/nginx/sites-available/stock-advisor << 'NGINXEOF'
server {
    listen 80;
    server_name stock-advisor.services www.stock-advisor.services;

    # Frontend - Serve React build
    root /var/www/stock-advisor/frontend/build;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3001/health;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINXEOF

# Enable the site
ln -s /etc/nginx/sites-available/stock-advisor /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default  # Remove default site

# Test configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

## Step 6: Setup SSL with Let's Encrypt

```bash
certbot --nginx -d stock-advisor.services -d www.stock-advisor.services

# Follow the prompts:
# - Enter your email
# - Agree to terms
# - Choose whether to redirect HTTP to HTTPS (recommended: yes)

# Certbot will automatically:
# - Obtain SSL certificate
# - Configure Nginx for HTTPS
# - Setup auto-renewal
```

## Step 7: Setup Firewall

```bash
# Allow SSH, HTTP, and HTTPS
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status
```

## Step 8: Verify Deployment

Visit your site:
- https://stock-advisor.services

Try to register with an email:
- ✅ Email in whitelist → Registration succeeds
- ❌ Email not in whitelist → Error message shown

Check backend logs:
```bash
pm2 logs stock-advisor-backend
```

Check Nginx logs:
```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## Managing the Application

### Update the application

```bash
cd /var/www/stock-advisor
git pull origin master

# Update backend
cd backend
npm install
pm2 restart stock-advisor-backend

# Update frontend
cd ../frontend
npm install
npm run build
systemctl reload nginx
```

### PM2 Management

```bash
# View all processes
pm2 list

# View logs
pm2 logs stock-advisor-backend

# Restart backend
pm2 restart stock-advisor-backend

# Stop backend
pm2 stop stock-advisor-backend

# Monitor
pm2 monit
```

### Add/Remove Whitelisted Emails

#### Method 1: Environment Variable
```bash
cd /var/www/stock-advisor/backend
nano .env
# Update WHITELISTED_EMAILS line
pm2 restart stock-advisor-backend
```

#### Method 2: JSON File
```bash
cd /var/www/stock-advisor/backend
nano data/email-whitelist.json
pm2 restart stock-advisor-backend
```

## Security Best Practices

1. **JWT Secret**: Use a strong, randomly generated secret
2. **API Keys**: Never commit API keys to git
3. **Firewall**: Only allow necessary ports
4. **Updates**: Regularly update system packages
5. **Backups**: Setup automated backups of the data directory
6. **Monitoring**: Setup uptime monitoring (UptimeRobot, etc.)

## Backup User Data

```bash
# Backup user data
cd /var/www/stock-advisor/backend/data
tar -czf ~/stock-advisor-backup-$(date +%Y%m%d).tar.gz users.json auth-logs.json email-whitelist.json

# Restore from backup
cd /var/www/stock-advisor/backend/data
tar -xzf ~/stock-advisor-backup-YYYYMMDD.tar.gz
pm2 restart stock-advisor-backend
```

## Troubleshooting

### Backend not starting
```bash
pm2 logs stock-advisor-backend --lines 50
cd /var/www/stock-advisor/backend
npm run dev  # Run directly to see errors
```

### Frontend not loading
```bash
# Check Nginx logs
tail -f /var/log/nginx/error.log

# Rebuild frontend
cd /var/www/stock-advisor/frontend
rm -rf build
npm run build
```

### Can't register with whitelisted email
```bash
# Check backend logs
pm2 logs stock-advisor-backend

# Verify whitelist is loaded
cd /var/www/stock-advisor/backend
cat .env | grep WHITELISTED_EMAILS
```

### SSL certificate issues
```bash
# Check certificate status
certbot certificates

# Renew manually
certbot renew --dry-run
certbot renew
```

## Performance Optimization

### Enable PM2 cluster mode
```bash
pm2 delete stock-advisor-backend
pm2 start npm --name "stock-advisor-backend" -i max -- run dev
pm2 save
```

### Add Redis for sessions (optional)
```bash
apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server
```

## Monitoring

### Setup PM2 monitoring
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Monitor server resources
```bash
htop
df -h
free -h
```

---

## Quick Reference

- **Application**: `/var/www/stock-advisor`
- **Backend logs**: `pm2 logs stock-advisor-backend`
- **Nginx config**: `/etc/nginx/sites-available/stock-advisor`
- **SSL certs**: `/etc/letsencrypt/live/stock-advisor.services/`
- **Data directory**: `/var/www/stock-advisor/backend/data/`

For issues, check GitHub: https://github.com/briculinos/stock-advisor
