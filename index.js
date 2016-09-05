const FULFILLED = Symbol();
const PENDING = Symbol();
const REJECTED = Symbol();

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

    states.set(this, PENDING);

    const reject = reason => {
      if (states.get(this) !== PENDING) {
        return;
      }

      states.set(this, REJECTED);
      values.set(this, reason);

      setTimeout(() => {
        callbacks.get(this).error.forEach(cb => cb(reason));
        callbacks.delete(this);
      });
    };

    const resolve = val => {
      if (states.get(this) !== PENDING) {
        return;
      }

      if (val === this) {
        throw new TypeError('Nope');
      }

      let then;

      if (val instanceof pms) {
        switch (true) {
          case states.get(val) === FULFILLED:
            resolve(values.get(val));
            break;
          case states.get(val) === REJECTED:
            reject(values.get(val));
            break;
          default:
            val.then(resolve, reject);
        }
      } else if ( // eslint-disable-line no-cond-assign
        val &&
        (typeof val === 'object' || typeof val === 'function') &&
        typeof (then = val.then) === 'function'
      ) {
        try {
          then.bind(val)(resolve, reject);
        } catch (err) {
          reject(err);
        }
      } else {
        states.set(this, FULFILLED);
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

      if (states.get(this) === PENDING) {
        callbacks.get(this).success.push(() =>
            handle(onFulfilled, defaultOnFulfilled));

        callbacks.get(this).error.push(() =>
            handle(onRejected, defaultOnRejected));
      }

      if (states.get(this) === FULFILLED) {
        setTimeout(() => handle(onFulfilled, defaultOnFulfilled));
      }

      if (states.get(this) === REJECTED) {
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
