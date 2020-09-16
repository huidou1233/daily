# Class 基础语法

class 声明创建一个基于原型继承的具有给定名称的新类。

```JavaScript
class Polygon {
  constructor(height, width) {
    this.area = height * width;
  }
}

console.log(new Polygon(4, 3).area);
```

你也可以使用类表达式定义类。但是不同于类表达式，类声明不允许再次声明已经存在的类，否则将会抛出一个类型错误。

### 语法

```JavaScript
class name [extends] {
  // class body
}
```

### 描述

和类表达式一样，类声明体在严格模式下运行。构造函数是可选的。

类声明不可以提升（这与函数声明不同）。

### 示例

声明一个类
在下面的例子中，我们首先定义一个名为 Polygon 的类，然后继承它来创建一个名为 Square 的类。注意，构造函数中使用的 super() 只能在构造函数中使用，并且必须在使用 this 关键字前调用。

```JavaScript
class Polygon {
  constructor(height, width) {
    this.name = 'Polygon';
    this.height = height;
    this.width = width;
  }
}

class Square extends Polygon {
  constructor(length) {
    super(length, length);
    this.name = 'Square';
  }
}
```

重复定义类
重复声明一个类会引起类型错误。

```JavaScript
class Foo {};
class Foo {};
// Uncaught TypeError: Identifier 'Foo' has already been declared
```

若之前使用类表达式定义了一个类，则再次声明这个类同样会引起类型错误。

```JavaScript
let Foo = class {};
class Foo {};
// Uncaught TypeError: Identifier 'Foo' has already been declared
```
