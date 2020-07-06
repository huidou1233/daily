new操作符具体干了什么呢？
====
function Person() {
  this.name = 'Andy'
  this.age = 20;
  this.say = function(){
    console.log('hello');
  }
}
Person.prototype.test = function(){
  console.log('test');
}
new操作符的作用如下：
1.创建一个空对象
2.由this变量引用该对象
3.该对象继承该函数的原型
4.把属性和方法加入到this引用的对象中
5.新创建的对象由this引用，最后隐式地返回this。
过程如下：
let obj = {}; //创建一个空对象
obj.__proto__ = new Person.prototype; //该对象继承该函数的原型
Person.call(obj); // 隐式的返回this

var fn = function () { };
var fnObj = new fn();
1、创建了一个空对象

var obj = new object();
2、设置原型链

obj._proto_ = fn.prototype;
3、让fn的this指向obj，并执行fn的函数体

var result = fn.call(obj);
4、判断fn的返回值类型，如果是值类型，返回obj。如果是引用类型，就返回这个引用类型的对象。

if (typeof(result) == "object"){  
    fnObj = result;  
} else {  
    fnObj = obj;
}