如何向组件中注入state和dispatch
===

将store从应用顶层注入后，该考虑如何向组件中注入state和dispatch了。

正常顺序肯定是先拿到store，再以某种方式分别执行这两个函数，将store中的state和dispatch，以及组件自身的props作为mapStateToProps和mapDispatchToProps的参数，传进去，我们就可以在这两个函数之内能拿到这些值。而它们的返回值，又会再注入到组件的props中。

说到这里，就要引出一个概念：selector。最终注入到组件的props是selectorFactory函数生成的selector的返回值，所以也就是说，mapStateToProps和mapDispatchToProps本质上就是selector。

生成的过程是在connect的核心函数connectAdvanced中，这个时候可以拿到当前context中的store，进而用store传入selectorFactory生成selector，其形式为

```JavaScript
function selector(stateOrDispatch, ownProps) {
  ...
  return props
}
```
通过形式可以看出：selector就相当于mapStateToProps或者mapDispatchToProps，selector的返回值将作为props注入到组件中。

#### 从mapToProps到selector

标题的mapToProps泛指mapStateToProps， mapDispatchToProps， mergeProps

结合日常的使用可知，我们的组件在被connect包裹之后才能拿到state和dispatch，所以我们先带着上边的结论，单独梳理selector的机制，先看connect的源码：

```JavaScript
export function createConnect({
  connectHOC = connectAdvanced,
  mapStateToPropsFactories = defaultMapStateToPropsFactories,
  mapDispatchToPropsFactories = defaultMapDispatchToPropsFactories,
  mergePropsFactories = defaultMergePropsFactories,
  selectorFactory = defaultSelectorFactory,
} = {}) {
  return function connect(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps,
    {
      pure = true,
      areStatesEqual = strictEqual,
      areOwnPropsEqual = shallowEqual,
      areStatePropsEqual = shallowEqual,
      areMergedPropsEqual = shallowEqual,
      ...extraOptions
    } = {}
  ) {

    // 将我们传入的mapStateToProps， mapDispatchToProps， mergeProps都初始化一遍
    const initMapStateToProps = match(
      mapStateToProps,
      mapStateToPropsFactories,
      'mapStateToProps'
    )
    const initMapDispatchToProps = match(
      mapDispatchToProps,
      mapDispatchToPropsFactories,
      'mapDispatchToProps'
    )
    const initMergeProps = match(mergeProps, mergePropsFactories, 'mergeProps')

    // 返回connectHOC函数的调用，connectHOC的内部是connect的核心
    return connectHOC(selectorFactory, {
      // used in error messages
      methodName: 'connect',

      // used to compute Connect's displayName from the wrapped component's displayName.
      getDisplayName: (name) => `Connect(${name})`,

      // if mapStateToProps is falsy, the Connect component doesn't subscribe to store state changes
      shouldHandleStateChanges: Boolean(mapStateToProps),

      // passed through to selectorFactory
      initMapStateToProps,
      initMapDispatchToProps,
      initMergeProps,
      pure,
      areStatesEqual,
      areOwnPropsEqual,
      areStatePropsEqual,
      areMergedPropsEqual,

      // any extra options args can override defaults of connect or connectAdvanced
      ...extraOptions,
    })
  }
}
```

connect实际上是createConnect，createConnect也只是返回了一个connect函数，而connect函数返回了connectHOC的调用（也就是connectAdvanced的调用），再继续，connectAdvanced的调用最终会返回一个wrapWithConnect高阶组件，这个函数的参数是我们传入的组件。所以才有了connect平常的用法：

```JavaScript
connect(mapStateToProps, mapDispatchToProps)(Component)
```

大家应该注意到了connect函数内将mapStateToProps，mapDispatchToProps，mergeProps都初始化了一遍，为什么要去初始化而不直接使用呢？带着疑问，我们往下看。

#### 初始化selector过程

先看代码，主要看initMapStateToProps 和 initMapDispatchToProps，看一下这段代码是什么意思。

```JavaScript
    const initMapStateToProps = match(
      mapStateToProps,
      mapStateToPropsFactories,
      'mapStateToProps'
    )
    const initMapDispatchToProps = match(
      mapDispatchToProps,
      mapDispatchToPropsFactories,
      'mapDispatchToProps'
    )
    const initMergeProps = match(mergeProps, mergePropsFactories, 'mergeProps')
```
mapStateToPropsFactories 和 mapDispatchToPropsFactories都是函数数组，其中的每个函数都会接收一个参数，为mapStateToProps或者mapDispatchToProps。而match函数的作用就是循环函数数组，mapStateToProps或者mapDispatchToProps作为每个函数的入参去执行，当此时的函数返回值不为假的时候，赋值给左侧。看一下match函数：
```JavaScript
function match(arg, factories, name) {
  // 循环执行factories，这里的factories也就是mapStateToProps和mapDisPatchToProps两个文件中暴露出来的处理函数数组
  for (let i = factories.length - 1; i >= 0; i--) {
    // arg也就是mapStateToProps或者mapDispatchToProps
    // 这里相当于将数组内的每个函数执行了一遍，并将我们的mapToProps函数作为参数传进去
    const result = factories[i](arg)
    if (result) return result
  }

  return (dispatch, options) => {
    throw new Error(
      `Invalid value of type ${typeof arg} for ${name} argument when connecting component ${
        options.wrappedComponentName
      }.`
    )
  }
}
```

match循环的是一个函数数组，下面我们看一下这两个数组，分别是mapStateToPropsFactories 和 mapDispatchToPropsFactories：
（下边源码中的whenMapStateToPropsIsFunction函数会放到后边讲解）

* mapStateToPropsFactories
  ```JavaScript
  import { wrapMapToPropsConstant, wrapMapToPropsFunc } from './wrapMapToProps'

  // 当mapStateToProps是函数的时候，调用wrapMapToPropsFunc
  export function whenMapStateToPropsIsFunction(mapStateToProps) {
    return typeof mapStateToProps === 'function'
      ? wrapMapToPropsFunc(mapStateToProps, 'mapStateToProps')
      : undefined
  }

  // 当mapStateToProps没有传的时候，调用wrapMapToPropsConstant
  export function whenMapStateToPropsIsMissing(mapStateToProps) {
    return !mapStateToProps ? wrapMapToPropsConstant(() => ({})) : undefined
  }

  export default [whenMapStateToPropsIsFunction, whenMapStateToPropsIsMissing]
  ```

  实际上是让whenMapStateToPropsIsFunction和whenMapStateToPropsIsMissing都去执行一次mapStateToProps，然后根据传入的mapStateToProps的情况来选出有执行结果的函数赋值给initMapStateToProps。

  单独看一下whenMapStateToPropsIsMissing

  ```JavaScript
    export function wrapMapToPropsConstant(getConstant) {
      return function initConstantSelector(dispatch, options) {
        const constant = getConstant(dispatch, options)

        function constantSelector() {
          return constant
        }
        constantSelector.dependsOnOwnProps = false
        return constantSelector
      }
    }
  ```
  wrapMapToPropsConstant返回了一个函数，接收的参数是我们传入的() => ({})，函数内部调用了入参函数并赋值给一个常量放入了constantSelector中，
  该常量实际上就是我们不传mapStateToProps时候的生成的selector，这个selector返回的是空对象，所以不会接受任何来自store中的state。同时可以看到constantSelector.dependsOnOwnProps = false，表示返回值与connect高阶组件接收到的props无关。

* mapDispatchToPropsFactories
  
  ```JavaScript
    import { bindActionCreators } from 'redux'
    import { wrapMapToPropsConstant, wrapMapToPropsFunc } from './wrapMapToProps'

    export function whenMapDispatchToPropsIsFunction(mapDispatchToProps) {
      return typeof mapDispatchToProps === 'function'
        ? wrapMapToPropsFunc(mapDispatchToProps, 'mapDispatchToProps')
        : undefined
    }

    // 当不传mapDispatchToProps时，默认向组件中注入dispatch
    export function whenMapDispatchToPropsIsMissing(mapDispatchToProps) {
      return !mapDispatchToProps
        ? wrapMapToPropsConstant((dispatch) => ({ dispatch }))
        : undefined
    }

    // 当传入的mapDispatchToProps是对象，利用bindActionCreators进行处理 
    export function whenMapDispatchToPropsIsObject(mapDispatchToProps) {
      return mapDispatchToProps && typeof mapDispatchToProps === 'object'
        ? wrapMapToPropsConstant((dispatch) =>
            bindActionCreators(mapDispatchToProps, dispatch)
          )
        : undefined
    }

    export default [
      whenMapDispatchToPropsIsFunction,
      whenMapDispatchToPropsIsMissing,
      whenMapDispatchToPropsIsObject,
    ]

  ```

  没有传递mapDispatchToProps的时候，会调用whenMapDispatchToPropsIsMissing，这个时候，constantSelector只会返回一个dispatch，所以只能在组件中接收到dispatch。
  当传入的mapDispatchToProps是对象的时候，也是调用wrapMapToPropsConstant，根据前边的了解，这里注入到组件中的属性是bindActionCreators(mapDispatchToProps, dispatch)的执行结果。

  现在，让我们看一下whenMapStateToPropsIsFunction这个函数。它是在mapDispatchToProps与mapStateToProps都是函数的时候调用的，实现也比较复杂。这里只单用mapStateToProps来举例说明。

  再提醒一下：下边的mapToProps指的是mapDispatchToProps或mapStateToProps

  ```JavaScript
    // 根据mapStateToProps函数的参数个数，判断组件是否应该依赖于自己的props
    export function getDependsOnOwnProps(mapToProps) {
      return mapToProps.dependsOnOwnProps !== null &&
        mapToProps.dependsOnOwnProps !== undefined
        ? Boolean(mapToProps.dependsOnOwnProps)
        : mapToProps.length !== 1
    }

    export function wrapMapToPropsFunc(mapToProps, methodName) {
      // 最终wrapMapToPropsFunc返回的是一个proxy函数，返回的函数会在selectorFactory函数中
      // 的finalPropsSelectorFactory内被调用并赋值给其他变量。
      // 而这个proxy函数会在selectorFactory中执行，生成最终的selector
      return function initProxySelector(dispatch, { displayName }) {
        const proxy = function mapToPropsProxy(stateOrDispatch, ownProps) {
          // 根据组件是否依赖自身的props决定调用的时候传什么参数
          return proxy.dependsOnOwnProps
            ? proxy.mapToProps(stateOrDispatch, ownProps)
            : proxy.mapToProps(stateOrDispatch)
        }

        // allow detectFactoryAndVerify to get ownProps
        proxy.dependsOnOwnProps = true

        proxy.mapToProps = function detectFactoryAndVerify(
          stateOrDispatch,
          ownProps
        ) {
          // 将proxy.mapToProps赋值为我们传入的mapToProps
          proxy.mapToProps = mapToProps
          // 根据组件是否传入了组件本身从父组件接收的props来确定是否需要向组件中注入ownProps，
          // 最终会用来实现组件自身的props变化，也会调用mapToProps的效果
          proxy.dependsOnOwnProps = getDependsOnOwnProps(mapToProps)
          // 再去执行proxy，这时候proxy.mapToProps已经被赋值为我们传进来的mapToProps函数，
          // 所以props就会被赋值成传进来的mapToProps的返回值
          let props = proxy(stateOrDispatch, ownProps)

          if (typeof props === 'function') {
            // 如果返回值是函数，那么再去执行这个函数，再将store中的state或dispatch，以及ownProps再传进去
            proxy.mapToProps = props
            proxy.dependsOnOwnProps = getDependsOnOwnProps(props)
            props = proxy(stateOrDispatch, ownProps)
          }

          if (process.env.NODE_ENV !== 'production')
            verifyPlainObject(props, displayName, methodName)

          return props
        }

        return proxy
      }
    }
  ```

  wrapMapToPropsFunc返回的实际上是initProxySelector函数，initProxySelector的执行结果是一个代理proxy，可理解为将传进来的数据（state或dispatch， ownProps）代理到我们传进来的mapToProps函数。proxy的执行结果是proxy.mapToProps，本质就是selector。

  页面初始化执行的时候，dependsOnOwnProps为true，所以执行proxy.mapToProps(stateOrDispatch, ownProps)，也就是detectFactoryAndVerify。在后续的执行过程中，会先将proxy的mapToProps赋值为我们传入connect的mapStateToProps或者mapDispatchToProps，然后在依照实际情况组件是否应该依赖自己的props赋值给dependsOnOwnProps。（注意，这个变量会在selectorFactory函数中作为组件是否根据自己的props变化执行mapToProps函数的依据）。

  总结一下，这个函数最本质上做的事情就是将我们传入connect的mapToProps函数挂到proxy.mapToProps上，同时再往proxy上挂载一个dependsOnOwnProps来方便区分组件是否依赖自己的props。最后，proxy又被作为initProxySelector的返回值，所以初始化过程被赋值的initMapStateToProps、initMapDispatchToProps、initMergeProps实际上是initProxySelector的函数引用，它们执行之后是proxy，至于它们三个proxy是在哪执行来生成具体的selector的我们下边会讲到。

  现在，回想一下我们的疑问，为什么要去初始化那三个mapToProps函数？目的很明显，就是准备出生成selector的函数，用来放到一个合适的时机来执行，同时决定selector要不要对ownProps的改变做反应。

#### 创建selector，向组件注入props

准备好了生成selector的函数之后，就需要执行它，将它的返回值作为props注入到组件中了。先粗略的概括一下注入的过程：
* 取到store的state或dispatch，以及ownProps
* 执行selector
* 将执行的返回值注入到组件

下面我们需要从最后一步的注入开始倒推，来看selector是怎么执行的。

注入的过程发生在connect的核心函数connectAdvanced之内，先忽略该函数内的其他过程，聚焦注入过程，简单看下源码

```JavaScript
export default function connectAdvanced(
  
  selectorFactory,
  {
    getDisplayName = (name) => `ConnectAdvanced(${name})`,
    methodName = 'connectAdvanced',
    renderCountProp = undefined,
    shouldHandleStateChanges = true,
    storeKey = 'store',
    withRef = false,
    forwardRef = false,
    context = ReactReduxContext,
    ...connectOptions
  } = {}
) {
  // ...忽略了其他代码
  const Context = context

  return function wrapWithConnect(WrappedComponent) {
    // ...忽略了其他代码

    // selectorFactoryOptions是包含了我们初始化的mapToProps的一系列参数
    const selectorFactoryOptions = {
      ...connectOptions,
      getDisplayName,
      methodName,
      renderCountProp,
      shouldHandleStateChanges,
      storeKey,
      displayName,
      wrappedComponentName,
      WrappedComponent,
    }
    // pure表示只有当state或者ownProps变动的时候，重新计算生成selector。
    const { pure } = connectOptions

     /* createChildSelector 的调用形式：createChildSelector(store)(state, ownProps)，
       createChildSelector返回了selectorFactory的调用，而selectorFactory实际上是其内部根据options.pure返回的
       impureFinalPropsSelectorFactory 或者是 pureFinalPropsSelectorFactory的调用，而这两个函数需要的参数是
           mapStateToProps,
           mapDispatchToProps,
           mergeProps,
           dispatch,
           options
       除了dispatch，其余参数都可从selectorFactoryOptions中获得。调用的返回值，就是selector。而selector需要的参数是
       (state, ownprops)。所以得出结论，createChildSelector(store)就是selector
    */
    function createChildSelector(store) {
      // 这里是selectorFactory.js中finalPropsSelectorFactory的调用（本质上也就是上面我们初始化的mapToProps的调用），传入dispatch，和options
      return selectorFactory(store.dispatch, selectorFactoryOptions)
    }

    function ConnectFunction(props) {
      const didStoreComeFromProps =
        Boolean(props.store) &&
        Boolean(props.store.getState) &&
        Boolean(props.store.dispatch)
      const didStoreComeFromContext =
        Boolean(contextValue) && Boolean(contextValue.store)

      // Based on the previous check, one of these must be true
      const store = didStoreComeFromProps ? props.store : contextValue.store

      // 仅当store变化的时候，创建selector
      // 调用childPropsSelector => childPropsSelector(dispatch, options)
      const childPropsSelector = useMemo(() => {
        // 每当store变化的时候重新创建这个选择器
        return createChildSelector(store)
      }, [store])

      // actualChildProps就是最终要注入到组件中的props，也就是selector的返回值。
      const actualChildProps = usePureOnlyMemo(() => {
        if (
          childPropsFromStoreUpdate.current &&
          wrapperProps === lastWrapperProps.current
        ) {
          return childPropsFromStoreUpdate.current
        }
        return childPropsSelector(store.getState(), wrapperProps)
      }, [store, previousStateUpdateResult, wrapperProps])

      const renderedWrappedComponent = useMemo(
        // 这里是将props注入到组件的地方
        () => (
          <WrappedComponent
            {...actualChildProps}
            ref={reactReduxForwardedRef}
          />
        ),
        [reactReduxForwardedRef, WrappedComponent, actualChildProps]
      )
    }
    return hoistStatics(Connect, WrappedComponent)
  }
}
```

在注入过程中，有一个很重要的东西：selectorFactory。这个函数就是生成selector的很重要的一环。它起到一个上传下达的作用，把接收到的dispatch，以及那三个mapToProps函数，传入到selectorFactory内部的处理函数（pureFinalPropsSelectorFactory 或 impureFinalPropsSelectorFactory）中，selectorFactory的执行结果是内部处理函数的调用。而内部处理函数的执行结果就是将那三种selector（mapStateToProps，mapDispatchToProps，mergeProps）

执行后合并的结果。也就是最终要传给组件的props

```JavaScript
import verifySubselectors from './verifySubselectors'

//// 直接将mapStateToProps，mapDispatchToProps，ownProps的执行结果合并作为返回值return出去
export function impureFinalPropsSelectorFactory (
  mapStateToProps,
  mapDispatchToProps,
  mergeProps,
  dispatch
) {
  // 如果调用这个函数，直接将三个selector的执行结果合并返回
  return function impureFinalPropsSelector (state, ownProps) {
    return mergeProps(
      mapStateToProps(state, ownProps),
      mapDispatchToProps(dispatch, ownProps),
      ownProps
    )
  }
}

export function pureFinalPropsSelectorFactory (
  mapStateToProps,
  mapDispatchToProps,
  mergeProps,
  dispatch,
  { areStatesEqual, areOwnPropsEqual, areStatePropsEqual }
) {
  // 使用闭包保存一个变量，标记是否是第一次执行
  let hasRunAtLeastOnce = false
  // 下边这些变量用于缓存计算结果
  let state
  let ownProps
  let stateProps
  let dispatchProps
  let mergedProps

  // 整个过程首次初始化的时候调用
  function handleFirstCall (firstState, firstOwnProps) {
    state = firstState
    ownProps = firstOwnProps
    // 这里是wrapMapToProps.js中wrapMapToPropsFunc函数的柯里化调用的函数内部的proxy函数的调用。
    stateProps = mapStateToProps(state, ownProps)
    /*
    * 回顾一下proxy:
    *   const proxy = function mapToPropsProxy(stateOrDispatch, ownProps) {}
    *   return proxy
    * */
    dispatchProps = mapDispatchToProps(dispatch, ownProps)
    mergedProps = mergeProps(stateProps, dispatchProps, ownProps)
    hasRunAtLeastOnce = true
    // 返回计算后的props
    return mergedProps
  }

  // 返回新的props
  function handleNewPropsAndNewState () {
    stateProps = mapStateToProps(state, ownProps)
    // 由于这个函数的调用条件是ownProps和state都变化，所以有必要判断一下dependsOnOwnProps
    if (mapDispatchToProps.dependsOnOwnProps)
      dispatchProps = mapDispatchToProps(dispatch, ownProps)

    mergedProps = mergeProps(stateProps, dispatchProps, ownProps)
    return mergedProps
  }

  // 返回新的props
  function handleNewProps () {
    // 判断如果需要依赖组件自己的props，重新计算stateProps
    if (mapStateToProps.dependsOnOwnProps)
      stateProps = mapStateToProps(state, ownProps)

    if (mapDispatchToProps.dependsOnOwnProps)
      dispatchProps = mapDispatchToProps(dispatch, ownProps)
    // 将组件自己的props，dispatchProps，stateProps整合出来
    mergedProps = mergeProps(stateProps, dispatchProps, ownProps)
    return mergedProps
  }

  // 返回新的props
  function handleNewState () {
    const nextStateProps = mapStateToProps(state, ownProps)
    const statePropsChanged = !areStatePropsEqual(nextStateProps, stateProps)
    stateProps = nextStateProps

    // 由于handleNewState执行的大前提是pure为true，所以有必要判断一下前后来自store的state是否变化
    if (statePropsChanged)
      mergedProps = mergeProps(stateProps, dispatchProps, ownProps)

    return mergedProps
  }

  // 后续的过程调用
  function handleSubsequentCalls (nextState, nextOwnProps) {
    const propsChanged = !areOwnPropsEqual(nextOwnProps, ownProps)
    const stateChanged = !areStatesEqual(nextState, state)
    state = nextState
    ownProps = nextOwnProps

    // 依据不同的情况，调用不同的函数
    if (propsChanged && stateChanged) return handleNewPropsAndNewState() // 当组件自己的props和注入的store中的某些state同时变化时，调用handleNewPropsAndNewState()获取最新的props
    if (propsChanged) return handleNewProps() // 仅当组件自己的props变化时，调用handleNewProps来获取最新的props，此时的props包括注入的props，组件自身的props，和dpspatch内的函数
    if (stateChanged) return handleNewState() // 仅当注入的store中的某些state变化时，调用handleNewState()获取最新的props, 此时的props包括注入的props，组件自身的props，和dpspatch内的函数
    // 如果都没变化，直接返回先前缓存的mergedProps，并且在以上三个函数中，都分别用闭包机制对数据做了缓存
    return mergedProps
  }

  return function pureFinalPropsSelector (nextState, nextOwnProps) {
    // 第一次渲染，调用handleFirstCall，之后的action派发行为会触发handleSubsequentCalls
    return hasRunAtLeastOnce
      ? handleSubsequentCalls(nextState, nextOwnProps)
      : handleFirstCall(nextState, nextOwnProps)
  }
}

// TODO: Add more comments

// If pure is true, the selector returned by selectorFactory will memoize its results,
// allowing connectAdvanced's shouldComponentUpdate to return false if final
// props have not changed. If false, the selector will always return a new
// object and shouldComponentUpdate will always return true.
// finalPropsSelectorFactory函数是在connectAdvaced函数内调用的selectorFactory函数
export default function finalPropsSelectorFactory (
  dispatch,
  { initMapStateToProps, initMapDispatchToProps, initMergeProps, ...options }
) {
  const mapStateToProps = initMapStateToProps(dispatch, options)
  // 这里是wrapMapToProps.js中wrapMapToPropsFunc函数的柯里化调用，是改造
  // 之后的mapStateToProps, 在下边返回的函数内还会再调用一次
  const mapDispatchToProps = initMapDispatchToProps(dispatch, options)
  const mergeProps = initMergeProps(dispatch, options)

  // 验证mapToProps函数，有错误时给出提醒
  if (process.env.NODE_ENV !== 'production') {
    verifySubselectors(
      mapStateToProps,
      mapDispatchToProps,
      mergeProps,
      options.displayName
    )
  }

  // 根据是否传入pure属性，决定调用哪个生成selector的函数来计算传给组件的props。并将匹配到的函数赋值给selectorFactory
  const selectorFactory = options.pure
    ? pureFinalPropsSelectorFactory // 当props或state变化的时候，才去重新计算props
    : impureFinalPropsSelectorFactory // 直接重新计算props

  // 返回selectorFactory的调用
  return selectorFactory(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps,
    dispatch,
    options
  )
}

```
至此，我们搞明白了mapToProps函数是在什么时候执行的。再来回顾一下这部分的问题：__如何向组件中注入state和dispatch__，让我们从头梳理一下：
* 传入mapToProps
  首先，在connect的时候传入了mapStateToProps，mapDispatchToProps，mergeProps。再联想一下用法，这些函数内部可以接收到state或dispatch，以及ownProps，它们的返回值会传入组件的props。
* 基于mapToProps生成selector
  需要根据ownProps决定是否要依据其变化重新计算这些函数的返回值，所以会以这些函数为基础，生成代理函数（proxy），代理函数的执行结果就是selector，上边挂载了dependsOnOwnProps属性，所以在selectorFactory内真正执行的时候，才有何时才去重新计算的依据。
* 将selector的执行结果作为props传入组件
  这一步在connectAdvanced函数内，创建一个调用selectorFactory，将store以及初始化后的mapToProps函数和其他配置传进去。selectorFactory内执行mapToProps（也就是selector），获取返回值，最后将这些值传入组件。

