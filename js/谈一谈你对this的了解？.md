谈一谈你对 this 的了解？
====

this是在调用时被绑定的，它指向什么完全取决于函数在哪里被调用

### 绑定规则
1. 默认绑定
在独立函数调用时，非严格模式下，this会被绑定到全局对象window/global，严格模式绑定到undefined
```JavaScript
name = "Bale";

function sayName () {
    console.log(this.name);
};

sayName(); //"Bale"
```

2. 隐式绑定
通过上下文对象调用函数时，函数体内的this会被绑定到该对象上
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

#### 隐式丢失


```JavaScript
function foo(){
  console.log(this.a)
}
var obj = {
  a: 2,
  foo: foo
}

var bar = obj.foo; // 函数别名
var a = "oops, global";

bar(); // "oops, global"
```

3. 显示绑定 
通过call/apply/bind 方法显式调用函数时，函数体内的this会被绑定到指定参数的对象上
再次，显示改变 this 指向，常见的方法就是 call、apply、bind
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

1. new绑定
   用 new 调用一个构造函数，会创建一个新对象, 在创造这个新对象的过程中,新对象会自动绑定到 Person 对象的 this 上，那么 this 自然就指向这个新对象。

```JavaScript
function Person(name) {
  this.name = name;
  console.log(name);
}

var person1 = new Person('Messi'); //Messi
```

通过new来调用函数时，会自动执行下面的操作：
1. 创建（构造）一个全新的对象
2. 这个新对象会被执行[[Prototype]]连接
3. 这个新对象会绑定到函数调用的this
4. 如果函数没有返回其他对象，那么 new 表达式中的函数会自动返回这个新对象

绑定优先级: new 绑定 > 显式绑定 >隐式绑定 >默认绑定
