# 阿里云 ECS 部署方案文档

## 1. 服务器选型与配置

### 1.1 服务器购买建议
由于本项目为静态前端网站（React SPA），后端使用 Supabase（BaaS），因此对服务器资源要求较低。

*   **实例规格**: ecs.t6-c1m2.large (2核 2G) 或 ecs.t6-c1m1.large (2核 4G) 即可满足日常访问。如果是突发流量较大，建议选择 **计算型 c6** 或 **通用型 g6**。
*   **操作系统**: 推荐 **Ubuntu 22.04 LTS** 或 **Alibaba Cloud Linux 3** (兼容 CentOS)。
*   **地域选择**:
    *   **华东1（杭州）** 或 **华东2（上海）**：通常网络覆盖最好。
    *   **华北2（北京）**：如果用户主要在北方。
*   **带宽**: 推荐 **按量付费** (50Mbps - 100Mbps)，既省钱又能应对突发加载（如OCR语言包下载）。

### 1.2 安全组配置 (Security Group)
在阿里云控制台 -> 网络与安全 -> 安全组中，添加入方向规则：

| 端口范围 | 协议 | 授权对象 | 描述 |
| :--- | :--- | :--- | :--- |
| 22/22 | TCP | 0.0.0.0/0 (或仅限你的IP) | SSH 远程连接 |
| 80/80 | TCP | 0.0.0.0/0 | HTTP Web 服务 |
| 443/443 | TCP | 0.0.0.0/0 | HTTPS 加密传输 |

---

## 2. 环境搭建

登录服务器后，执行以下命令安装 Docker 和 Docker Compose。

### 2.1 安装 Docker (Ubuntu 示例)

```bash
# 更新源
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# 添加 Docker GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 添加仓库
echo \
  "deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  \"$(. /etc/os-release && echo \"$VERSION_CODENAME\")\" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 启动并设置开机自启
sudo systemctl start docker
sudo systemctl enable docker
```

### 2.2 配置 Docker 镜像加速 (解决国内拉取慢)
阿里云提供了容器镜像服务（ACR），可以获得专属加速器地址。或者使用公共镜像源。

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": ["https://docker.m.daocloud.io", "https://dockerproxy.com"]
}
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker
```

---

## 3. 部署流程

我们采用 **Docker** 进行容器化部署，确保环境一致性。

### 3.1 代码获取
由于 GitHub 在国内访问较慢，建议以下两种方式之一：
1. **本地构建镜像** -> 推送到阿里云 ACR -> 服务器拉取 (推荐，最快最稳)。
2. **使用 Gitee 镜像**：将 GitHub 仓库导入 Gitee，在服务器上 `git clone` Gitee 的地址。
3. **本地上传**：使用 `scp` 将项目代码压缩包上传到服务器。

这里演示 **本地上传/Git Clone** + **服务器构建** 的方式。

### 3.2 首次部署

1. **上传代码到服务器** (假设路径为 `/opt/gongkao_daka`)
   ```bash
   # 在服务器执行
   mkdir -p /opt/gongkao_daka
   cd /opt/gongkao_daka
   # git clone ... 或 上传文件
   ```

2. **创建 .env 环境变量**
   在服务器项目根目录创建 `.env` 文件，填入 Supabase 配置（生产环境配置）：
   ```bash
   VITE_SUPABASE_URL=your_production_supabase_url
   VITE_SUPABASE_ANON_KEY=your_production_anon_key
   ```

3. **构建并启动容器**
   ```bash
   # 构建镜像 (使用项目中的 Dockerfile)
   # 注意：Dockerfile 中已配置 npm 淘宝镜像加速
   docker compose up -d --build
   ```

   *如果还没有 docker-compose.yml，请在根目录创建：*
   ```yaml
   version: '3'
   services:
     web:
       build: .
       ports:
         - "80:80"
       restart: always
       container_name: gongkao_web
   ```

---

## 4. 域名与 SSL 配置 (HTTPS)

为了安全和体验，强烈建议配置 HTTPS。

1. **域名解析**：在阿里云域名控制台，将域名 A 记录指向服务器公网 IP。
2. **申请 SSL 证书**：
   *   方式 A：在阿里云 SSL 证书控制台申请免费 DV 证书，下载 Nginx 版本证书，挂载到 Docker 容器中。
   *   方式 B：使用 Certbot 自动签发 (需要修改 Nginx 配置以验证)。

### 推荐：使用 Nginx 容器挂载证书

1. 将证书文件 (xxx.pem, xxx.key) 上传到服务器 `/opt/gongkao_daka/cert/` 目录。
2. 修改 `nginx/default.conf` 增加 SSL 配置：

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/cert/xxx.pem;
    ssl_certificate_key /etc/nginx/cert/xxx.key;
    
    # ... 其他 gzip 和 location 配置同 default.conf ...
}

server {
    listen 80;
    server_name yourdomain.com;
    rewrite ^(.*)$ https://$host$1 permanent; # 强制跳转 HTTPS
}
```

3. 修改 `docker-compose.yml` 挂载证书目录：
```yaml
services:
  web:
    build: .
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./cert:/etc/nginx/cert
    restart: always
```

---

## 5. 自动化部署 (CI/CD)

为了解决 GitHub 访问慢的问题，建议使用 **GitHub Actions** 构建镜像并推送到 **阿里云容器镜像服务 (ACR)**。

1. 在阿里云开通容器镜像服务 (ACR) 个人版（免费）。
2. 创建命名空间和镜像仓库。
3. 在 GitHub 仓库设置 Secrets: `ALIYUN_REGISTRY_USER`, `ALIYUN_REGISTRY_PASSWORD`.
4. 使用 `.github/workflows/deploy.yml` (见项目文件) 实现自动构建和推送。
5. 服务器端安装 Watchtower 自动更新容器，或者使用 Webhook 触发脚本 `docker compose pull && docker compose up -d`。

## 6. 监控与维护

*   **日志查看**: `docker logs -f gongkao_web`
*   **性能监控**: 阿里云控制台自带 "云监控"，可设置 CPU/内存 80% 报警。
*   **Nginx 状态**: 可以开启 Nginx Stub Status 模块监控并发连接数。
