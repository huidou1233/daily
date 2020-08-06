# CSRF 攻击

## 什么是 CSRF 攻击？

CSRF 英文全称是 Cross-site request forgery，所以又称为“跨站请求伪造”，是指黑客引诱用户打开黑客的网站，在黑客的网站中，利用用户的登录状态发起的跨站请求。简单来讲，「CSRF 攻击就是黑客利用了用户的登录状态，并通过第三方的站点来做一些坏事。」

一般的情况下，点开一个诱导你的链接，黑客会在你不知情的时候做哪些事情呢

1. 自动发起 Get 请求
   黑客网页里面可能有一段这样的代码 👇
   <pre>
    <code>
        <img src="http://bank.example/withdraw?amount=10000&for=hacker" /> 
    </code>
   </pre>

   在受害者访问含有这个 img 的页面后，浏览器会自动向http://bank.example/withdraw?account=xiaoming&amount=10000&for=hacker发出一次HTTP请求。
   bank.example 就会收到包含受害者登录信息的一次跨域请求。

2. 自动发起 POST 请求
   黑客网页中有一个表单，自动提交的表单 👇

   ```javascript
      <form action="http://bank.example/withdraw" method=POST>
        <input type="hidden" name="account" value="xiaoming" />
        <input type="hidden" name="amount" value="10000" />
        <input type="hidden" name="for" value="hacker" />
      </form>
      <script> document.forms[0].submit(); </script>
      ```

   访问该页面后，表单会自动提交，相当于模拟用户完成了一次POST操作。

   同样也会携带相应的用户 cookie 信息，让服务器误以为是一个正常的用户在操作，让各种恶意的操作变为可能。
   ```

3. 引诱用户点击链接
这种需要诱导用户去点击链接才会触发，这类的情况比如在论坛中发布照片，照片中嵌入了恶意链接，或者是以广告的形式去诱导，比如：

```javascript
  <a href="http://test.com/csrf/withdraw.php?amount=1000&for=hacker" taget="_blank">
    重磅消息！！！
  <a/>
```
点击后，自动发送 get 请求，接下来和自动发 GET 请求部分同理。

以上三种情况，就是CSRF攻击原理，跟XSS对比的话，CSRF攻击并不需要将恶意代码注入HTML中，而是跳转新的页面，利用「服务器的验证漏洞」和「用户之前的登录状态」来模拟用户进行操作

## 「防护策略」
其实我们可以想到，黑客只能借助受害者的**cookie**骗取服务器的信任，但是黑客并不能凭借拿到「cookie」，也看不到 「cookie」的内容。另外，对于服务器返回的结果，由于浏览器「同源策略」的限制，黑客也无法进行解析。

<pre>
  <code>
    这就告诉我们，我们要保护的对象是那些可以直接产生数据改变的服务，而对于读取数据的服务，则不需要进行**CSRF**的保护。而保护的关键，是 「在请求中放入黑客所不能伪造的信息」
  </code>
</pre>

#### 用户操作限制——验证码机制

方法：添加验证码来识别是不是用户主动去发起这个请求，由于一定强度的验证码机器无法识别，因此危险网站不能伪造一个完整的请求。

1. 验证来源站点
   在服务器端验证请求来源的站点，由于大量的CSRF攻击来自第三方站点，因此服务器跨域禁止来自第三方站点的请求，主要通过HTTP请求头中的两个Header
   * Origin Header
   * Referer Header
  这两个Header在浏览器发起请求时，大多数情况会自动带上，并且不能由前端自定义内容。
  服务器可以通过解析这两个Header中的域名，确定请求的来源域。

  其中，「Origin」只包含域名信息，而「Referer」包含了具体的 URL 路径。
  在某些情况下，这两者都是可以伪造的，通过AJax中自定义请求头即可，安全性略差。
2. 利用Cookie的SameSite属性
   SameSite可以设置为三个值，Strict、Lax和None。
   1. 在Strict模式下，浏览器完全禁止第三方请求携带Cookie。比如请求sanyuan.com网站只能在sanyuan.com域名当中请求才能携带 Cookie，在其他网站请求都不能。
   2. 在Lax模式，就宽松一点了，但是只能在 get 方法提交表单况或者a 标签发送 get 请求的情况下可以携带 Cookie，其他情况均不能。
   3. 在None模式下，Cookie将在所有上下文中发送，即允许跨域发送。
   
3. CSRF Token
   前面讲到CSRF的另一个特征是，攻击者无法直接窃取到用户的信息（Cookie，Header，网站内容等），仅仅是冒用Cookie中的信息。
   那么我们可以使用Token，在不涉及XSS的前提下，一般黑客很难拿到Token。
  Token(令牌)做为Web领域验证身份是一个不错的选择，当然了，JWT有兴趣的也可以去了解一下。
  Token步骤如下：
  第一步:将CSRF Token输出到页面中
    <pre>
      <code>
        首先，用户打开页面的时候，服务器需要给这个用户生成一个Token，该Token通过加密算法对数据进行加密，一般Token都包括随机字符串和时间戳的组合，显然在提交时Token不能再放在Cookie中了（XSS可能会获取Cookie），否则又会被攻击者冒用。因此，为了安全起见Token最好还是存在服务器的Session中，之后在每次页面加载时，使用JS遍历整个DOM树，对于DOM中所有的a和form标签后加入Token。这样可以解决大部分的请求，但是对于在页面加载之后动态生成的HTML代码，这种方法就没有作用，还需要程序员在编码时手动添加Token。
      </code>
    </pre>
  第二步:页面提交的请求携带这个Token
    <pre>
      <code>
        对于GET请求，Token将附在请求地址之后，这样URL 就变成 http://url?csrftoken=tokenvalue。 而对于 POST 请求来说，要在 form 的最后加上：
        <input type=”hidden” name=”csrftoken” value=”tokenvalue”/>
        这样，就把Token以参数的形式加入请求了。
      </code>
    </pre>
  第三步：服务器验证Token是否正确
    <pre>
      <code>
        当用户从客户端得到了Token，再次提交给服务器的时候，服务器需要判断Token的有效性，验证过程是先解密Token，对比加密字符串以及时间戳，如果加密字符串一致且时间未过期，那么这个Token就是有效的。
      </code>
    </pre>
## 总结
CSRF(Cross-site request forgery), 即跨站请求伪造，本质是冲着浏览器分不清发起请求是不是真正的用户本人，所以防范的关键在于在请求中放入黑客所不能伪造的信息。从而防止黑客伪造一个完整的请求欺骗服务器。
「防范措施」：验证码机制，验证来源站点，利用Cookie的SameSite属性，CSRF Token
