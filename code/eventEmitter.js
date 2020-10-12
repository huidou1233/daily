//发布订阅
class EventEmitter {
  constructor() {
    this.events = {};
  }
  on (event, callback) {
    const callbacks = this.events[event] || [];
    if (Array.isArray(callbacks)) {
      callbacks.push(callback);
      this.events[event] = callbacks;
    }
    return this;
  }

  off (event, callback) {
    const callbacks = (this.events[event] || []).filter(cb => cb !== callback);
    this.events[event] = callbacks;
    return this;
  }

  once (event, callback) {
    const wrap = (...args) => {
      typeof callback === 'function' && callback.apply(this, args);
      this.off(event, wrap);
    }
    this.on(event, wrap);
  }

  emit (event) {
    const callbacks = this.events[event] || [];
    if (Array.isArray(callbacks)) {
      callbacks.forEach(cb => typeof cb === 'function' && cb());
    }
    return this;
  }
}

const eventEmitter = new EventEmitter();
eventEmitter.on('click', () => {
  console.log('click 1')
})
eventEmitter.on('click', () => {
  console.log('click 2')
})

// eventEmitter.off('click')
eventEmitter.on('click', () => {
  console.log('click 3')
})
eventEmitter.emit('click')
eventEmitter.once('click')
console.log(eventEmitter);