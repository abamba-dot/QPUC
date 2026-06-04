# Déploiement Ubuntu — QPUC

Ce guide cible le VPS `ubuntu@51.38.187.235` et le domaine `qpuc.pro`.

## 1. DNS OVH

Dans la zone DNS OVH, remplacer les deux entrées suivantes :

```text
@     A    51.38.187.235
www   A    51.38.187.235
```

Supprimer ou modifier les anciennes entrées `A` qui pointent vers `213.186.33.5`.

## 2. Préparer le VPS

```bash
ssh ubuntu@51.38.187.235
sudo apt update
sudo apt install -y git nginx curl ca-certificates
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

## 3. Cloner le projet

```bash
cd /var/www
sudo git clone https://github.com/abamba-dot/QPUC.git qpuc
sudo chown -R ubuntu:ubuntu /var/www/qpuc
cd /var/www/qpuc
npm ci --omit=dev
cp .env.example .env
```

## 4. Lancer avec PM2

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd
```

Exécuter ensuite la commande affichée par `pm2 startup`.

Vérifier :

```bash
curl http://127.0.0.1:3001/health
```

## 5. Configurer Nginx

```bash
sudo cp deploy/nginx-qpuc.conf /etc/nginx/sites-available/qpuc
sudo ln -s /etc/nginx/sites-available/qpuc /etc/nginx/sites-enabled/qpuc
sudo nginx -t
sudo systemctl reload nginx
```

## 6. HTTPS avec Let's Encrypt

Attendre que le DNS pointe bien vers le VPS, puis :

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d qpuc.pro -d www.qpuc.pro
sudo systemctl reload nginx
```

## 7. Mise à jour après un push GitHub

```bash
ssh ubuntu@51.38.187.235
cd /var/www/qpuc
git pull
npm ci --omit=dev
pm2 restart qpuc
```

## 8. Commandes utiles

```bash
pm2 status
pm2 logs qpuc
pm2 restart qpuc
sudo nginx -t
sudo systemctl reload nginx
curl https://qpuc.pro/health
```
