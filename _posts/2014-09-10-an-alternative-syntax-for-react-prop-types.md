---
layout: post
title: An alternative syntax for React propTypes
excerpt: "Additional fine grained type checks, easily integrable with tcomb-form to build awesome demos of your components"
---

## Should I add propTypes to my components?

Definitely yes. Adding [propTypes](http://facebook.github.io/react/docs/reusable-components.html) to all the components improves development speed, testability and documents the shape of the consumed data. After two months who can't even remember which property feeds which component?

But in order to become an ubiquitous practice, the syntax used to express the constraints must
be simple and expressive, otherwise chances are that laziness leads to undocumented and opaque components.

The tools provided by React are good, but when the domain models become more complex and you want express
fine-grained constraints you can hit a wall.

## The case of the Alert component

Say you are writing a component that represents the `Alert` component of Bootstrap and you want to check its props.
There is already a fine [implementation](http://react-bootstrap.github.io), so let's assume that as base. Here a short list of handled props:

- bsStyle - required, one of `info`, `warning`, `success`, `danger`
- bsSize - optional, one of `large`, `medium`, `small`, `xsmall`
- onDismiss - optional, a function called if the component is closable
- dismissAfter - optional **positive integer**, millis to wait before closing the Alert. **If specified then `onDismiss` must be specified too**


## Writing propTypes

```javascript
var pt = require('react').PropTypes;

var propTypes = {

  bsStyle: pt.oneOf(['info', 'warning', 'success', 'danger']).isRequired,

  bsSize: pt.oneOf(['large', 'medium', 'small', 'xsmall']),

  onDismiss: pt.func,

  dismissAfter: function(props) {
    var n = props.dismissAfter;

    // dismissAfter is optional
    if (n != null) {

      // dismissAfter should be a positive integer
      if (typeof n !== 'number' || n !== parseInt(n, 10) || n < 0) {
        return new Error('Invalid `dismissAfter` supplied to `Alert`' +
          ', expected a positive integer');
      }

      // if specified then `onDismiss` must be specified too
      if (typeof props.onDismiss !== 'function') {
        return new Error('Invalid `onDismiss` supplied to `Alert`' +
          ', expected a func when `dismissAfter` is specified');
      }
    }
  }

};
```

Notes:

1. by default props are optionals
2. sometimes React issues cryptic warning messages
3. there is no easy way to whitelist props
4. refinements and global contraints must be specified on prop level with [custom props](http://facebook.github.io/react/docs/reusable-components.html)

## Proposed syntax

```js
var t = require('tcomb-react');

var BsStyle = t.enums.of('info warning success danger');

var BsSize = t.enums.of('large medium small xsmall');

// a predicate is a function with signature (x) -> boolean
function predicate(n) { return n === parseInt(n, 10) && n >= 0; }

var PositiveInt = t.subtype(t.Num, predicate);

function globalPredicate(x) {
  return !( !t.Nil.is(x.dismissAfter) && t.Nil.is(x.onDismiss) );
}

var AlertProps = t.subtype(t.struct({
  bsStyle:      BsStyle,
  bsSize:       t.maybe(BsSize), // `maybe` means optional
  onDismiss:    t.maybe(t.Func),
  dismissAfter: t.maybe(PositiveInt)
}, globalPredicate);

// `bind` returns a proxy component with the same interface of the original component
// but with asserts included. In production you can choose to switch to the original one
var SafeAlert = t.react.bind(Alert, AlertProps, {strict: true});
```

Features:

1. by default props are required, a **saner default** since it's quite easy to forget `.isRequired`
2. when a validation fails, **the debugger kicks in** so you can inspect the stack and quickly find out what's wrong
3. `{strict: true}` means all unspecified props are not allowed
4. global contraints can be specified with `subtype` syntax
5. **plus**: all defined types can be reused as domain models

## Implementation

For a complete implementation of the ideas exposed in this post see the [tcomb-react](https://github.com/gcanti/tcomb-react) library on GitHub.

## Playground

If you want to see tcomb-react in action, check out the [playground](/resources/tcomb-react-bootstrap/playground/playground.html) of tcomb-react-bootstrap, an attempt to add a type checking layer to the components of [react-bootstrap](http://react-bootstrap.github.io/).

## Comparison table

<table class="table">
  <thead>
    <th>Desc<th>
    <th>React<th>
    <th>Proposed syntax</th>
  </thead>
  <tbody>
    <tr>
      <td>optional prop<td>
      <td>A<td>
      <td>maybe(A)</td>
    </tr>
    <tr>
      <td>required prop<td>
      <td>A.isRequired<td>
      <td>A</td>
    </tr>
    <tr>
      <td>primitives<td>
      <td>
        array<br/>
        bool<br/>
        func<br/>
        number<br/>
        object<br/>
        string<br/>
        &#10008;<br/>
        &#10008;<br/>
        &#10008;<br/>
        &#10008;<br/>
      <td>
      <td>
        Arr<br/>
        Bool<br/>
        Func<br/>
        Num<br/>
        Obj<br/>
        Str<br/>
        Nil - <span class="text-muted">null, undefined</span><br/>
        Re - <span class="text-muted">RegExp</span><br/>
        Dat - <span class="text-muted">Date</span><br/>
        Err - <span class="text-muted">Error</span><br/>
      </td>
    </tr>
    <tr>
      <td>tuples<td>
      <td>&#10008;<td>
      <td>tuple([A, B])</td>
    </tr>
    <tr class="success">
      <td>subtypes<td>
      <td>&#10008;<td>
      <td>subtype(A, predicate)</td>
    </tr>
    <tr>
      <td>all<td>
      <td>any<td>
      <td>Any</td>
    </tr>
    <tr>
      <td>lists<td>
      <td>arrayOf(A)<td>
      <td>list(A)</td>
    </tr>
    <tr>
      <td>components<td>
      <td>component<td>
      <td>Component</td>
    </tr>
    <tr>
      <td>instance<td>
      <td>instanceOf(A)<td>
      <td>A</td>
    </tr>
    <tr>
      <td>dictionaries<td>
      <td>objectOf(A)<td>
      <td>Dict(A)</td>
    </tr>
    <tr>
      <td>enums<td>
      <td>oneOf(['a', 'b'])<td>
      <td>enums.of('a b')</td>
    </tr>
    <tr>
      <td>unions<td>
      <td>oneOfType([A, B])<td>
      <td>union([A, B])</td>
    </tr>
    <tr>
      <td>renderable<td>
      <td>renderable<td>
      <td>Renderable</td>
    </tr>
    <tr>
      <td>duck typing<td>
      <td>shape<td>
      <td>struct</td>
    </tr>
  </tbody>
</table>

