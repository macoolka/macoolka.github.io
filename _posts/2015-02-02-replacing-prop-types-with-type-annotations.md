---
layout: post
title: Replacing propTypes with type annotations in React 0.13
excerpt: "In React 0.13.0 you no longer need to use React.createClass to create React components"
---

## ES6 Classes

In React 0.13 you no longer need to use `React.createClass` to create React components:

```js
class Counter extends React.Component {
  constructor(props) {
    super(props);
    this.state = {count: props.initialCount};
  }
  ...
}
Counter.propTypes = { initialCount: React.PropTypes.number };
Counter.defaultProps = { initialCount: 0 };
```

(example from [React's Blog](http://facebook.github.io/react/blog/))

## PropTypes as properties

As you can see, propTypes are really just properties on the constructor:

```js
Counter.propTypes = { initialCount: React.PropTypes.number };
```

## PropTypes as type annotations

There is another option: add type annotations to the constructor...

```js
class Counter extends React.Component {
  // example of propTypes as type annotations
  constructor(props: { initialCount: number; }) {
    super(props);
    this.state = {count: props.initialCount};
  }
  ...
}
// Counter.propTypes = { initialCount: React.PropTypes.number };
Counter.defaultProps = { initialCount: 0 };
```

...and use Flowcheck.

## Flowcheck

[Flowcheck](https://github.com/gcanti/flowcheck) adds runtime asserts for each type annotation using a browserify transform:

```
# quick setup

npm install flowcheck

browserify -t flowcheck -t [reactify --strip-types --harmony] input.js -o output.js
```

If an assert fails **the debugger kicks in** so you can inspect the stack and quickly find out what's wrong.

Flowcheck supports sourcemaps and there is [flowcheck-loader](https://github.com/gaearon/flowcheck-loader) (thanks [@dan_abramov](https://twitter.com/dan_abramov)) for Webpack.

## Demo live

Check out the [demo live](https://gcanti.github.io/flowcheck/demo/index.html)

