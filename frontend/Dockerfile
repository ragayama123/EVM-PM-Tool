# ビルドステージ
FROM node:20-alpine AS builder

WORKDIR /app

# 依存関係をインストール
COPY package*.json ./
RUN npm ci

# ソースをコピーしてビルド
COPY . .
RUN npm run build

# 本番ステージ
FROM nginx:alpine

# ビルド成果物をコピー
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx設定をコピー
COPY nginx.conf /etc/nginx/conf.d/default.conf

# ポート公開
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
