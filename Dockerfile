# SEO Optimizer — Dockerfile (© 2026 kuveylan, MIT)
# Web arayüzü + CLI aynı container'da çalışır (Puppeteer/Chromium dahil)

FROM node:20-slim

# Puppeteer Chromium için gerekli sistem bağımlılıkları
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    libasound2 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Puppeteer'a sistemdeki Chromium'u kullanmasını söyle (tekrar indirmesin)
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

WORKDIR /app

# Önce bağımlılıklar (cache katmanı için)
COPY package.json package-lock.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Uygulama dosyaları
COPY . .

# Web arayüzü portu
EXPOSE 3000

# Varsayılan: web arayüzünü başlat
CMD ["node", "src/server.js"]
