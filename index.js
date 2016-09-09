const FULFILLED = Symbol();
const PENDING = Symbol();
const REJECTED = Symbol();

const callbacks = new WeakMap();
const states = new WeakMap();
const values = new WeakMap();
const settled = new WeakMap();

const defaultOnFulfilled = val => val;
const defaultOnRejected = reason => { throw reason; };

let schedule = setTimeout;

try {
  if (Object.prototype.toString.call(process) === '[object process]') {
    schedule = process.nextTick;
  }
} catch (err) {
  // Nope
}

function settle(cb, thenable) {
  return function wrapped(...args) {
    if (settled.get(thenable)) {
      return undefined;
    }

    settled.set(thenable, true);

    return cb(...args);
  };
}

function getThen(val) {
  if (val && (typeof val === 'object' || typeof val === 'function')) {
    const then = val.then;

    return typeof then === 'function' ? then : null;
  }

  return null;
}

class janusz {

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

      schedule(() => {
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

      try {
        if (val instanceof janusz) {
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
        } else if (then = getThen(val)) { // eslint-disable-line no-cond-assign
          settled.delete(val);
          then.bind(val)(settle(resolve, val), settle(reject, val));
        } else {
          states.set(this, FULFILLED);
          values.set(this, val);

          schedule(() => {
            callbacks.get(this).success.forEach(cb => cb(val));
            callbacks.delete(this);
          });
        }
      } catch (err) {
        if (!settled.get(val)) {
          reject(err);
        }
      }
    };

    try {
      executor(resolve, reject);
    } catch (err) {
      return janusz.reject(err);
    }
  }

  then(onFulfilled, onRejected) {
    return new janusz((resolve, reject) => {
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
        schedule(() => handle(onFulfilled, defaultOnFulfilled));
      }

      if (states.get(this) === REJECTED) {
        schedule(() => handle(onRejected, defaultOnRejected));
      }
    });
  }

  catch(onRejected) {
    return this.then(null, onRejected);
  }

  static resolve(val) {
    return val instanceof janusz ? val : new janusz(resolve => resolve(val));
  }

  static reject(reason) {
    return new janusz((resolve, reject) => reject(reason));
  }

  static deferred() {
    const defer = {};

    defer.promise = new janusz((resolve, reject) => {
      defer.resolve = resolve;
      defer.reject = reject;
    });

    return defer;
  }

}

module.exports = janusz;
