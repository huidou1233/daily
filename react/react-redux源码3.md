React-Redux的更新机制
===
React-Redux的更新机制也是属于订阅发布的模式。而且与Redux类似，一旦状态发生变化，调用listener更新页面。让我们根据这个过程抓取关键点：
* 更新谁？
* 订阅的更新函数是什么？
* 如何判断状态变化？

#### 更新谁？
回想一下平时使用React-Redux的时候，是不是只有被connect过并且传入了mapStateToProps的组件，会响应store的变化？
所以，被更新的是被connect过的组件，而connect返回的是connectAdvanced，并且并且connectAdvanced会返回我们传入的组件，
所以本质上是connectAdvanced内部依据store的变化更新自身，进而达到更新真正组件的目的。

#### 订阅的更新函数是什么？
这一点从connectAdvanced内部订阅的时候可以很直观地看出来：
```JavaScript
subscription.onStateChange = checkForUpdates
subscription.trySubscribe()
```

订阅的函数是checkForUpdates，重要的是这个checkForUpdates做了什么，能让组件更新。在connectAdvanced中使用useReducer内置了一个reducer，这个函数做的事情就是在前置条件（状态变化）成立的时候，dispatch一个action，来触发更新。

#### 如何判断状态变化？
这个问题很好理解，因为每次redux返回的都是一个新的state。直接判断前后的state的引用是否相同，就可以了

#### connect核心--connectAdvanced

connectAdvanced是一个比较重量级的高阶函数，上边大致说了更新机制，但很多具体做法都是在connectAdvanced中实现的。源码很长，逻辑有一些复杂，我写了详细的注释。看的过程需要思考函数之间的调用关系以及目的，每个变量的意义，带着上边的结论，相信不难看懂。

```JavaScript

import { useEffect, useLayoutEffect } from 'react'

// React currently throws a warning when using useLayoutEffect on the server.
// To get around it, we can conditionally useEffect on the server (no-op) and
// useLayoutEffect in the browser. We need useLayoutEffect to ensure the store
// subscription callback always has the selector from the latest render commit
// available, otherwise a store update may happen between render and the effect,
// which may cause missed updates; we also must ensure the store subscription
// is created synchronously, otherwise a store update may occur before the
// subscription is created and an inconsistent state may be observed
// ReactHooks文档对useLayoutEffect的说明：在浏览器执行绘制之前，useLayoutEffect 内部的更新计划将被同步刷新。
// useEffect的effect将在每轮渲染结束后执行，useLayoutEffect的effect在dom变更之后，绘制之前执行。
// 这里的effect做的是更新工作
// 在服务端渲染的时候页面已经出来了，有可能js还未加载完成。
// 所以需要在SSR阶段使用useEffect，保证在页面由js接管后，如果需要更新了，再去更新。
// 而在浏览器环境则不存在这样的问题
// 根据是否存在window确定是服务端还是浏览器端
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' &&
  typeof window.document !== 'undefined' &&
  typeof window.document.createElement !== 'undefined'
    ? useLayoutEffect
    : useEffect


// 这是保留组件的静态方法的库
import hoistStatics from 'hoist-non-react-statics'
import React, { useContext, useMemo, useRef, useReducer } from 'react'
import { isValidElementType, isContextConsumer } from 'react-is'
import Subscription from '../utils/Subscription'
import { useIsomorphicLayoutEffect } from '../utils/useIsomorphicLayoutEffect'

import { ReactReduxContext } from './Context'

// Define some constant arrays just to avoid re-creating these
const EMPTY_ARRAY = []
const NO_SUBSCRIPTION_ARRAY = [null, null]

const stringifyComponent = Comp => {
  try {
    return JSON.stringify(Comp)
  } catch (err) {
    return String(Comp)
  }
}

// 内置的reducer
function storeStateUpdatesReducer (state, action) {
  const [, updateCount] = state
  return [action.payload, updateCount + 1]
}

function useIsomorphicLayoutEffectWithArgs (
  effectFunc,
  effectArgs,
  dependencies
) {
  useIsomorphicLayoutEffect(() => effectFunc(...effectArgs), dependencies)
}

function captureWrapperProps (
  lastWrapperProps,
  lastChildProps,
  renderIsScheduled,
  wrapperProps,
  actualChildProps,
  childPropsFromStoreUpdate,
  notifyNestedSubs
) {
  // We want to capture the wrapper props and child props we used for later comparisons
  lastWrapperProps.current = wrapperProps // 获取到组件自己的props
  lastChildProps.current = actualChildProps // 获取到注入到组件的props
  renderIsScheduled.current = false // 表明已经过了渲染阶段

  // If the render was from a store update, clear out that reference and cascade the subscriber update
  // 如果来自store的props更新了，那么通知listeners去执行，也就是执行先前被订阅的this.handleChangeWrapper（Subscription类中），
  // handleChangeWrapper中调用的是onStateChange，也就是在下边赋值的负责更新页面的函数checkForUpdates
  if (childPropsFromStoreUpdate.current) {
    childPropsFromStoreUpdate.current = null
    notifyNestedSubs()
  }
}

function subscribeUpdates (
  shouldHandleStateChanges,
  store,
  subscription,
  childPropsSelector,
  lastWrapperProps,
  lastChildProps,
  renderIsScheduled,
  childPropsFromStoreUpdate,
  notifyNestedSubs,
  forceComponentUpdateDispatch
) {
  // If we're not subscribed to the store, nothing to do here
  // 如果没有订阅，直接return，shouldHandleStateChanges默认为true，所以默认情况会继续执行
  if (!shouldHandleStateChanges) return

  // Capture values for checking if and when this component unmounts
  // 当组件卸载的时候，用闭包，声明两个变量标记是否被取消订阅和错误对象
  let didUnsubscribe = false
  let lastThrownError = null

  // We'll run this callback every time a store subscription update propagates to this component
  // 当store或者subscription变化的时候，回调会被重新执行，从而实现重新订阅
  const checkForUpdates = () => {
    if (didUnsubscribe) {
      // Don't run stale listeners.
      // Redux doesn't guarantee unsubscriptions happen until next dispatch.
      // 如果取消订阅了，那啥都不做
      return
    }

    // 获取到最新的state
    const latestStoreState = store.getState()

    let newChildProps, error
    try {
      // Actually run the selector with the most recent store state and wrapper props
      // to determine what the child props should be
      // 使用selector获取到最新的props
      newChildProps = childPropsSelector(
        latestStoreState,
        lastWrapperProps.current
      )
    } catch (e) {
      error = e
      lastThrownError = e
    }

    if (!error) {
      lastThrownError = null
    }

    // If the child props haven't changed, nothing to do here - cascade the subscription update
    // 如果props没变化，只通知一下listeners更新
    if (newChildProps === lastChildProps.current) {
      /*
       * 浏览器环境下，useLayoutEffect的执行时机是DOM变更之后，绘制之前。
       * 由于上边的useIsomorphicLayoutEffect在这个时机执行将renderIsScheduled.current设置为false，
       * 所以会走到判断内部，保证在正确的时机触发更新
       *
       * */
      if (!renderIsScheduled.current) {
        notifyNestedSubs()
      }
    } else {
      // Save references to the new child props.  Note that we track the "child props from store update"
      // as a ref instead of a useState/useReducer because we need a way to determine if that value has
      // been processed.  If this went into useState/useReducer, we couldn't clear out the value without
      // forcing another re-render, which we don't want.
      /*
       * 如果props有变化，将新的props缓存起来，并且将childPropsFromStoreUpdate.current设置为新的props，便于在第一个
       * useIsomorphicLayoutEffect执行的时候能够识别出props确实是更新了
       * */
      lastChildProps.current = newChildProps
      childPropsFromStoreUpdate.current = newChildProps
      renderIsScheduled.current = true

      // If the child props _did_ change (or we caught an error), this wrapper component needs to re-render
      // 当dispatch 内置的action时候，ConnectFunction这个组件会更新，从而达到更新组件的目的
      forceComponentUpdateDispatch({
        type: 'STORE_UPDATED',
        payload: {
          error
        }
      })
    }
  }

  // Actually subscribe to the nearest connected ancestor (or store)
  // onStateChange的角色也就是listener。在provider中，赋值为更新listeners。在ConnectFunction中赋值为checkForUpdates
  // 而checkForUpdates做的工作就是根据props的变化，相当于listener，更新ConnectFunction自身
  subscription.onStateChange = checkForUpdates
  subscription.trySubscribe()

  // Pull data from the store after first render in case the store has
  // changed since we began.
  // 第一次渲染后先执行一次，从store中同步数据
  checkForUpdates()
  // 返回一个取消订阅的函数，目的是在组件卸载时取消订阅
  const unsubscribeWrapper = () => {
    didUnsubscribe = true
    subscription.tryUnsubscribe()
    subscription.onStateChange = null

    if (lastThrownError) {
      // It's possible that we caught an error due to a bad mapState function, but the
      // parent re-rendered without this component and we're about to unmount.
      // This shouldn't happen as long as we do top-down subscriptions correctly, but
      // if we ever do those wrong, this throw will surface the error in our tests.
      // In that case, throw the error from here so it doesn't get lost.
      throw lastThrownError
    }
  }

  return unsubscribeWrapper
}

const initStateUpdates = () => [null, 0]

export default function connectAdvanced (
  /*
    selectorFactory is a func that is responsible for returning the selector function used to
    compute new props from state, props, and dispatch. For example:

      export default connectAdvanced((dispatch, options) => (state, props) => ({
        thing: state.things[props.thingId],
        saveThing: fields => dispatch(actionCreators.saveThing(props.thingId, fields)),
      }))(YourComponent)

    Access to dispatch is provided to the factory so selectorFactories can bind actionCreators
    outside of their selector as an optimization. Options passed to connectAdvanced are passed to
    the selectorFactory, along with displayName and WrappedComponent, as the second argument.

    Note that selectorFactory is responsible for all caching/memoization of inbound and outbound
    props. Do not use connectAdvanced directly without memoizing results between calls to your
    selector, otherwise the Connect component will re-render on every state or props change.
  */
  selectorFactory,
  // options object:
  {
    // the func used to compute this HOC's displayName from the wrapped component's displayName.
    // probably overridden by wrapper functions such as connect()
    // 获取被connect包裹之后的组件名
    getDisplayName = name => `ConnectAdvanced(${name})`,

    // shown in error messages
    // probably overridden by wrapper functions such as connect()
    // 为了报错信息的显示
    methodName = 'connectAdvanced',

    // 直接翻译的英文注释：如果被定义, 名为此值的属性将添加到传递给被包裹组件的 props 中。它的值将是组件被渲染的次数，这对于跟踪不必要的重新渲染非常有用。默认值: undefined
    renderCountProp = undefined,

    // connect组件是否应响应store的变化
    shouldHandleStateChanges = true,

    // REMOVED: the key of props/context to get the store
    // 使用了多个store的时候才需要用这个，目的是为了区分该获取哪个store
    storeKey = 'store',

    // REMOVED: expose the wrapped component via refs
    // 如果为 true，则将一个引用存储到被包裹的组件实例中，
    // 并通过 getWrappedInstance()获取到。
    withRef = false,

    // use React's forwardRef to expose a ref of the wrapped component
    // 用于将ref传递进来
    forwardRef = false,

    // the context consumer to use
    // 组件内部使用的context，用户可自定义
    context = ReactReduxContext,

    // additional options are passed through to the selectorFactory
    // 其余的配置项，selectorFactory应该会用到
    ...connectOptions
  } = {}
) {
  if (process.env.NODE_ENV !== 'production') {
    if (renderCountProp !== undefined) {
      throw new Error(
        `renderCountProp is removed. render counting is built into the latest React Dev Tools profiling extension`
      )
    }
    if (withRef) {
      throw new Error(
        'withRef is removed. To access the wrapped instance, use a ref on the connected component'
      )
    }

    const customStoreWarningMessage =
      'To use a custom Redux store for specific components, create a custom React context with ' +
      "React.createContext(), and pass the context object to React Redux's Provider and specific components" +
      ' like: <Provider context={MyContext}><ConnectedComponent context={MyContext} /></Provider>. ' +
      'You may also pass a {context : MyContext} option to connect'

    if (storeKey !== 'store') {
      throw new Error(
        'storeKey has been removed and does not do anything. ' +
        customStoreWarningMessage
      )
    }
  }

  // 获取context
  const Context = context

  return function wrapWithConnect (WrappedComponent) {
    if (
      process.env.NODE_ENV !== 'production' &&
      !isValidElementType(WrappedComponent)
    ) {
      throw new Error(
        `You must pass a component to the function returned by ` +
        `${methodName}. Instead received ${stringifyComponent(
          WrappedComponent
        )}`
      )
    }

    const wrappedComponentName =
      WrappedComponent.displayName || WrappedComponent.name || 'Component'

    const displayName = getDisplayName(wrappedComponentName)

    // 定义selectorFactoryOptions，为构造selector做准备
    const selectorFactoryOptions = {
      ...connectOptions,
      getDisplayName,
      methodName,
      renderCountProp,
      shouldHandleStateChanges,
      storeKey,
      displayName,
      wrappedComponentName,
      WrappedComponent
    }

    const { pure } = connectOptions

    /* 调用createChildSelector => createChildSelector(store)(state, ownProps)
     createChildSelector返回了selectorFactory的带参调用，而selectorFactory实际上是其内部根据options.pure返回的
     impureFinalPropsSelectorFactory 或者是 pureFinalPropsSelectorFactory的调用，而这两个函数需要的参数是(state, ownProps)
    */
    function createChildSelector (store) {
      // 这里是selectorFactory.js中finalPropsSelectorFactory的调用，传入dispatch，和options
      return selectorFactory(store.dispatch, selectorFactoryOptions)
    }

    // If we aren't running in "pure" mode, we don't want to memoize values.
    // To avoid conditionally calling hooks, we fall back to a tiny wrapper
    // that just executes the given callback immediately.
    // 根据是否是pure模式来决定是否需要对更新的方式做优化，pure在这里的意义类似于React的PureComponent
    const usePureOnlyMemo = pure ? useMemo : callback => callback()

    function ConnectFunction (props) {
      // props变化，获取最新的context,forwardedRef以及组件其他props
      const [
        propsContext,
        reactReduxForwardedRef,
        wrapperProps
      ] = useMemo(() => {
        // Distinguish between actual "data" props that were passed to the wrapper component,
        // and values needed to control behavior (forwarded refs, alternate context instances).
        // To maintain the wrapperProps object reference, memoize this destructuring.
        const { reactReduxForwardedRef, ...wrapperProps } = props
        return [props.context, reactReduxForwardedRef, wrapperProps]
      }, [props])

      // propsContext或Context发生变化，决定使用哪个context，如果propsContext存在则优先使用
      const ContextToUse = useMemo(() => {
        // Users may optionally pass in a custom context instance to use instead of our ReactReduxContext.
        // Memoize the check that determines which context instance we should use.
        // 用户可能会用自定义的context来代替ReactReduxContext，缓存住我们应该用哪个context实例
        // Users may optionally pass in a custom context instance to use instead of our ReactReduxContext.
        // Memoize the check that determines which context instance we should use.
        return propsContext &&
          propsContext.Consumer &&
          isContextConsumer(<propsContext.Consumer />)
          ? propsContext
          : Context
      }, [propsContext, Context])

      // 通过上层组件获取上下文中的store
      // 当上层组件最近的context变化的时候，返回该context的当前值，也就是store
      const contextValue = useContext(ContextToUse)

      // The store _must_ exist as either a prop or in context.
      // We'll check to see if it _looks_ like a Redux store first.
      // This allows us to pass through a `store` prop that is just a plain value.
      // store必须存在于prop或者context中
      // 判断store是否是来自props中的store
      const didStoreComeFromProps =
        Boolean(props.store) &&
        Boolean(props.store.getState) &&
        Boolean(props.store.dispatch)
      // 判断store是否是来自context中的store
      const didStoreComeFromContext =
        Boolean(contextValue) && Boolean(contextValue.store)

      if (
        process.env.NODE_ENV !== 'production' &&
        !didStoreComeFromProps &&
        !didStoreComeFromContext
      ) {
        throw new Error(
          `Could not find "store" in the context of ` +
          `"${displayName}". Either wrap the root component in a <Provider>, ` +
          `or pass a custom React context provider to <Provider> and the corresponding ` +
          `React context consumer to ${displayName} in connect options.`
        )
      }

      // Based on the previous check, one of these must be true
      // 从context中取出store，准备被selector处理之后注入到组件。优先使用props中的store
      const store = didStoreComeFromProps ? props.store : contextValue.store

      // 仅当store变化的时候，创建selector
      // childPropsSelector调用方式： childPropsSelector(dispatch, options)
      const childPropsSelector = useMemo(() => {
        // selector的创建需要依赖于传入store
        // 每当store变化的时候重新创建这个selector
        return createChildSelector(store)
      }, [store])

      const [subscription, notifyNestedSubs] = useMemo(() => {
        if (!shouldHandleStateChanges) return NO_SUBSCRIPTION_ARRAY

        // This Subscription's source should match where store came from: props vs. context. A component
        // connected to the store via props shouldn't use subscription from context, or vice versa.
        // 如果store是从props中来的，就不再传入subscription实例，否则使用context中传入的subscription实例
        const subscription = new Subscription(
          store,
          didStoreComeFromProps ? null : contextValue.subscription
        )
        const notifyNestedSubs = subscription.notifyNestedSubs.bind(
          subscription
        )

        return [subscription, notifyNestedSubs]
      }, [store, didStoreComeFromProps, contextValue])

      // Determine what {store, subscription} value should be put into nested context, if necessary,
      // and memoize that value to avoid unnecessary context updates.
      // contextValue就是store，将store重新覆盖一遍，注入subscription，这样被connect的组件在context中可以拿到subscription
      const overriddenContextValue = useMemo(() => {
        if (didStoreComeFromProps) {
          // 如果组件是直接订阅到来自props中的store，就直接使用来自props中的context
          return contextValue
        }

        // Otherwise, put this component's subscription instance into context, so that
        // connected descendants won't update until after this component is done
        // 如果store是从context获取的，那么将subscription放入上下文，
        // 为了保证在component更新完毕之前被connect的子组件不会更新
        return {
          ...contextValue,
          subscription
        }
      }, [didStoreComeFromProps, contextValue, subscription])

      // We need to force this wrapper component to re-render whenever a Redux store update
      // causes a change to the calculated child component props (or we caught an error in mapState)
      // 内置reducer，来使组件更新，在checkForUpdates函数中会用到，作为更新机制的核心
      const [
        [previousStateUpdateResult],
        forceComponentUpdateDispatch
      ] = useReducer(storeStateUpdatesReducer, EMPTY_ARRAY, initStateUpdates)

      // Propagate any mapState/mapDispatch errors upwards
      if (previousStateUpdateResult && previousStateUpdateResult.error) {
        throw previousStateUpdateResult.error
      }

      // Set up refs to coordinate values between the subscription effect and the render logic
      /*
       * 官方解释：
       * useRef 返回一个可变的 ref 对象，其 .current 属性被初始化为传入的参数（initialValue）。
       * 返回的 ref 对象在组件的整个生命周期内保持不变。
       *
       * ref不仅用于DOM，useRef()的current属性可以用来保存值，类似于类的实例属性
       *
       * */
      const lastChildProps = useRef() // 组件的props，包括来自父级的，store，dispatch
      const lastWrapperProps = useRef(wrapperProps) // 组件本身来自父组件的props
      const childPropsFromStoreUpdate = useRef() // 标记来自store的props是否被更新了
      const renderIsScheduled = useRef(false) // 标记更新的时机

      /*
       * actualChildProps是真正要注入到组件中的props
       * */
      const actualChildProps = usePureOnlyMemo(() => {
        // Tricky logic here:
        // - This render may have been triggered by a Redux store update that produced new child props
        // - However, we may have gotten new wrapper props after that
        // If we have new child props, and the same wrapper props, we know we should use the new child props as-is.
        // But, if we have new wrapper props, those might change the child props, so we have to recalculate things.
        // So, we'll use the child props from store update only if the wrapper props are the same as last time.
        /*
         * 意译：
         * 这个渲染将会在store的更新产生新的props时候被触发，然而，我们可能会在这之后接收到来自父组件的新的props，如果有新的props，
         * 并且来自父组件的props不变，我们应该依据新的child props来更新。但是来自父组件的props更新也会导致整体props的改变，不得不重新计算。
         * 所以只在新的props改变并且来自父组件的props和上次一致（下边代码中的判断条件成立）的情况下，才去更新
         *
         * 也就是说只依赖于store变动引起的props更新来重新渲染
         * */
        if (
          childPropsFromStoreUpdate.current &&
          wrapperProps === lastWrapperProps.current
        ) {
          return childPropsFromStoreUpdate.current
        }

        // TODO We're reading the store directly in render() here. Bad idea?
        // This will likely cause Bad Things (TM) to happen in Concurrent Mode.
        // Note that we do this because on renders _not_ caused by store updates, we need the latest store state
        // to determine what the child props should be.
        return childPropsSelector(store.getState(), wrapperProps)
      }, [store, previousStateUpdateResult, wrapperProps])

      // We need this to execute synchronously every time we re-render. However, React warns
      // about useLayoutEffect in SSR, so we try to detect environment and fall back to
      // just useEffect instead to avoid the warning, since neither will run anyway.
      /*
       * 意译：我们需要在每次重新渲染的时候同步执行这个effect。但是react将会在SSR的情况放下对于useLayoutEffect做出警告，
       * 所以useIsomorphicLayoutEffect的最终结果是通过环境判断得出的useEffect或useLayoutEffect。在服务端渲染的时候使用useEffect，
       * 因为在这种情况下useEffect会等到js接管页面以后再去执行，所以就不会warning了
       * */
      /*
       * 整体看上下有两个useIsomorphicLayoutEffect，不同之处在于它们两个的执行时机。
       *
       * 第一个没有传入依赖项数组，所以effect会在每次重新渲染的时候执行，负责每次重新渲染的
       * 时候检查来自store的数据有没有变化，变化就通知listeners去更新
       *
       * 第二个依赖于store, subscription, childPropsSelector。所以在这三个变化的时候，去执行effect。
       * 其内部的effect做的事情有别于第一个，负责定义更新函数checkForUpdates、订阅更新函数，便于在第一个effect响应store更新的时候，
       * 可以将更新函数作为listener执行，来达到更新页面的目的
       *
       * */
      useIsomorphicLayoutEffectWithArgs(captureWrapperProps, [
        lastWrapperProps,
        lastChildProps,
        renderIsScheduled,
        wrapperProps,
        actualChildProps,
        childPropsFromStoreUpdate,
        notifyNestedSubs
      ])

      // Our re-subscribe logic only runs when the store/subscription setup changes
      // 重新订阅仅在store内的subscription变化时才会执行。这两个变化了，也就意味着要重新订阅，因为保证传递最新的数据，所以之前的订阅已经没有意义了
      useIsomorphicLayoutEffectWithArgs(
        subscribeUpdates,
        [
          shouldHandleStateChanges,
          store,
          subscription,
          childPropsSelector,
          lastWrapperProps,
          lastChildProps,
          renderIsScheduled,
          childPropsFromStoreUpdate,
          notifyNestedSubs,
          forceComponentUpdateDispatch
        ],
        [store, subscription, childPropsSelector]
      )

      // Now that all that's done, we can finally try to actually render the child component.
      // We memoize the elements for the rendered child component as an optimization.
      // 将组件的props注入到我们传入的真实组件中
      const renderedWrappedComponent = useMemo(
        () => (
          <WrappedComponent
            {...actualChildProps}
            ref={reactReduxForwardedRef}
          />
        ),
        [reactReduxForwardedRef, WrappedComponent, actualChildProps]
      )

      // If React sees the exact same element reference as last time, it bails out of re-rendering
      // that child, same as if it was wrapped in React.memo() or returned false from shouldComponentUpdate.
      const renderedChild = useMemo(() => {
        if (shouldHandleStateChanges) {
          // If this component is subscribed to store updates, we need to pass its own
          // subscription instance down to our descendants. That means rendering the same
          // Context instance, and putting a different value into the context.
          /*
          * 意译：
            如果这个组件订阅了store的更新，就需要把它自己订阅的实例往下传，也就意味这其自身与其
            后代组件都会渲染同一个Context实例，只不过可能会向context中放入不同的值

            再套一层Provider，将被重写的context放入value。
            这是什么意思呢？也就是说，有一个被connect的组件，又嵌套了一个被connect的组件，
            保证这两个从context中获取的subscription是同一个，而它们可能都会往context中新增加值，
            我加了一个，我的子组件也加了一个。最终的context是所有组件的value的整合，而subscription始终是同一个
          * */
          return (
            <ContextToUse.Provider value={overriddenContextValue}>
              {renderedWrappedComponent}
            </ContextToUse.Provider>
          )
        }
        // 依赖于接收到的context，传入的组件，context的value的变化来决定是否重新渲染
        return renderedWrappedComponent
      }, [ContextToUse, renderedWrappedComponent, overriddenContextValue])

      return renderedChild
    }

    // If we're in "pure" mode, ensure our wrapper component only re-renders when incoming props have changed.
    // 根据pure决定渲染逻辑
    const Connect = pure ? React.memo(ConnectFunction) : ConnectFunction

    // 添加组件名
    Connect.WrappedComponent = WrappedComponent
    Connect.displayName = displayName

    // 如果forwardRef为true，将ref注入到Connect组件，便于获取到组件的DOM实例
    if (forwardRef) {
      const forwarded = React.forwardRef(function forwardConnectRef (
        props,
        ref
      ) {
        return <Connect {...props} reactReduxForwardedRef={ref} />
      })

      forwarded.displayName = displayName
      forwarded.WrappedComponent = WrappedComponent
      return hoistStatics(forwarded, WrappedComponent)
    }

    // 保留组件的静态方法
    return hoistStatics(Connect, WrappedComponent)
  }
}

```

看完了源码，我们整体概括一下React-Redux中被connect的组件的更新机制：
这其中有三个要素必不可少：

* 根据谁变化（store）
* 更新函数（checkForUpdates）
* 将store和更新函数建立联系的Subscription

connectAdvanced函数内从context中获取store，再获取subscription实例（可能来自context或新创建），然后创建更新函数checkForUpdates，当组件初始化，或者store、Subscription实例、selector变化的时候，订阅或者重新订阅。在每次组件更新的时候，检查一下store是否变化，有变化则通知更新，实际上执行checkForUpdates，本质上调用内置reducer更新组件。每次更新导致selector重新计算，所以组件总是能获取到最新的props。所以说，更新机制的最底层是通过connectAdvanced内置的Reducer来实现的。

### 总结
至此，围绕常用的功能，React-Redux的源码就解读完了。回到文章最开始的三个问题：

Provider是怎么把store放入context中的
如何将store中的state和dispatch(或者调用dispatch的函数)注入组件的props中的
我们都知道在Redux中，可以通过store.subscribe()订阅一个更新页面的函数，来实现store变化，更新UI，而React-Redux是如何做到
store变化，被connect的组件也会更新的
现在我们应该可以明白，这三个问题对应着React-Redux的三个核心概念：

Provider将数据由顶层注入
Selector生成组件的props
React-Redux的更新机制
它们协同工作也就是React-Redux的运行机制：Provider将数据放入context，connect的时候会从context中取出store，获取mapStateToProps，mapDispatchToProps，使用selectorFactory生成Selector作为props注入组件。其次订阅store的变化，每次更新组件会取到最新的props。