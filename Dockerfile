# Build Stage
FROM node:20-alpine as build-stage

WORKDIR /app

# 设置 npm 淘宝镜像，加快国内构建速度
RUN npm config set registry https://registry.npmmirror.com

COPY package*.json ./

RUN npm install

COPY . .

# 构建生产环境代码
RUN npm run build

# Production Stage
FROM nginx:stable-alpine as production-stage

# 复制构建产物到 Nginx 目录
COPY --from=build-stage /app/dist /usr/share/nginx/html

# 复制 Nginx 配置文件
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
