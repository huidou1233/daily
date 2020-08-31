# 谈一谈你对 this 的了解？

this 的指向不是在编写时确定的,而是在执行时确定的，同时，this 不同的指向在于遵循了一定的规则。

1. 首先，在默认情况下，this 是指向全局对象的，比如在浏览器就是指向 window。

```JavaScript
name = "Bale";

function sayName () {
    console.log(this.name);
};

sayName(); //"Bale"
```

2. 其次，如果函数被调用的位置存在上下文对象时，那么函数是被隐式绑定的。

```JavaScript
function f() {
    console.log( this.name );
}

var obj = {
    name: "Messi",
    f: f
};

obj.f(); //被调用的位置恰好被对象obj拥有，因此结果是Messi
```

3. 再次，显示改变 this 指向，常见的方法就是 call、apply、bind
   以 bind 为例:

```JavaScript
function f() {
    console.log( this.name );
}
var obj = {
    name: "Messi",
};

var obj1 = {
     name: "Bale"
};

f.bind(obj)(); //Messi ,由于bind将obj绑定到f函数上后返回一个新函数,因此需要再在后面加上括号进行执行,这是bind与apply和call的区别

```

4. 最后，也是优先级最高的绑定 new 绑定。
   用 new 调用一个构造函数，会创建一个新对象, 在创造这个新对象的过程中,新对象会自动绑定到 Person 对象的 this 上，那么 this 自然就指向这个新对象。

```JavaScript
function Person(name) {
  this.name = name;
  console.log(name);
}

var person1 = new Person('Messi'); //Messi
```

绑定优先级: new 绑定 > 显式绑定 >隐式绑定 >默认绑定
