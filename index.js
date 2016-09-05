const constants = require('keymirror')({
  FULFILLED: null,
  PENDING: null,
  REJECTED: null,
});

const callbacks = new WeakMap();
const states = new WeakMap();
const values = new WeakMap();

const defaultOnFulfilled = val => val;
const defaultOnRejected = reason => { throw reason; };

class pms {

  constructor(executor) { // eslint-disable-line consistent-return
    if (typeof executor !== 'function') {
      throw new TypeError('Nope');
    }

    callbacks.set(this, {
      success: [],
      error: [],
    });

    states.set(this, constants.PENDING);

    const reject = reason => {
      if (states.get(this) !== constants.PENDING) {
        return;
      }

      states.set(this, constants.REJECTED);
      values.set(this, reason);

      setTimeout(() => {
        callbacks.get(this).error.forEach(cb => cb(reason));
        callbacks.delete(this);
      });
    };

    const resolve = val => {
      if (states.get(this) !== constants.PENDING) {
        return;
      }

      if (val === this) {
        throw new TypeError('Nope');
      }

      if (
          (typeof val === 'object' || typeof val === 'function') &&
          typeof val.then === 'function'
      ) {
        switch (true) {
          case states.get(val) === constants.FULFILLED && values.has(val):
            resolve(values.get(val));
            break;
          case states.get(val) === constants.REJECTED && values.has(val):
            reject(values.get(val));
            break;
          default:
            val.then(resolve, reject);
        }
      } else {
        states.set(this, constants.FULFILLED);
        values.set(this, val);

        setTimeout(() => {
          callbacks.get(this).success.forEach(cb => cb(val));
          callbacks.delete(this);
        });
      }
    };

    try {
      executor(resolve, reject);
    } catch (err) {
      return pms.reject(err);
    }
  }

  then(onFulfilled, onRejected) {
    return new pms((resolve, reject) => {
      const handle = (cb, fallback) => {
        try {
          resolve((typeof cb === 'function' ? cb : fallback)(values.get(this)));
        } catch (err) {
          reject(err);
        }
      };

      if (states.get(this) === constants.PENDING) {
        callbacks.get(this).success.push(() =>
            handle(onFulfilled, defaultOnFulfilled));

        callbacks.get(this).error.push(() =>
            handle(onRejected, defaultOnRejected));
      }

      if (states.get(this) === constants.FULFILLED) {
        setTimeout(() => handle(onFulfilled, defaultOnFulfilled));
      }

      if (states.get(this) === constants.REJECTED) {
        setTimeout(() => handle(onRejected, defaultOnRejected));
      }
    });
  }

  catch(onRejected) {
    return this.then(null, onRejected);
  }

  static resolve(val) {
    return val instanceof pms ? val : new pms(resolve => resolve(val));
  }

  static reject(reason) {
    return new pms((resolve, reject) => reject(reason));
  }

  static deferred() {
    const defer = {};

    defer.promise = new pms((resolve, reject) => {
      defer.resolve = resolve;
      defer.reject = reject;
    });

    return defer;
  }

}

module.exports = pms;
