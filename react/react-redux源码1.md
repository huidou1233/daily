Provider是怎么把store放入context中的
===

先从Provider组件入手，代码不多，直接上源码
```JavaScript
function Provider({ store, context, children }) {
  const contextValue = useMemo(() => {
    // 声明一个Subscription实例。订阅，监听state变化来执行listener，都由该实例来实现。
    const subscription = new Subscription(store)
     // 绑定监听，当state变化时，通知订阅者更新页面，实际上也就是在connect过程中被订阅到
     //react-redux的subscrption对象上的更新函数
    subscription.onStateChange = subscription.notifyNestedSubs
    return {
      store,
      subscription,
    }
  }, [store])

  // 获取当前的store中的state，作为上一次的state，将会在组件挂载完毕后，
  // 与store新的state比较，不一致的话更新Provider组件
  const previousState = useMemo(() => store.getState(), [store])

  useEffect(() => {
    const { subscription } = contextValue
    // 在组件挂载完毕后，订阅更新。至于如何订阅的，在下边讲到Subscription类的时候会讲到，
    // 这里先理解为最开始的时候需要订阅更新函数，便于在状态变化的时候执行更新函数
    subscription.trySubscribe()

     // 如果前后的store中的state有变化，那么就去更新Provider组件
    if (previousState !== store.getState()) {
      subscription.notifyNestedSubs()
    }
    return () => {
      // 组件卸载的时候，取消订阅
      subscription.tryUnsubscribe()
      subscription.onStateChange = null
    }
  }, [contextValue, previousState])

  const Context = context || ReactReduxContext
  return <Context.Provider value={contextValue}>{children}</Context.Provider>
}
```

所以结合代码看这个问题：__Provider是怎么把store放入context中的__，很好理解。
Provider最主要的功能是获取到我们传入的store，并将store作为context的其中一个值，向下层组件下发。

但是，一旦store变化，Provider要有所反应，以此保证将始终将最新的store放入context中。所以这里要用订阅来实现更新。自然引出Subscription类，通过该类的实例，将onStateChange监听到notifyNestedSubs上
```JavaScript
subscription.onStateChange = subscription.notifyNestedSubs
```

组件挂载完成后，去订阅更新，至于这里订阅的是什么，要看Subscription的实现。这里先给出结论：本质上订阅的是onStateChange，实现订阅的函数是：Subscription类内部的trySubscribe
```JavaScript
subscription.trySubscribe()
```

再接着，如果前后的state不一样，那么就去通知订阅者更新，onStateChange就会执行，Provider组件就会执行下层组件订阅到react-redux的更新函数。当Provider更新完成（componentDidUpdate）,会去比较一下前后的store是否相同，如果不同，那么用新的store作为context的值，并且取消订阅，重新订阅一个新的Subscription实例。保证用的数据都是最新的。

Provider将执行触发listeners执行的函数订阅到了store。

### Subscription

我们已经发现了，Provider组件是通过Subscription类中的方法来实现更新的，而过一会要讲到的connect高阶组件的更新，也是通过它来实现，可见Subscription是React-Redux实现订阅更新的核心机制。

```JavaScript
import { getBatch } from './batch'

// encapsulates the subscription logic for connecting a component to the redux store, as
// well as nesting subscriptions of descendant components, so that we can ensure the
// ancestor components re-render before descendants

const nullListeners = { notify() {} }

function createListenerCollection() {
  const batch = getBatch()
  let first = null
  let last = null

  return {
    clear() {
      first = null
      last = null
    },

    notify() {
      batch(() => {
        let listener = first
        while (listener) {
          listener.callback()
          listener = listener.next
        }
      })
    },

    get() {
      let listeners = []
      let listener = first
      while (listener) {
        listeners.push(listener)
        listener = listener.next
      }
      return listeners
    },

    subscribe(callback) {
      let isSubscribed = true

      let listener = (last = {
        callback,
        next: null,
        prev: last,
      })

      if (listener.prev) {
        listener.prev.next = listener
      } else {
        first = listener
      }

      return function unsubscribe() {
        if (!isSubscribed || first === null) return
        isSubscribed = false

        if (listener.next) {
          listener.next.prev = listener.prev
        } else {
          last = listener.prev
        }
        if (listener.prev) {
          listener.prev.next = listener.next
        } else {
          first = listener.next
        }
      }
    },
  }
}

export default class Subscription {
  constructor(store, parentSub) {
      // 获取store，要通过store来实现订阅
    this.store = store
    // 获取来自父级的subscription实例，主要是在connect的时候可能会用到
    this.parentSub = parentSub
    this.unsubscribe = null
    this.listeners = nullListeners

    this.handleChangeWrapper = this.handleChangeWrapper.bind(this)
  }

  addNestedSub(listener) {
    this.trySubscribe()
    // 因为这里是被parentSub调用的，所以listener也会被订阅到parentSub上，也就是从Provider中获取的subscription
    return this.listeners.subscribe(listener)
  }

  notifyNestedSubs() {
    //  通知listeners去执行
    this.listeners.notify()
  }

  handleChangeWrapper() {
    if (this.onStateChange) {
      // onStateChange会在外部的被实例化成subcription实例的时候，被赋值为不同的更新函数，被赋值的地方分别的Provider和connect中
      // 由于刚刚被订阅的函数就是handleChangeWrapper，而它也就相当于listener。所以当状态变化的时候，listener执行，onStateChange会执行
      this.onStateChange()
    }
  }

  isSubscribed() {
    return Boolean(this.unsubscribe)
  }

  trySubscribe() {
    if (!this.unsubscribe) {
      // parentSub实际上是subcription实例
      // 这里判断的是this.unsubscribe被赋值后的值，本质上也就是判断parentSub有没有，顺便再赋值给this.unsubscribe
      // 如果parentSub没传，那么使用store订阅，否则，调用context中获取的subscrption来订阅，保证都订阅到一个地方，具体会在下边说明
      this.unsubscribe = this.parentSub
        ? this.parentSub.addNestedSub(this.handleChangeWrapper)
        : this.store.subscribe(this.handleChangeWrapper)
        // 创建listener集合
      this.listeners = createListenerCollection()
    }
  }

  tryUnsubscribe() {
    // 取消订阅
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
      this.listeners.clear()
      this.listeners = nullListeners
    }
  }
}

```

Subscription就是将页面的更新工作和状态的变化联系起来，具体就是listener（触发页面更新的方法，在这里就是handleChangeWrapper），通过trySubscribe方法，根据情况被分别订阅到store或者Subscription内部。放入到listeners数组，当state变化的时候，listeners循环执行每一个监听器，触发页面更新。


