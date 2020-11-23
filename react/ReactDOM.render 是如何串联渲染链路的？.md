ReactDOM.render 是如何串联渲染链路的？
===

### ReactDOM.render 调用栈的逻辑分层
开篇先给到你一个简单的 React AppDemo：
```JavaScript
import React from "react";
import ReactDOM from "react-dom";
function App() {
    return (
      <div className="App">
        <div className="container">
          <h1>我是标题</h1>
          <p>我是第一段话</p>
          <p>我是第二段话</p>
        </div>
      </div>
    );
}
const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
```

Demo 启动后，渲染出的界面如下图所示：

![avater](../assets/reactdom-render1.png)

现在请你打开 Chrome 的 Performance 面板，点击下图红色圈圈所圈住的这个“记录”按钮

![avater](../assets/reactdom-render2.png)

然后重新访问 Demo 页面对应的本地服务地址，待页面刷新后，终止记录，便能够得到如下图右下角所示的这样一个调用栈大图：

![avater](../assets/reactdom-render3.png)

放大该图，定位“src/index.js”这个文件路径，我们就可以找到 ReactDOM.render 方法对应的调用栈，如下图所示：

![avater](../assets/reactdom-render4.png)

从图中你可以看到，ReactDOM.render 方法对应的调用栈非常深，中间涉及的函数量也比较大。如果这张图使你心里发虚，请先不要急于撤退——分析调用栈只是我们理解渲染链路的一个手段，我们的目的是借此提取关键逻辑，而非理解调用栈中的每一个方法。就这张图来说，你首先需要把握的，就是整个调用链路中所包含的三个阶段：

![avater](../assets/reactdom-render5.png)

图中 scheduleUpdateOnFiber 方法的作用是调度任务，在由 ReactDOM.render 发起的首屏渲染这个场景下，它触发的就是 performSyncWorkOnRoot。performSyncWorkOnRoot 开启的正是我们反复强调的 __render 阶段；而__ commitRoot 方法开启的则是真实 DOM 的渲染过程（__commit 阶段__）。因此以scheduleUpdateOnFiber 和 commitRoot 两个方法为界，我们可以大致把 ReactDOM.render 的调用栈划分为三个阶段：

1. 初始化阶段
2. render 阶段
3. commit 阶段

接下来，我们就一起来看看这三个阶段分别做了哪些事情。
### 拆解 ReactDOM.render 调用栈——初始化阶段
首先我们提取出初始化过程中涉及的调用栈大图：

![avater](../assets/reactdom-render6.png)

图中的方法虽然看上去又多又杂，但做的事情清清爽爽，那就是完成 __Fiber 树中基本实体的创建__。

什么是基本实体？基本实体有哪些？问题的答案藏在源码里，这里我为你提取了源码中的关键逻辑，首先是 legacyRenderSubtreeIntoContainer 方法。在 ReactDOM.render 函数体中，以下面代码所示的姿势调用了它：
```JavaScript
return legacyRenderSubtreeIntoContainer(null, element, container, false, callback);
```

而 legacyRenderSubtreeIntoContainer 的关键逻辑如下（解析在注释里）：

```JavaScript
function legacyRenderSubtreeIntoContainer(parentComponent, children, container, forceHydrate, callback) {
  // container 对应的是我们传入的真实 DOM 对象
  var root = container._reactRootContainer;
  // 初始化 fiberRoot 对象
  var fiberRoot;
  // DOM 对象本身不存在 _reactRootContainer 属性，因此 root 为空
  if (!root) {
    // 若 root 为空，则初始化 _reactRootContainer，并将其值赋值给 root
    root = container._reactRootContainer = legacyCreateRootFromDOMContainer(container, forceHydrate);
    // legacyCreateRootFromDOMContainer 创建出的对象会有一个 _internalRoot 属性，将其赋值给 fiberRoot
    fiberRoot = root._internalRoot;
    // 这里处理的是 ReactDOM.render 入参中的回调函数，你了解即可
    if (typeof callback === 'function') {
      var originalCallback = callback;
      callback = function () {
        var instance = getPublicRootInstance(fiberRoot);
        originalCallback.call(instance);
      };
    } // Initial mount should not be batched.
    // 进入 unbatchedUpdates 方法
    unbatchedUpdates(function () {
      updateContainer(children, fiberRoot, parentComponent, callback);
    });
  } else {
    // else 逻辑处理的是非首次渲染的情况（即更新），其逻辑除了跳过了初始化工作，与楼上基本一致
    fiberRoot = root._internalRoot;
    if (typeof callback === 'function') {
      var _originalCallback = callback;
      callback = function () {
        var instance = getPublicRootInstance(fiberRoot);
        _originalCallback.call(instance);
      };
    } // Update
    updateContainer(children, fiberRoot, parentComponent, callback);
  }
  return getPublicRootInstance(fiberRoot);
}
```

这里我为你总结一下首次渲染过程中 legacyRenderSubtreeIntoContainer 方法的主要逻辑链路：

![avater](../assets/reactdom-render7.png)

在这个流程中，需要关注到 fiberRoot 这个对象。fiberRoot 到底是什么呢？这里我将运行时的 root 和 fiberRoot 为你截取出来，其中 root 对象的结构如下图所示：

![avater](../assets/reactdom-render8.png)

可以看出，root 对象（container._reactRootContainer）上有一个 _internalRoot 属性，这个 _internalRoot 也就是 fiberRoot。fiberRoot 的本质是一个 FiberRootNode 对象，其中包含一个 current 属性，该属性同样需要划重点。这里我为你高亮出 current 属性的部分内容：

![avater](../assets/reactdom-render9.png)

或许你会对 current 对象包含的海量属性感到陌生和头大，但这并不妨碍你 Get 到“current 对象是一个 FiberNode 实例”这一点，而 __FiberNode，正是 Fiber 节点对应的对象类型__。current 对象是一个 Fiber 节点，不仅如此，它还是当前 __Fiber 树的头部节点。__

考虑到 current 属性对应的 FiberNode 节点，在调用栈中实际是由 createHostRootFiber 方法创建的，React 源码中也有多处以 rootFiber 代指 current 对象，因此下文中我们将以 rootFiber 指代 current 对象。

读到这里，你脑海中应该不难形成一个这样的指向关系：

![avater](../assets/reactdom-render10.png)

其中，fiberRoot 的关联对象是真实 DOM 的容器节点；而 rootFiber 则作为虚拟 DOM 的根节点存在。这两个节点，将是后续整棵 Fiber 树构建的起点。

接下来，fiberRoot 将和 ReactDOM.render 方法的其他入参一起，被传入 updateContainer 方法，从而形成一个回调。这个回调，正是接下来要调用的 unbatchedUpdates 方法的入参。我们一起看看 unbatchedUpdates 做了什么，下面代码是对 unbatchedUpdates 主体逻辑的提取：

```JavaScript
function unbatchedUpdates(fn, a) {
  // 这里是对上下文的处理，不必纠结
  var prevExecutionContext = executionContext;
  executionContext &= ~BatchedContext;
  executionContext |= LegacyUnbatchedContext;
  try {
    // 重点在这里，直接调用了传入的回调函数 fn，对应当前链路中的 updateContainer 方法
    return fn(a);
  } finally {
    // finally 逻辑里是对回调队列的处理，此处不用太关注
    executionContext = prevExecutionContext;
    if (executionContext === NoContext) {
      // Flush the immediate callbacks that were scheduled during this batch
      resetRenderTimer();
      flushSyncCallbackQueue();
    }
  }
}
```

在 unbatchedUpdates 函数体里，当下你只需要 Get 到一个信息：它直接调用了传入的回调 fn。而在当前链路中，fn 是什么呢？fn 是一个针对 updateContainer 的调用：

```JavaScript
unbatchedUpdates(function () {
  updateContainer(children, fiberRoot, parentComponent, callback);
});
```

接下来我们很有必要去看看 updateContainer 里面的逻辑。这里我将主体代码提取如下（解析在注释里，如果没有耐心读完可以直接看文字解读）：

```JavaScript
function updateContainer(element, container, parentComponent, callback) {
  ......
  // 这是一个 event 相关的入参，此处不必关注
  var eventTime = requestEventTime();
  ......
  // 这是一个比较关键的入参，lane 表示优先级
  var lane = requestUpdateLane(current$1);
  // 结合 lane（优先级）信息，创建 update 对象，一个 update 对象意味着一个更新
  var update = createUpdate(eventTime, lane); 
  // update 的 payload 对应的是一个 React 元素
  update.payload = {
    element: element
  };
  // 处理 callback，这个 callback 其实就是我们调用 ReactDOM.render 时传入的 callback
  callback = callback === undefined ? null : callback;
  if (callback !== null) {
    {
      if (typeof callback !== 'function') {
        error('render(...): Expected the last optional `callback` argument to be a ' + 'function. Instead received: %s.', callback);
      }
    }
    update.callback = callback;
  }
  // 将 update 入队
  enqueueUpdate(current$1, update);
  // 调度 fiberRoot 
  scheduleUpdateOnFiber(current$1, lane, eventTime);
  // 返回当前节点（fiberRoot）的优先级
  return lane;
}
```

updateContainer 的逻辑相对来说丰富了点，但大部分逻辑也是在干杂活，它做的最关键的事情可以总结为三件：

1. 请求当前 Fiber 节点的lane（优先级）；
2. 结合lane（优先级），创建当前 Fiber 节点的 update 对象，并将其入队；
3. 调度当前节点（rootFiber）。

函数体中的 scheduleWork 其实就是 scheduleUpdateOnFiber，scheduleUpdateOnFiber 函数的任务是调度当前节点的更新。在这个函数中，会处理一系列与优先级、打断操作相关的逻辑。但是 __在 ReactDOM.render 发起的首次渲染链路中，这些意义都不大，__ 因为这个渲染过程其实是同步的。我们可以尝试在 Source 面板中为该函数打上断点，逐行执行代码，会发现逻辑最终会走到下图的高亮处

![avater](../assets/reactdom-render11.png)

performSyncWorkOnRoot直译过来就是“执行根节点的同步任务”，这里的“同步”二字需要注意，它明示了接下来即将开启的是一个同步的过程。这也正是为什么在整个渲染链路中，调度（Schedule）动作没有存在感的原因。

前面我们曾经提到过，performSyncWorkOnRoot 是 render 阶段的起点，render 阶段的任务就是完成 Fiber 树的构建，它是整个渲染链路中最核心的一环。在异步渲染的模式下，render 阶段应该是一个可打断的异步过程（下一讲我们就将针对 render 过程作详细的逻辑拆解）。

现在，我相信你心里更多的疑惑在于：都说 Fiber 架构带来的异步渲染是 React16 的亮点，为什么分析到现在，竟然发现 ReactDOM.render 触发的首次渲染是个同步过程呢？

#### 同步的 ReactDOM.render，异步的 ReactDOM.createRoot
其实在 React16，包括近期发布的 React17 小版本中，React 都有以下3种启动方式：

> legacy 模式：ReactDOM.render(<App />, rootNode)。这是当前 React App 使用的方式，当前没有计划删除本模式，但是这个模式可能不支持这些新功能。
blocking 模式：ReactDOM.createBlockingRoot(rootNode).render(<App />)。目前正在实验中，作为迁移到 concurrent 模式的第一个步骤。
concurrent 模式：ReactDOM.createRoot(rootNode).render(<App />)。目前在实验中，未来稳定之后，打算作为 React 的默认开发模式，这个模式开启了所有的新功能。

在这3种模式中，__我们常用的ReactDOM.render 对应的是 legacy 模式，它实际触发的仍然是同步的渲染链路。__ blocking 模式可以理解为 legacy 和 concurrent 之间的一个过渡形态，之所以会有这个模式，是因为 React 官方希望能够提供渐进的迁移策略，帮助我们更加顺滑地过渡到 Concurrent 模式。blocking 在实际应用中是比较低频的一个模式，了解即可。

按照官方的说法，__“长远来看，模式的数量会收敛，不用考虑不同的模式__，但就目前而言，模式是一项重要的迁移策略，让每个人都能决定自己什么时候迁移，并按照自己的速度进行迁移”。由此可以看出，Concurrent 模式确实是 React 的终极目标，也是其创作团队使用 Fiber 架构重写核心算法的动机所在。

### 拓展：关于异步模式下的首次渲染链路

当下，如果想要开启异步渲染，我们需要调用 ReactDOM.createRoot方法来启动应用，那ReactDOM.createRoot开启的渲染链路与 ReactDOM.render 有何不同呢？

这里我修改一下调用方式，给你展示一下调用栈。由于本讲的源码取材于 React 17.0.0 版本，在这个版本中，createRoot 仍然是一个 unstable的方法。因此实际调用的 API 应该是“unstable_createRoot”：

```JavaScript
ReactDOM.unstable_createRoot(rootElement).render(<App />);
```

Concurrent 模式开启后，首次渲染的调用栈变成了如下图所示的样子：
![avater](../assets/reactdom-render12.png)

乍一看，好像和ReactDOM.render 差别很大，其实不然。图中 createRoot 所触发的逻辑仍然是一些准备性质的初始化工作，此处不必太纠结。关键在于下面我给你框出来的这部分，如下图所示：

![avater](../assets/reactdom-render13.png)

你会发现这地方也调用了一个 render。再顺着这个调用往下看，发现有大量的熟悉面孔：updateContainer、requestUpdateLane、createUpdate、scheduleUpdateOnFiber......这些函数在ReactDOM.render 的调用栈中也出现过。

其实，当前你看到的这个 render 调用链路，和 ReactDOM.render 的调用链路是非常相似的，主要的区别在 scheduleUpdateOnFiber 的这个判断里：

![avater](../assets/reactdom-render14.png)

在异步渲染模式下，由于请求到的 lane 不再是 SyncLane（同步优先级），故不会再走到 performSyncWorkOnRoot 这个调用，而是会转而执行 else 中调度相关的逻辑。

这里有个点要给你点出来——React 是如何知道当前处于哪个模式的呢？我们可以以 requestUpdateLane 函数为例，下面是它局部的代码：

```JavaScript
function requestUpdateLane(fiber) {
  // 获取 mode 属性
  var mode = fiber.mode;
  // 结合 mode 属性判断当前的
  if ((mode & BlockingMode) === NoMode) {
    return SyncLane;
  } else if ((mode & ConcurrentMode) === NoMode) {
    return getCurrentPriorityLevel() === ImmediatePriority$1 ? SyncLane : SyncBatchedLane;
  }
  ......
  return lane;
}
```

上面代码中需要注意 fiber节点上的 mode 属性：__React 将会通过修改 mode 属性为不同的值，来标识当前处于哪个渲染模式；在执行过程中，也是通过判断这个属性，来区分不同的渲染模式。__

因此不同的渲染模式在挂载阶段的差异，本质上来说并不是工作流的差异（其实它们做的事情都是差不多的），而是mode 属性的差异。

对于 ReactDOM.unstable_createRoot 触发的挂载链路，我们点到为止，不作为重点来讨论，这背后有两方面的考虑：

* 一方面，它的工作内容和 ReactDOM.render 没有本质上的差异（都是初始化 → render → commit），而 ReactDOM.render 作为时下的主流渲染方式，我们将继续针对它进行详细讲解；
* 另一方面，Fiber 架构主要解决的是更新过程中的问题，它带来的利好，比如时间切片、优先级调度等，都需要放在更新链路中去讨论。

### Fiber 架构一定是异步渲染吗？
之前我曾经被读者朋友问到过这样的问题：__React16 如果没有开启 Concurrent 模式，那它还能叫 Fiber 架构吗？__

这个问题很有意思，从动机上来看，Fiber 架构的设计确实是为了 Concurrent 而存在。但经过了本讲紧贴源码的讲解，相信你也能够看出，在 React16，包括已发布的 React17 版本中，不管是否是 Concurrent，整个数据结构层面的设计、包括贯穿整个渲染链路的处理逻辑，已经完全用 Fiber 重构了一遍。站在这个角度来看，Fiber 架构在 React 中并不能够和异步渲染画严格的等号，它是 __一种同时兼容了同步渲染与异步渲染的设计。__