Function.prototype.Call = function (thisArg) {
  const fn = Symbol('fn'); // 生成一个不重复的键
  thisArg[fn] = this || window;
  const args = Array.from(arguments).slice(1)
  args.length ? thisArg[fn](...args) : thisArg[fn](args);
  delete thisArg[fn];
}