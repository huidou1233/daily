/** jQuery offset方法实现
===

如何获取文档中任意一个元素与文档顶部的距离？

可以通过以下2中思路实现：
* 通过递归实现
* 通过getBoundingClientRect方法实现
*/

//通过递归实现
const offset = ele => {
  let result = {
    top: 0,
    left: 0,
  }
  const getOffset = (node, init) => {
    if (node.nodeType !== 1) {
      return;
    }

    position = window.getComputedStyle(node)['position'];

    if (typeof (init) === 'undefined' && position === 'static') {
      getOffset(node.parentNode);
      return;
    }

    result.top = node.offsetTop + result.top - node.scrollTop;
    result.left = node.offsetLeft + result.left - node.scrollLeft;

    if (position === 'fixed') {
      return;
    }
    getOffset(node.parentNode);
  }

  // 当前DOM 节点为 display=== 'none',直接返回{top: 0,left: 0}
  if (window.getComputedStyle(ele)['display'] === 'none') {
    return result;
  }

  let position;
  getOffset(ele, true)

  return result;
}


/**
 * Element.getBoundingClientRect() 方法返回元素的大小及其相对于视口的位置。
 * 如果是标准盒子模型，元素的尺寸等于width/height + padding + border-width的
 * 总和。如果box-sizing: border-box，元素的的尺寸等于 width/height。
 */

// 通过getBoundingClientRect实现
const offset2 = ele => {
  let result = {
    top: 0,
    left: 0,
  }

  // 如果浏览器版本为IE11以下，直接返回
  if (!ele.getClientRects().length) {
    return result;
  }
  // 当前DOM 节点为 display=== 'none',直接返回{top: 0,left: 0}
  if (window.getComputedStyle(ele)['display'] === 'none') {
    return result;
  }

  result = ele.getBoundingClientRect();
  var docElement = ele.ownerDocument.documentElement;

  return {
    top: result.top + window.pageYOffset - docElement.clientTop,
    left: result.left + window.pageXOffset - docElement.clientLeft
  }
}