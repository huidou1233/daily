Js的事件委托是什么，原理是什么
1 事件委托
  事件委托就是子级将事件委托给父级，开始监听，如果触发，父级通过ev.target来获取单击的哪个目标，从而弹出目标
2 事件流
  事件流描述的是从页面中接收事件的顺序。
事件冒泡：事件开始由最具体的元素接收，然后逐级向上传播到较为不具体的节点（或文档）。
事件捕获：事件开始由不太具体的节点接收，然后逐级向下传播到最具体的节点。它与事件冒泡是个相反的过程。

DOM2级事件规定的事件流包括三个阶段：
  事件捕获
  目标阶段
  事件冒泡
3 事件委托原理
  事件委托就是利用事件冒泡机制实现的。
  假设有一个列表，要求点击列表项弹出对应字段。
  <ul id="myLink">
    <li id="1">aaa</li>
    <li id="2">bbb</li>
    <li id="3">ccc</li>
  </ul>
  不使用事件委托
  var myLink = document.getElementById('myLink');
  var li = myLink.getElementsByTagName('li');

  for(var i = 0; i < li.length; i++) {
    li[i].onclick = function(e) {
      var e = event || window.event;
      var target = e.target || e.srcElement;
      alert(e.target.id + ':' + e.target.innerText);  
    };
  }
这样做存在的问题：

给每个列表项都绑定事件，消耗内存
当有动态添加的元素时，需要重新给元素绑定事件
使用事件委托
var myLink = document.getElementById('myLink');

myLink.onclick = function(e) {
  var e = event || window.event;
  var target = e.target || e.srcElement;
  if(e.target.nodeName.toLowerCase() == 'li') {
    alert(e.target.id + ':' + e.target.innerText);
  }
};
上述代码是将事件委托给列表项的父级，通过 target 下的 nodeName 属性作出判断。

也可以给每个列表项绑定与其对应的事件。如：
var myLink = document.getElementById('myLink');

myLink.onclick = function(e) {
  var e = event || window.event;
  var target = e.target || e.srcElement;
  switch(target.id) {
    case '1':
      target.style.backgroundColor = 'red';
      break;
    case '2':
      alert('这是第二项');
      break;
    case '3':
      alert(e.target.id + ':' + e.target.innerText);
      break;
    default:
      alert('...');
  }
};
上述代码是通过判断 target 下的 id 属性，执行不同的事件。

事件委托的优点：

  只需要将同类元素的事件委托给父级或者更外级的元素，不需要给所有元素都绑定事件，减少内存空间占用，提升性能
  动态新增的元素无需重新绑定事件
需要注意的地方：

  事件委托的实现依靠事件冒泡，因此不支持事件冒泡的事件就不适合用事件委托。
  最适合采用事件委托技术的事件包括 click、mousedown、mouseup、keydown、keyup 和 keypress。虽然 mouseover 和 mouseout 事件也冒泡，但要适当处理它们并不容易，而且经常需要计算元素的位置。（因为当鼠标从一个元素移到其子节点时，或者当鼠标移出该元素时，都会触发 mouseout 事件。）

不是所有的事件绑定都适合使用事件委托，不恰当使用反而可能会导致不需要绑定事件的元素也被绑定上了事件。



















