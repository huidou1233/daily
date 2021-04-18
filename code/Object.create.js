Object.create2 = function (proto, propertyObject = undefined) {
  if (typeof proto !== 'object' && typeof proto !== 'function') {
    throw new TypeError("Object prototype may only be an object or null");
  }
  if (propertyObject == null) {
    new TypeError('Cannot convet undefined or null to object');
  }
  function F () { };
  F.prototype = proto;
  const obj = new F();
  if (propertyObject !== undefined) {
    Object.defineProperties(obj, propertyObject);
  }
  if (proto === null) {
    // 创建一个没有原型对象的对象，Object.create(null)
    obj.__protp__ = null;
  }
  return obj;
}