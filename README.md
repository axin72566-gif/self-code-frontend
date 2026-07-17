# self-code-frontend（P0）

编码助手 Web 控制台：提交任务、订阅 SSE 事件流、取消运行。

对接后端：`self-code-backend` 的 `/api/v1/*`（见后端 `docs/api-p0.md`）。

## 开发

先启动后端（默认 `http://localhost:8123`），再：

```powershell
cd D:\code\self-code\self-code-frontend
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`。

Vite 已将 `/api` 代理到 `http://localhost:8123`，无需配置 CORS。

可选：`VITE_API_BASE` 指向其它 API 前缀（默认空字符串，走同源 `/api`）。

## 使用

1. 顶栏查看 health / API key 状态  
2. 填写 **Task**、服务器本地 **Workdir**  
3. 需要自动批准危险命令时勾选 **yes**  
4. **Start** 后查看 Event stream；可 **Cancel**  
5. 结束后查看 Changed files / Summary（取消或失败不会显示成功）

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发服务器（5173） |
| `npm run build` | 生产构建 |
| `npm run preview` | 预览构建产物 |
