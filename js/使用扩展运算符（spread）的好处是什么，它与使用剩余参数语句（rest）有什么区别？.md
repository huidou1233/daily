使用扩展运算符（spread）的好处是什么，它与使用剩余参数语句（rest）有什么区别？
====

在函数泛型编码时，ES6 的扩展运算符非常有用，因为我们可以轻松创建数组和对象的拷贝，而无需使用Object.create、slice或其他函数库。这个语言特性在 Redux 和 RxJS 的项目中经常用到

<pre>
  function putDookieInAnyArray(arr) {
    return [...arr, 'dookie'];
  }

  const result = putDookieInAnyArray(['I', 'really', "don't", 'like']); // ["I", "really", "don't", "like", "dookie"]

  const person = {
    name: 'Todd',
    age: 29,
  };

  const copyOfTodd = {...person};
</pre>

ES6 的剩余参数语句提供了一个简写，允许我们将不定数量的参数表示为一个数组。它就像是扩展运算符语法的反面，将数据收集到数组中，而不是解构数组。剩余参数语句在函数参数、数组和对象的解构赋值中有很大作用。

<pre>
  function addFiveToABunchOfNumbers(...numbers) {
    return numbers.map((x) => x + 5);
  }

  const result = addFiveToABunchOfNumbers(4, 5, 6, 7, 8, 9, 10); // [9, 10, 11, 12, 13, 14, 15]

  const [a, b, ...rest] = [1, 2, 3, 4]; // a: 1, b: 2, rest: [3, 4]

  const {e, f, ...others} = {
    e: 1,
    f: 2,
    g: 3,
    h: 4,
  }; // e: 1, f: 2, others: { g: 3, h: 4 }
</pre>