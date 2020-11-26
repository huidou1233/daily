BFC(块级格式化上下文)
===
BFC布局规则:
1. 内部的Box会在垂直方向，一个接一个地放置。
2. Box垂直方向的距离由margin决定。属于同一个BFC的两个相邻Box的margin会发生重叠
3. 每个元素的左外边缘（margin-left)， 与包含块的左边（contain box left）相接触(对于从左往右的格式化，否则相反)。即使存在浮动也是如此。除非这个元素自己形成了一个新的BFC。
4. BFC的区域不会与float box重叠。
5. BFC就是页面上的一个隔离的独立容器，容器里面的子元素不会影响到外面的元素。反之也如此。
6. 计算BFC的高度时，浮动元素也参与计算

怎样形成一个BFC？
块级格式化上下文由以下之一创建：

1. 根元素或其它包含它的元素
2. 浮动 (元素的 float 不是 none)
3. 绝对定位的元素 (元素具有 position 为 absolute 或 fixed)
4. 非块级元素具有 display: inline-block，table-cell,table-caption, flex, inline-flex
5. 块级元素具有overflow ，且值不是 visible

BFC用处
1. 清除浮动
```
   <div class="wrap">
    <section>1</section>
    <section>2</section>
    </div>
  .wrap {
    border: 2px solid yellow;
    width: 250px;
    overflow: hidden;
  }
  section {
    background-color: pink;
    float: left;
    width: 100px;
    height: 100px;
  }
```
2. 布局：自适应两栏布局
```
<div>
  <aside></aside>
  <main>我是好多好多文字会换行的那种蛤蛤蛤蛤蛤蛤蛤蛤蛤蛤蛤蛤蛤</main>
</div>
div {
  width: 200px;
  overflow: hidden;
}
aside {
  background-color: yellow;
  float: left;
  width: 100px;
  height: 50px;
}
main {
  background-color: pink;
}
```
3.  防止垂直margin合并
```
<section class="top">1</section>
<section class="bottom">2</section>
```
