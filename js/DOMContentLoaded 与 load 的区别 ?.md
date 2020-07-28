DOMContentLoaded 与 load 的区别 ?
===
+ DOMContentLoaded事件触发时：仅当DOM解析完成后，不包括样式表，图片等资源。
+ onload 事件触发时,页面上所有的 DOM,样式表,脚本,图片等资源已经加载完毕。
  
那么也就是先DOMContentLoaded -> load,那么在Jquery中，使用
<pre>
  <code>
    (document).load(callback)监听的就是load事件。
  </code>
</pre>

带async的脚本一定会在load事件之前执行，可能会在DOMContentLoaded之前或之后执行。
+ 情况1： HTML 还没有被解析完的时候，async脚本已经加载完了，那么 HTML 停止解析，去执行脚本，脚本执行完毕后触发DOMContentLoaded事件
+ 情况2： HTML 解析完了之后，async脚本才加载完，然后再执行脚本，那么在HTML解析完毕、async脚本还没加载完的时候就触发DOMContentLoaded事件
  
如果 script 标签中包含 defer，那么这一块脚本将不会影响 HTML 文档的解析，而是等到HTML 解析完成后才会执行。而 DOMContentLoaded 只有在 defer 脚本执行结束后才会被触发。
+ 情况1：HTML还没解析完成时，defer脚本已经加载完毕，那么defer脚本将等待HTML解析完成后再执行。defer脚本执行完毕后触发DOMContentLoaded事件
+ 情况2：HTML解析完成时，defer脚本还没加载完毕，那么defer脚本继续加载，加载完成后直接执行，执行完毕后触发DOMContentLoaded事件

