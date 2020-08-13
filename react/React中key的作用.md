React中key的作用
====
### key的作用

react中的key属性，它是一个特殊的属性，它是出现不是给开发者用的（例如你为一个组件设置key之后不能获取组件的这个key props），而是给react自己用的。
react利用key来识别组件，它是一种身份标识标识，就像我们的身份证用来辨识一个人一样。
有了key属性后，就可以与组件建立了一种对应关系，react根据key来决定是销毁重新创建组件还是更新组件。
* key相同，若组件属性有所变化，则react只更新组件对应的属性；没有变化则不更新。
* key值不同，则react先销毁该组件(有状态组件的componentWillUnmount会执行)，然后重新创建该组件（有状态组件的constructor和componentWillUnmount都会执行）

key的值必须保证唯一且稳定

另外需要指明的是:
#### key不是用来提升react的性能的，不过用好key对性能是有帮助的。

### key的使用场景
在项目开发中，key属性的使用场景最多的还是由数组动态创建的子组件的情况，需要为每个子组件添加唯一的key属性值。

那么，为何由数组动态创建的组件必须要用到key属性呢？这跟数组元素的动态性有关。

看一下babel对上述代码的转换情况：
```javascript
// 转换前
const element = (
  <div>
    <h3>用户列表</h3>
    {[<div key={1}>1:张三</div>, <div key={2}>2:李四</div>]}
  </div>
);

// 转换后
"use strict";

var element = React.createElement(
  "div",
  null,
  React.createElement("h3",null,"用户列表"),
  [
    React.createElement("div",{ key: 1 },"1:张三"), 
    React.createElement("div",{ key: 2 },"2:李四")
  ]
);
```
有babel转换后React.createElement中的代码可以看出，其它元素之所以不是必须需要key是因为不管组件的state或者props如何变化，这些元素始终占据着React.createElement固定的位置，这个位置就是天然的key

而由数组创建的组件可能由于动态的操作导致重新渲染时，子组件的位置发生了变化，例如上面用户列表子组件新增一个用户，上面两个用户的位置可能变化为下面这样：
```javascript
var element = React.createElement(
  "div",
  null,
  React.createElement("h3",null,"用户列表"),
  [
    React.createElement("div",{ key: 3 },"1:王五"), 
    React.createElement("div",{ key: 1 },"2:张三"), 
    React.createElement("div",{ key: 2 },"3:李四")
  ]
);
```
另外，还有一种比较常见的场景：
为一个有复杂繁琐逻辑的组件添加key后，后续操作可以改变该组件的key属性值，从而达到先销毁之前的组件，再重新创建该组件

### key的最佳实践
上面说到了，由数组创建的子组件必须有key属性，否则的话你可能见到下面这样的warning：
<code>Warning: Each child in an array or iterator should have a unique "key" prop. Check the render method of `ServiceInfo`. See https://fb.me/react-warning-keys for more information.</code>

可能你会发现，这只是warning而不是error，它不是强制性的，为什么react不强制要求用key而报error呢？其实是强制要求的，只不过react为按要求来默认上帮我们做了，它是以数组的index作为key的
#### index作为key是一种反模式
在list数组中，用key来标识数组创建子组件时，若数组的内容只是作为纯展示，而不涉及到数组的动态变更，其实是可以使用index作为key的。

但是，若涉及到数组的动态变更，例如数组新增元素、删除元素或者重新排序等，这时index作为key会导致展示错误的数据。本文开始引入的例子就是最好的证明。


index 的替代

归根结底，使用index的问题在于两次渲染的index是相同的，导致key也是相同的，回到上面👆的总结 ：key相同，若组件属性有所变化，则react只更新组件对应的属性；没有变化则不更新。
这时候，如果保证每次的 key 不同，问题不就解决了么？
于是乎···
```javascript
key={index +  Math.random()}
```
复制代码一行神奇的代码就产生了。
能解决问题么？能！是最优的么？不是。

key应该是稳定的，可预测的和独特的。不稳定的key（如由其生成的key Math.random()）将导致许多组件实例和DOM节点被不必要地重新创建，这可能导致性能下降和子组件中的丢失状态。
所以，在不能使用random随机生成key时，我们可以像下面这样用一个全局的localCounter变量来添加稳定唯一的key值。
```javascript
var localCounter = 1;
this.data.forEach(el=>{
    el.id = localCounter++;
});
//向数组中动态添加元素时，
function createUser(user) {
    return {
        ...user,
        id: localCounter++
    }
}

```
所以，我最后的解决方案是全局定义一个变量：let ONE = 1;,然后在组件中使用 key = {ONE++} 。这样 setSete() 的时候每次key都产生了变化，也一定程度上避免了key的不稳定性质