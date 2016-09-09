# Janusz

Yet another [Promises/A+](https://github.com/promises-aplus/promises-spec) implementation. Yay!

[![Build Status](https://travis-ci.org/rkrupinski/janusz.png?branch=master)](https://travis-ci.org/rkrupinski/janusz)

```javascript
const defer = janusz.deferred();

janusz.resolve({
  then(onFulfilled) {
    onFulfilled(defer.promise);
  },
}).then(val => console.log(val));

setTimeout(() => defer.resolve('Batman!'), 1000);
```
