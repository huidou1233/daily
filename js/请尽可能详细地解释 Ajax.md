请尽可能详细地解释 Ajax。
 ====
Ajax（asynchronous JavaScript and XML）是使用客户端上的许多 Web 技术，创建异步 Web 应用的一种 Web 开发技术。借助 Ajax，Web 应用可以异步（在后台）向服务器发送数据和从服务器检索数据，而不会干扰现有页面的显示和行为。通过将数据交换层与表示层分离，Ajax 允许网页和扩展 Web 应用程序动态更改内容，而无需重新加载整个页面。实际上，现在通常将 XML 替换为 JSON，因为 JavaScript 对 JSON 有原生支持优势。

### 使用 Ajax 的优缺点分别是什么？

#### 优点
  + 交互性更好。来自服务器的新内容可以动态更改，无需重新加载整个页面。
  + 减少与服务器的连接，因为脚本和样式只需要被请求一次。
  + 状态可以维护在一个页面上。JavaScript 变量和 DOM 状态将得到保持，因为主容器页面未被重新加载
  + 基本上包括大部分 SPA 的优点。
#### 缺点
  + 动态网页很难收藏。
  + 如果 JavaScript 已在浏览器中被禁用，则不起作用。
  + 有些网络爬虫不执行 JavaScript，也不会看到 JavaScript 加载的内容。
  + 基本上包括大部分 SPA 的缺点。