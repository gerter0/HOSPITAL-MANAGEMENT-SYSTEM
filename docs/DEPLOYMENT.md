# Deployment Guide

## Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database backups enabled
- [ ] SSL/TLS certificates obtained
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Load testing passed
- [ ] Monitoring configured
- [ ] Incident response plan ready

---

## Local Development to Production

### Phase 1: Preparation

#### 1. Security Hardening
```bash
# Update all dependencies
npm audit fix

# Update Node.js
node --version  # Should be 16+

# Create production .env
cp backend/.env.example backend/.env
# Edit ALL values in production .env
```

#### 2. Environment Configuration
```env
# production .env

# Server
PORT=5000
NODE_ENV=production

# Database (Production DB)
DB_HOST=prod-db-server.example.com
DB_PORT=3306
DB_USER=hospital_app_prod
DB_PASSWORD=very-secure-password-64-chars-minimum
DB_NAME=hospital_management_system_prod
DB_POOL_SIZE=20

# JWT Security
JWT_SECRET=generate-new-secure-key-min-64-characters-use-crypto
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Encryption
ENCRYPTION_KEY=generate-new-32-char-key-$(openssl rand -hex 16)

# Security
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=15
SESSION_TIMEOUT=30
ENABLE_2FA=true

# CORS
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Email (SendGrid/AWS SES)
EMAIL_SERVICE=sendgrid
EMAIL_FROM=noreply@hospital.com
EMAIL_API_KEY=your-sendgrid-key

# Logging
LOG_LEVEL=warn
LOG_FORMAT=json
```

---

## Deployment Options

### Option 1: Traditional VPS (Linux Server)

#### Setup Server
```bash
# SSH into server
ssh root@your-server-ip

# Update system
apt-get update && apt-get upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL
apt-get install -y mysql-server

# Install Nginx (reverse proxy)
apt-get install -y nginx

# Install PM2 (process manager)
npm install -g pm2
```

#### Setup Application
```bash
# Create app directory
mkdir -p /var/www/hospital-management
cd /var/www/hospital-management

# Clone repository
git clone your-repo-url .

# Install backend dependencies
cd backend
npm install --production

# Setup database
mysql -u root -p hospital_management_system < ../database/schema.sql

# Start backend with PM2
pm2 start server.js --name "hospital-api"
pm2 save
pm2 startup

# Build frontend
cd ../frontend
npm install
npm run build

# Move frontend to web root
cp -r dist/* /var/www/html/
```

#### Configure Nginx
```nginx
# /etc/nginx/sites-available/hospital-management

upstream hospital_backend {
    server localhost:5000;
    keepalive 32;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API proxy
    location /api/ {
        proxy_pass http://hospital_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Enable SSL Certificate
```bash
# Install Certbot
apt-get install -y certbot python3-certbot-nginx

# Get certificate
certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
systemctl enable certbot.timer
systemctl start certbot.timer
```

#### Enable Nginx
```bash
# Test configuration
nginx -t

# Enable and start
systemctl enable nginx
systemctl start nginx
```

---

### Option 2: Docker Deployment

#### Dockerfile (Backend)
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/src ./src
COPY backend/server.js ./

EXPOSE 5000

CMD ["node", "server.js"]
```

#### docker-compose.yml
```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: hospital_management_system
      MYSQL_USER: hospital_app
      MYSQL_PASSWORD: secure_password
    volumes:
      - mysql_data:/var/lib/mysql
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    ports:
      - "3306:3306"
    networks:
      - hospital-network

  backend:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      DB_HOST: mysql
      DB_PORT: 3306
      DB_USER: hospital_app
      DB_PASSWORD: secure_password
      JWT_SECRET: ${JWT_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
    ports:
      - "5000:5000"
    depends_on:
      - mysql
    networks:
      - hospital-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./frontend/dist:/usr/share/nginx/html:ro
    depends_on:
      - backend
    networks:
      - hospital-network

volumes:
  mysql_data:

networks:
  hospital-network:
```

#### Deploy with Docker
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Backup database
docker exec hospital-mysql mysqldump -u hospital_app -ppassword hospital_management_system > backup.sql
```

---

### Option 3: Cloud Deployment (AWS)

#### RDS Database
```bash
# Create RDS MySQL instance
aws rds create-db-instance \
  --db-instance-identifier hospital-db \
  --db-instance-class db.t3.micro \
  --engine mysql \
  --master-username hospital_app \
  --master-user-password "your-secure-password" \
  --allocated-storage 100 \
  --backup-retention-period 30
```

#### EC2 Backend
```bash
# Launch EC2 instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.small \
  --key-name my-key-pair \
  --security-groups hospital-api-sg

# SSH into instance and setup (see VPS section above)
```

#### S3 + CloudFront Frontend
```bash
# Create S3 bucket
aws s3 mb s3://hospital-app-frontend

# Upload frontend build
aws s3 sync frontend/dist s3://hospital-app-frontend --delete

# Create CloudFront distribution
# Point to S3 bucket
```

---

## Monitoring & Maintenance

### Health Checks

#### Backend Health Endpoint
```bash
# Every 30 seconds
curl http://localhost:5000/api/v1/health
```

#### Database Health
```bash
# Monitor connection pool
SHOW PROCESSLIST;
SHOW VARIABLES LIKE 'max_connections';
```

### Logging

#### Application Logs
```bash
# PM2 logs
pm2 logs hospital-api

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Application error log
tail -f /var/log/hospital-app/error.log
```

### Backups

#### Database Backup
```bash
# Daily backup
0 2 * * * mysqldump -u hospital_app -p hospital_management_system | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz

# Setup with cron
crontab -e
```

#### File Backup
```bash
# Backup configuration files
tar -czf /backups/config_$(date +%Y%m%d).tar.gz /etc/hospital/

# Backup encryption keys
cp /etc/hospital/.env /backups/.env_$(date +%Y%m%d)
```

---

## Performance Optimization

### Database
```sql
-- Add indexes
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_patient_user ON patients(user_id);
CREATE INDEX idx_doctor_user ON doctors(user_id);
CREATE INDEX idx_appointment_date ON appointments(appointment_date);
CREATE INDEX idx_medical_record_patient ON medical_records(patient_id);

-- Check slow queries
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;
```

### Backend
```javascript
// Enable compression
app.use(compression());

// Enable caching headers
app.use(express.static('public', { maxAge: '1d' }));
```

### Frontend
```javascript
// Lazy loading
const DoctorDashboard = lazy(() => import('./pages/DoctorDashboard'));

// Code splitting
import { defineConfig } from 'vite';
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react': ['react', 'react-dom']
        }
      }
    }
  }
});
```

---

## Disaster Recovery

### Recovery Plan

#### Database Recovery
```bash
# Restore from backup
mysql -u hospital_app -p hospital_management_system < backup.sql

# Verify data
SELECT COUNT(*) FROM users;
```

#### Application Recovery
```bash
# Rollback to previous version
git checkout previous-version
npm install
pm2 restart hospital-api
```

### Failover Setup
```bash
# Primary server: Master
# Secondary server: Slave (replication)

# MySQL replication setup
CHANGE MASTER TO
MASTER_HOST='primary-server',
MASTER_USER='replication_user',
MASTER_PASSWORD='password',
MASTER_LOG_FILE='mysql-bin.000001',
MASTER_LOG_POS=154;

START SLAVE;
SHOW SLAVE STATUS;
```

---

## Production Checklist

- [ ] HTTPS enabled on all endpoints
- [ ] Database encryption enabled
- [ ] Automated backups running
- [ ] Monitoring and alerting active
- [ ] SSL certificate auto-renewal configured
- [ ] Firewall rules configured
- [ ] DDoS protection enabled
- [ ] WAF (Web Application Firewall) active
- [ ] Rate limiting configured
- [ ] Logging centralized
- [ ] 2FA enabled for admins
- [ ] Audit logs verified
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Incident response plan ready

---

## Troubleshooting Production Issues

### Application Won't Start
```bash
# Check logs
pm2 logs hospital-api

# Verify environment variables
echo $DATABASE_URL

# Check port availability
lsof -i :5000

# Restart
pm2 restart hospital-api
```

### Database Connection Issues
```bash
# Test connection
mysql -h prod-db.example.com -u hospital_app -p

# Check connection pool
SHOW PROCESSLIST;

# Restart MySQL connection pool
pm2 restart hospital-api
```

### High Memory Usage
```bash
# Check memory
pm2 monit

# Analyze heap
node --inspect server.js

# Enable clustering
pm2 start server.js -i max
```

### SSL Certificate Renewal Failed
```bash
# Manual renewal
certbot renew --force-renewal

# Check certificate
ssl-cert-check -c /etc/letsencrypt/live/yourdomain.com/fullchain.pem
```

---

**Version**: 1.0.0  
**Last Updated**: April 1, 2026
