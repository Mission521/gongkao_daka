# 公考打卡助手

这是一个基于 React + Supabase 的打卡网站，专为公考学习小组设计。支持用户注册登录、富文本打卡、公告发布、记录统计和 OCR 文字识别保存功能。

## 功能特性

- **用户系统**：注册、登录、权限管理（普通用户/管理员）。
- **每日打卡**：支持富文本内容输入和多图上传。
- **公告系统**：管理员发布公告，用户查看公告详情。
- **数据统计**：
  - 个人打卡记录查询。
  - 全员打卡统计表格。
- **OCR 识别**：上传图片自动识别文字，支持一键保存为打卡记录。
- **响应式设计**：完美适配桌面端和移动端。

## 技术栈

- **前端**：React 18, TypeScript, Tailwind CSS, Vite
- **后端**：Supabase (Auth, Database, Storage)
- **OCR**：Tesseract.js
- **状态管理**：Zustand
- **路由**：React Router (HashRouter for GitHub Pages compatibility)

## 本地开发

1. **安装依赖**

```bash
npm install
```

2. **配置环境变量**

在项目根目录创建 `.env` 文件，填入 Supabase 项目配置：

```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

3. **启动开发服务器**

```bash
npm run dev
```

4. **构建生产版本**

```bash
npm run build
```

## 部署到 GitHub Pages

1. 在 `vite.config.ts` 中配置 `base` 路径（如果部署在子路径）：
   ```ts
   export default defineConfig({
     base: '/repo-name/', // 替换为你的仓库名
     // ...
   })
   ```

2. 运行构建命令：
   ```bash
   npm run build
   ```

3. 将 `dist` 目录下的内容推送到 GitHub 仓库的 `gh-pages` 分支。

## 数据库模型

详细的数据库设计请参考 `.trae/documents/technical_architecture.md`。

## 注意事项

- **OCR 功能**：使用浏览器端识别，首次加载可能需要下载语言包，速度较慢，请耐心等待。
- **图片存储**：图片存储在 Supabase Storage 的 `clockin-images` bucket 中，请确保 RLS 策略配置正确。
