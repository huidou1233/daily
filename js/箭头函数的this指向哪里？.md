# 箭头函数的 this 指向哪里？

箭头函数不同于传统 JavaScript 中的函数,箭头函数并没有属于自己的 this,它的所谓的 this 是捕获其所在上下文的 this 值，作为自己的 this 值,并且由于没有属于自己的 this,而箭头函数是不会被 new 调用的，这个所谓的 this 也不会被改变.
我们可以用 Babel 理解一下箭头函数:

```JavaScript
// ES6
const obj = {
    getArrow() {
        return () => {
            console.log(this === obj);
        };
    }
}
```

转化后

```JavaScript
var obj = {
    getArrow: function getArrow() {
        var _this = this;
        return function () {
            console.log(_this === obj);
        };
    }
};
```
