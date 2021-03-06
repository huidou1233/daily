重绘（Repaint）和回流（Reflow）
===
### 重绘

当渲染树中的一些元素需要更新属性，而这些属性只是影响元素的外观，风格，而不会影响布局的，比如background-color，则就叫称为重绘Repaint，重绘不一定触发回流。

### 回流
布局或者几何属性需要改变就称为回流。
回流必定会发生重绘，重绘不一定会引发回流。回流所需的成本比重绘高的多，改变父节点里的子节点很可能会导致父节点的一系列回流。

下面是常见的触发回流的操作：
* 页面首次渲染
* 浏览器窗口大小发生改变
* 元素尺寸或位置发生改变（包括外边距、内边框、边框大小、高度和宽度等）
* 元素内容变化（文字数量或图片大小，比如用户在input框中输入文字等等）
* 元素字体大小变化
* 添加或者删除可见的DOM元素
* 激活CSS伪类（例如：:hover）
* 查询某些属性或调用某些方法

### 优化

#### 浏览器的优化
浏览器本身携带一些优化方式，浏览器会把回流和重绘的操作积攒一批，当操作达到一定数量或者到达时间阈值，然后做一次reflow，称为异步reflow或增量异步reflow。但是有些情况浏览器是不会这么做的，例如resize窗口，改变了页面默认的字体等等。对于这些操作，浏览器会马上进行reflow。

#### 最小化操作
由于重绘和回流可能代价比较昂贵，因此最好就是可以减少它的发生次数，为了减少发生次数，我们可以合并多次对DOM和样式的修改，然后一次处理掉，或者将样式事先设计好，动态去改变class。

#### 批量修改DOM
使用documentFragment对象在内存里操作DOM，在内存中的DOM修改就是让元素脱离文档流，当然是不会触发重绘的，将对DOM的所有修改批量完成，想怎么改就怎么改，然后将节点再放入文档流中，只触发一次回流。

#### 绝对定位
对于复杂动画效果，由于会经常的非常频繁的引起回流重绘，可以使用绝对定位，让它脱离文档流，否则会引起父元素以及后续元素频繁的回流。

#### 避免多层内联样式
通过style属性动态设置样式是在操作一个很小的DOM片段，容易导致多次回流。避免设置多级内联样式，样式应该合并在一个外部类，这样当该元素的class属性可被操控时仅会产生一个reflow。

#### 末端改动
尽可能在DOM树的最末端或者是层级较低的节点改变class，回流可以自上而下，或自下而上的回流的信息传递给周围的节点。回流是不可避免的，但可以减少其影响。末端节点或者低层级节点的修改可以限制回流的范围，使其影响尽可能少的节点，当然其也有可能引发大面积回流。

