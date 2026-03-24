# TeamTask Production-like Deployment Guide (Internal Network)

## 1. Server Recommendation

**Best Choice:** Linux (Ubuntu Server 22.04 LTS)

- Stable, secure, widely used for web apps
- Easier automation, updates, troubleshooting
- Node.js, Nginx, PostgreSQL, PM2 are Linux-friendly

## 2. Folder Structure on Server

```
/srv/teamtask/
├── backend/
├── frontend/
├── logs/
└── .env
```

## 3. PostgreSQL Setup

**Install PostgreSQL:**

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

**Create Database and User:**

```bash
sudo -u postgres psql
# In psql shell:
CREATE DATABASE teamtask;
CREATE USER teamtask_user WITH PASSWORD 'strongpassword';
GRANT ALL PRIVILEGES ON DATABASE teamtask TO teamtask_user;
\q
```

**Edit .env for Backend:**

```
DATABASE_URL="postgresql://teamtask_user:strongpassword@localhost:5432/teamtask"
JWT_SECRET="your_super_secret_key"
PORT=5000
```

## 4. Backend Deployment

**Install Node.js:**

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

**Copy backend code to /srv/teamtask/backend**

**Install dependencies:**

```bash
cd /srv/teamtask/backend
npm install
```

**Run Prisma migrations and seed:**

```bash
npx prisma migrate deploy
npm run seed
```

**Install PM2 (process manager):**

```bash
sudo npm install -g pm2
```

**Start backend with PM2:**

```bash
pm2 start server.js --name teamtask-backend
pm2 save
pm2 startup
```

## 5. Frontend Build and Hosting

**Copy frontend code to /srv/teamtask/frontend**

**Install dependencies and build:**

```bash
cd /srv/teamtask/frontend
npm install
npm run build
```

- Production files in `/srv/teamtask/frontend/dist`

## 6. Nginx Setup (Web Server & Reverse Proxy)

**Install Nginx:**

```bash
sudo apt install nginx
```

**Nginx config example:**
Edit `/etc/nginx/sites-available/teamtask`:

```
server {
    listen 80;
    server_name teamtask.local 192.168.1.100; # Replace with your server's IP

    root /srv/teamtask/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        try_files $uri /index.html;
    }
}
```

**Enable config:**

```bash
sudo ln -s /etc/nginx/sites-available/teamtask /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 7. Assign Local Domain (Optional)

- On each employee PC, add to `C:\Windows\System32\drivers\etc\hosts` (Windows) or `/etc/hosts` (Linux/Mac):
  ```
  192.168.1.100   teamtask.local
  ```
  (Replace with your server’s IP.)

## 8. Logs and Debugging

- **Backend logs:** PM2 handles logs. View with:
  ```bash
  pm2 logs teamtask-backend
  ```
- **Nginx logs:** `/var/log/nginx/access.log` and `error.log`
- **Frontend:** Static files, no logs needed.

## 9. Security Basics

- **Firewall:** Only allow ports 22 (SSH), 80 (HTTP), 5432 (Postgres, if needed internally only)
  ```bash
  sudo ufw allow 22
  sudo ufw allow 80
  sudo ufw deny 5432
  sudo ufw enable
  ```
- **Database:** Listen only on localhost (default). Never expose to public.
- **Backend:** Use strong JWT secret, keep .env private.
- **Nginx:** Can add basic auth if needed (see Nginx docs for `auth_basic`).

## 10. Scaling Later

- Move PostgreSQL to a dedicated server if needed.
- Use Docker for easier deployment and scaling.
- Add a load balancer if you need multiple backend/frontend servers.

## Summary Table

| Step               | Command/Action                       |
| ------------------ | ------------------------------------ |
| Install PostgreSQL | `sudo apt install postgresql`        |
| Create DB/User     | `CREATE DATABASE teamtask; ...`      |
| Install Node.js    | `sudo apt install -y nodejs`         |
| Backend setup      | `npm install`, `pm2 start server.js` |
| Frontend build     | `npm run build`                      |
| Nginx config       | See above                            |
| Firewall           | `sudo ufw allow 80`                  |
| Local domain       | Edit hosts file on each PC           |

---

If you need Windows Server or IIS instructions, let me know!
