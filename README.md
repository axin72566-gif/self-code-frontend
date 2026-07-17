# self-code-frontend（P1 Session）

编码助手 Web 控制台：创建/恢复 session、多轮任务、计划/命令审批、SSE 事件、取消运行。

对接后端：`self-code-backend`（`docs/api-p1.md`）。

## 开发

先启动后端（默认 `http://localhost:8123`），再：

```powershell
cd D:\code\self-code\self-code-frontend
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`。Vite 将 `/api` 代理到后端。

## 使用

1. 填写 **Workdir** + **Task**；首次 Start 创建 session  
2. 默认 `approvalLevel=confirm`：先审批计划，危险/需复核命令也会弹出 Approve/Reject  
3. 勾选 **auto** 跳过计划与命令审批（等价 `yes=true`）  
4. 有文件改动时，后端会跑探测验证（mvn/npm），Event stream / Summary 可见 `verify`  
5. **Resume** / 刷新自动恢复 `localStorage` 中的 `selfcode.sessionId`  
6. **New Session** 清空当前会话  

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发服务器（5173） |
| `npm run build` | 生产构建 |
| `npm run preview` | 预览构建产物 |
