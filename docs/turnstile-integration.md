# 二开分站接入 Cloudflare Turnstile 人机验证指南

平台已对分站登录（`POST /api/dist/user/login`）和注册（`POST /api/dist/user/register`）接口强制开启 Cloudflare Turnstile 人机验证。本仓库已内置完整实现（见 [`src/components/TurnstileWidget.jsx`](../src/components/TurnstileWidget.jsx)），如果你基于本仓库做了二次开发或使用了其他前端框架，可按本文档同步改造。

---

## 1. 后端接口变更

### 1.1 登录与注册传参

以下接口必须通过 **URL Query 参数 `?turnstile=<token>`** 携带一次性验证凭证（注意：**不是放在 JSON Body 里**）：

- `POST /api/dist/user/register?turnstile=<token>`
- `POST /api/dist/user/login?turnstile=<token>`

其他接口（OAuth 登录、退出登录、`/api/dist/user/email-verification`、已登录后的业务接口）不受影响。

校验失败时返回标准 JSON（HTTP 200）：

- `{"success": false, "message": "Turnstile token 为空"}`
- `{"success": false, "message": "Turnstile 校验失败，请刷新重试！"}`
- `{"success": false, "message": "Turnstile 校验服务暂不可用，请刷新重试！"}`

### 1.2 配置字段：`GET /api/dist/site/info`

`data` 中新增 3 个字段：

```json
{
  "turnstile_check": true,
  "turnstile_site_key": "0x4AAAAAAA...",
  "turnstile_embed_url": "https://subrouter.ai/api/turnstile/embed"
}
```

- 当 `Boolean(site?.turnstile_check && site?.turnstile_site_key)` 为 `true` 时，登录页与注册页需展示人机验证组件。
- `turnstile_embed_url` 为空字符串 `""`（`*.subrouter.ai` 子域名或本地调试）：前端**直连加载** Cloudflare Turnstile 脚本。
- `turnstile_embed_url` 非空（第三方自定义域名，如 `https://yourdomain.com`）：前端必须使用 **主站 iframe 桥接模式**，否则第三方域名直接加载平台 Site Key 会触发 Cloudflare `Error 110200 (Domain not allowed)`。

---

## 2. iframe 桥接模式协议（自定义域名）

1. **iframe 地址**：
   ```text
   {turnstile_embed_url}?origin={encodeURIComponent(window.location.origin)}&theme={auto|light|dark}
   ```
   - `origin` 必须为纯源地址（`https://已绑定分站域名`，无路径/无尾部斜杠；本地联调仅允许 `http://localhost:<port>` 或 `http://127.0.0.1:<port>`）。
   - 建议 iframe 尺寸：`width: 308px; height: 72px; max-width: 100%; border: 0; background: transparent;`（`scrolling="no"`）。
   - 平台仅对**已绑定且处于启用状态**的分站自定义域名放行并返回 `Content-Security-Policy: frame-ancestors <origin>`，未授权域名返回 `403`。

2. **桥接页 → 父页面 `postMessage` 事件**（务必校验 `event.origin === embedOrigin` 且 `event.source === iframe.contentWindow`）：
   - `{ type: "subrouter:turnstile:ready" }`：桥接页已初始化完成
   - `{ type: "subrouter:turnstile:verify", token: "<token>" }`：验证通过，拿到一次性 token
   - `{ type: "subrouter:turnstile:expire" }`：token 过期，清空本地 token
   - `{ type: "subrouter:turnstile:error", code: "<string>" }`：验证或脚本加载失败，清空本地 token 并提示用户

3. **父页面 → 桥接页 `postMessage` 重置指令**（Turnstile token 仅能使用一次，每次登录/注册失败后必须重置）：
   ```js
   iframe.contentWindow.postMessage(
     { type: "subrouter:turnstile:reset" },
     new URL(turnstile_embed_url).origin,
   );
   ```
   若收到重置时 iframe 尚未 `ready`，直接重新挂载 iframe（更新 `key` 或重设 `src`）。

---

## 3. 代码参考

- **React（官方实现）**：直接参考或复制本仓库以下文件变更：
  - [`src/components/TurnstileWidget.jsx`](../src/components/TurnstileWidget.jsx)
  - [`src/api.js`](../src/api.js)（`login` / `register` 追加 `{ params: { turnstile: turnstileToken } }`）
  - [`src/context/AuthContext.jsx`](../src/context/AuthContext.jsx)（透传 `turnstileToken`）
  - [`src/pages/Login.jsx`](../src/pages/Login.jsx) & [`src/pages/Register.jsx`](../src/pages/Register.jsx)（渲染组件、提交校验、失败自动重置）
  - [`src/i18n/locales/zh.json`](../src/i18n/locales/zh.json) & [`src/i18n/locales/en.json`](../src/i18n/locales/en.json)（`turnstile.checking`、`turnstile.failed`）

- **原生 JS / 其他框架**：按第 2 节协议在 `embedUrl` 非空时挂载 `<iframe src="...">` 并监听 `message`，在 `embedUrl` 为空时动态加载 `https://challenges.cloudflare.com/turnstile/v0/api.js?onload=<cb>&render=explicit` 并调用 `window.turnstile.render(...)`；登录/注册请求改为 `POST /api/dist/user/login?turnstile=${encodeURIComponent(token)}` 即可。

---

## 4. CSP 与常见问题排查

- **自定义 CSP**：若站点反代或页面 `<meta>` 配置了严格 `Content-Security-Policy`，需放行：
  ```http
  script-src https://challenges.cloudflare.com;
  frame-src https://subrouter.ai https://challenges.cloudflare.com;
  ```
- **`Turnstile token 为空`**：确认 `turnstile` 位于 URL query 参数而非 JSON body，且前端已刷新 `/api/dist/site/info`（未被旧 `localStorage` 缓存覆盖）。
- **第一次输错密码，第二次报 `Turnstile 校验失败`**：token 为单次有效，需在请求未成功时清空本地 token 并触发 reset。
- **自定义域名 iframe 返回 `403`**：确认 `origin` 对应的域名与后台绑定的分站自定义域名完全一致（含是否带 `www.`）且分站处于启用状态。

快速自检命令（替换 `yourdomain.com`）：

```bash
curl -sS https://yourdomain.com/api/dist/site/info
curl -sS -D - -o /dev/null "https://subrouter.ai/api/turnstile/embed?origin=https://yourdomain.com"
```
