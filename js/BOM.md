# BOM

BOM 为浏览器对象模型，接下来一一来回顾。

## Window

所有 JavaScript 全局对象、函数以及变量均自动成为 window 对象的成员。

全局变量是 window 对象的属性。

全局函数是 window 对象的方法。

甚至 HTML DOM 的 document 也是 window 对象的属性之一：

- window.innerHeight - 浏览器窗口的内部高度(包括滚动条)
- window.innerWidth - 浏览器窗口的内部宽度(包括滚动条)
- window.open() - 打开新窗口
- window.close() - 关闭当前窗口
- window.moveTo() - 移动当前窗口
- window.resizeTo() - 调整当前窗口的尺寸

全局变量不能通过 delete 操作符删除；而 window 属性上定义的变量可以通过 delete 删除

```JavaScript
var num=123;
window.str="string";
delete num;
delete str;
console.log(num); //123

console.log(str); //str is not defined
```

访问未声明的变量会抛出错误，但是通过查询 window 对象，可以知道某个可能未声明的变量是否存在。

```JavaScript
var newValue=oldValue; // 报错：oldValue is not defined
var newValue=window.oldValue; // 不会报错
console.log(newValue); // undefined
```

## screen

- screen.availWidth - 可用的屏幕宽度
- screen.availHeight - 可用的屏幕高度

## location

window.location 对象用于获得当前页面的地址 (URL)，并把浏览器重定向到新的页面。

- location.href 返回当前页面的 url
- location.hostname 返回 web 主机的域名
- location.pathname 返回当前页面的路径和文件名
- location.port 返回 web 主机的端口 （80 或 443）
- location.protocol 返回所使用的 web 协议（http: 或 https:）

window.location.assign(url) ： 加载 URL 指定的新的 HTML 文档。 就相当于一个链接，跳转到指定的 url，当前页面会转为新页面内容，可以点击后退返回上一个页面。

window.location.replace(url) ： 通过加载 URL 指定的文档来替换当前文档 ，这个方法是替换当前窗口页面，前后两个页面共用一个窗口，所以是没有后退返回上一页的

## history

window.history 对象包含浏览器的历史

- history.back() - 与在浏览器点击后退按钮相同
- history.forward() - 与在浏览器中点击向前按钮相同
- history.go(index):index 表示前进后退的步数，0 表示刷新页面

## navigator

window.navigator 对象包含有关访问者浏览器的信息
