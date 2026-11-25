#!/usr/bin/env bash
set -e

echo '== extract =='
mkdir -p /root/zuodao
python3 -c "import zipfile; zipfile.ZipFile('/tmp/zuodao-deploy.zip').extractall('/root/zuodao')"

echo '== install backend deps =='
cd /root/zuodao/server
npm install --omit=dev --no-audit --no-fund

echo '== pm2 restart =='
pm2 delete zuodao-api 2>/dev/null || true
pm2 delete zuodao-web 2>/dev/null || true
pm2 start server.js --name zuodao-api
cd /root/zuodao
PORT=80 API_PORT=3001 pm2 start web/deploy/server.js --name zuodao-web
pm2 save

echo '== status =='
pm2 list
ss -lntp | grep -E ':80 |:3001 ' || true
