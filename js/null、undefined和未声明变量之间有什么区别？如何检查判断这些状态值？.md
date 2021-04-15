null、undefined和未声明变量之间有什么区别？如何检查判断这些状态值？
=======

## 未声明变量

未声明变量：当变量没有提前使用var、let或const声明变量，就为一个变量赋值，此时就是未声明变量。

未声明变量会脱离当前作用域，成为全局作用域下定义的变量。

在严格模式下，给未声明的变量赋值，会抛出ReferenceError错误。

和使用全局变量一样，使用未声明变量也是非常不好的做法，应当尽可能避免。要检查判断它们，需要将用到它们的代码放在try/catch语句中。

```
function foo() {
  x = 1; // 在严格模式下，抛出 ReferenceError 错误
}

foo();
console.log(x); // 1
```

## undefined

当一个变量已经声明，但没有赋值时，该变量的值是undefined；

如果一个函数的执行结果被赋值给一个变量，但是这个函数却没有返回任何值，那么该变量的值是undefined

要检查undefined，需要使用严格相等（===）；或者使用typeof，它会返回'undefined'字符串。

请注意，不能使用非严格相等（==）来检查，因为如果变量值为null，使用非严格相等也会返回true。

```
  var foo;
  console.log(foo); // undefined
  console.log(foo === undefined); // true
  console.log(typeof foo === 'undefined'); // true


  console.log(foo == null); // true. 错误，不要使用非严格相等！

  function bar() {}
  var baz = bar();
  console.log(baz); // undefined
```
## null
null只能被显式赋值给变量。它表示空值，与被显式赋值 undefined 的意义不同。

要检查判断null值，需要使用严格相等运算符。请注意，和前面一样，不能使用非严格相等（==）来检查，因为如果变量值为undefined，使用非严格相等也会返回true。

```
var foo = null;
console.log(foo === null); // true

console.log(foo == undefined); // true. 错误，不要使用非严格相等！
```