为什么自定义的React组件必须大写
===
React.createElement(component, props, ...children)的第一个参数 component的类型是 string/ReactClass type
+ string 类型 React会当做原生的DOM节点进行解析
+ ReactClass type 类型 自定义组件
简而言之，babel在编译过程中会判断 JSX 组件的首字母，如果是小写，则当做原生的DOM标签解析，就编译成字符串。如果是大写，则认为是自定义组件，编译成对象。