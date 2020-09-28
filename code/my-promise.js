const PENDING = "PENDING"; // 初始化pendding状态
const RESOLVED = "RESOLVED"; // 正确完成resolve状态
const REJECTED = "REJECTED"; // 错误完成reject状态

function MyPromise (constructor) {
  let self = this;
  self.status = PENDING; //定义状态改变前的初始状态
  self.value = undefined;  //定义状态为resolved的时候的状态
  self.reason = undefined; //定义状态为rejected的时候的状态

  self.onFullfilledArray = [];
  self.onRejectedArray = [];
  function resolve (value) {
    //两个==="pending"，保证了状态的改变是不可逆的
    if (self.status === PENDING) {
      self.value = value;
      self.status = RESOLVED;
      self.onFullfilledArray.forEach(function (f) {
        f(self.value);
      })
    }
  }

  function reject (reason) {
    //两个==="pending"，保证了状态的改变是不可逆的
    if (self.status === PENDING) {
      self.reason = reason;
      self.status = REJECTED;
      self.onRejectedArray.forEach(function (f) {
        f(self.reason);
      })
    }
  }

  try {
    constructor(resolve, reject);
  } catch (e) {
    reject(e);
  }
}

MyPromise.prototype.then = function (onFullfilled, onRejected) {
  let self = this;
  let promise2;
  switch (self.status) {
    case PENDING:
      promise2 = new MyPromise(function (resolve, reject) {
        self.onFullfilledArray.push(function () {
          setTimeout(function () {
            try {
              let temple = onFullfilled(self.value);
              resolvePromise(temple);
            } catch (e) {
              reject(e);
            }
          })
        })

        self.onRejectedArray.push(function () {
          setTimeout(function () {
            try {
              let temple = onRejected(self.reason);
              resolvePromise(temple);
            } catch (e) {
              reject(e);
            }
          })
        })
      })
      break;
    case RESOLVED:
      promise2 = new MyPromise(function (resolve, reject) {
        setTimeout(function () {
          try {
            let temple = onFullfilled(self.value)
            //将上次一then里面的方法传递进下一个Promise的状态
            resolvePromise(temple);
          } catch (e) {
            reject(e);
          }
        })
      })
      break;
    case REJECTED:
      promise2 = new MyPromise(function (resolve, reject) {
        setTimeout(function () {
          try {
            let temple = onRejected(self.reason);
            resolvePromise(temple);
          } catch (e) {
            reject(e);
          }
        })
      })
      break;
    default:
  }
  return promise2;
}
function resolvePromise (promise, x, resolve, reject) {
  if (promise === x) {
    throw new TypeError('type error');
  }

  let isUsed;
  if (x != null && typeof x === 'object' || typeof x === 'function') {
    try {
      let then = x.then;
      if (typeof then === 'function') {
        then.call(x, function (y) {
          if (isUsed) return;
          isUsed = true;
          resolvePromise(promise, y, resolve, reject);
        }, function (e) {
          if (isUsed) return;
          isUsed = true;
          reject(e);
        })
      } else {
        resolve(x);
      }
    } catch (e) {
      if (isUsed) return;
      isUsed = true;
      reject(e);
    }
  } else {
    resolve(x)
  }
}
var p = new Promise(function (resolve, reject) {
  resolve("初始化promise")
})
p.then(function () {
  return new Promise(function (resolve, reject) {
    resolve("then里面的promise返回值")
  })
}).then(function (x) {
  console.log(x)
})
