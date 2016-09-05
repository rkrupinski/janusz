# pms

Yet another [Promises/A+](https://github.com/promises-aplus/promises-spec) implementation. Yay!

[![Build Status](https://travis-ci.org/rkrupinski/pms.png?branch=master)](https://travis-ci.org/rkrupinski/pms)

```javascript
const defer = pms.deferred();

pms.resolve({
  then(onFulfilled) {
    onFulfilled(defer.promise);
  },
}).then(val => console.log(val));

setTimeout(() => defer.resolve('Batman!'), 1000);
```
