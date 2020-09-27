Function.prototype.Apply = function (thisArg, args = Symbol.for('args')) {
  const fn = Symbol('fn'); // 生成一个不重复的键
  thisArg[fn] = this || window;
  args === Symbol.for(args) ? thisArg[fn]() : thisArg[fn](...args);
  delete thisArg[fn];
}

var name = 'foo'
var age = 5
function foo(age,height) {
  console.log(this.name) // obj
  console.log(age)       // 3
  console.log(height)    // null
}
const obj = {
  name: 'obj',
  age: 3
}
foo.Apply(obj,[obj.age,null])

// const numbers = [5, 6, 2, 3, 7];
// const max = Math.max.Apply(null, numbers);
// console.log(max);
// // expected output: 7

// const min = Math.min.Apply(null, numbers);

// console.log(min);