---
layout: post
title: "Understanding React and reimplementing it from scratch Part 2: Controllers"
excerpt: "In the previous article I introduced the universal virtual DOM (UVDOM) and the concept of views as functions. But this kind of view is \"impassive\", that is it's not able to react to user inputs. If I could render the view in the
browser and click the button nothing will happen. In a browser user inputs are modeled as events so I need to add events to the UVDOM and a way to handle them..."
---

## Introduction

In the [previous article](https://gcanti.github.io/2014/10/29/understanding-react-and-reimplementing-it-from-scratch-part-1.html) I introduced the universal virtual DOM (UVDOM) and the concept of views as functions `view` such that `view: JSON -> VDOM`:

```js
// the classic counter example <div><%= count %><button>Click me!</button></div>
function counter(state) {
  return {
    tag: 'div',
    children: [
      // prints the current count
      {
        tag: 'span',
        children: state.count
      },
      // a button to increment the count
      {
        tag: 'button',
        children: 'Click me!'
      }
    ]
  };
}
```

But this kind of view is "impassive", that is it's not able to react to user inputs. If I could render the view in the
browser and click the button nothing will happen. In a browser user inputs are modeled as events so I need to add events to the UVDOM and a way to handle them.

## Events

First of all I add an `events` section to the `Node` type definition:

```js
type Node = {

  ...

  // `events` is a hash event name -> event handler
  events: {
    click: function,
    change: function,
    ...
  }

}
```

But what about event handlers? Views are isolated (`state` is an immutable JSON).
Let's introduce a communication system: a dictionary `object<string, function>` named *controller*.
Let `Controller` be the set of all the controllers, the view signature becomes: `view: JSON x Controller -> UVDOM`.

```js
function counter(state, controller) {
  return {
    tag: 'div',
    children: [
      {
        tag: 'span',
        children: state.count
      },
      {
        tag: 'button',
        children: 'Click me!',
        // click event added
        events: {
          click: controller.increment // outgoing message
        }
      }
    ]
  };
}
```

For convenience, if we accept the tradeoff to handle possible conflicts, we can merge state and controller to a single object obtaining again only one argument. At [madai](http://madai.com/consumer/us/home.html) we call these objects `sandboxes` (the name echoes our effort for testability). In React they are named `props`.

```js
function counter(props) {
  return {
    tag: 'div',
    children: [
      {
        tag: 'span',
        children: props.count
      },
      {
        tag: 'button',
        children: 'Click me!',
        events: {
          click: props.increment
        }
      }
    ]
  };
}
```

Now I have a view that could theoretically render its content and communicate with the environment through the controller.
If I want something usable in practice I must illustrate the view lifecycle.

## View Lifecycle

This is the general lifecycle of a view:

**Mounting**

- create the HTML (optimizations like DOM diff will be discussed in next articles)
- retrieve the events
- insert the HTML into the DOM
- attach the events to the DOM

**Unmounting**

- detach the events from the DOM
- remove the fragment from the DOM

Consider there is a problem with the attaching / detaching process: views output UVDOM trees and the related events can be deeply nested in the tree structure. How can I retrieve the events without losing the information about which node they are attached to? I need a deterministic way to traverse the tree and put an identifier, let's call it `data-id`, on its nodes. This is a simple algorithm:

- the root has `data-id = '.0'`
- if a node has `data-id = x` then its `i`-th child has `data-id = x + '.' + (i - 1)`

Example:

```
root        .0
  node      .0.0
  node      .0.1
    node    .0.1.0
  node      .0.2
    node    .0.2.0
    node    .0.2.1
```

For the counter view the result would be

```js
{
  tag: 'div',
  attrs: {
    'data-id': '.0' // root
  },
  children: [
    {
      tag: 'span',
      attrs: {
        'data-id': '.0.0' // first child
      },
      children: props.count
    },
    {
      tag: 'button',
      attrs: {
        'data-id': '.0.1' // second child
      },
      children: 'Click me!',
      events: {
        click: props.increment
      }
    }
  ]
}
```

Now events can be linked to nodes with a hash `Hooks`

```
type Hooks = {
  data-id: {
    eventName: 'click',
    eventHandler: function
  },
  ...
}
```

For the counter view `hooks` would be:

```js
{
  '.0.1': {
    eventName: 'click',
    eventHandler: controller.increment
  }
}
```

**Note**. In React the attribute used to link events is named `data-reactid`. This is the HTML of the counter view rendered by React:

```html
<div data-reactid=".0">
  <span data-reactid=".0.0">0</span>
  <button data-reactid=".0.1">Click me!</button>
</div>
```

For clarity we can split the view lifecycle into these building blocks:

- `addHookId: UVDOM -> UVDOM`: add hooks to a UVDOM
- `toHTML: UVDOM -> string`: converts a UVDOM to HTML
- `toHooks: UVDOM -> Hooks`: converts a UVDOM to Hooks
- `attach: Hooks x DOMNode -> IO DOM`: (side effects) delegates events to the mounting node
- `detach: DOMNode -> IO DOM`: (side effects) removes the delegated events from the mounted node

## Server / Client side rendering

The previous build blocks can be grouped in three handy functions:

**Server side rendering** (React.renderToString)

```js
function renderToString(uvdom) {
  uvdom = addHookId(uvdom);         // add hook identifiers
  return toHTML(uvdom);             // render HTML
}
```

**Client side mounting** (React.render)

```js
function render(uvdom, node) {
  uvdom = addHookId(uvdom);         // add hook identifiers
  var hooks = toHooks(uvdom);       // retrieve hooks
  if (!node.innerHTML) {            // handle server side rendering
    node.innerHTML = toHTML(uvdom); // render HTML
  }
  attach(hooks, node);              // attach events to node
  node.hooks = hooks;               // store hooks for unmounting
}
```

**Client side unmounting** (React.unmountComponentAtNode)

```js
function unmountAtNode(node) {
  detach(node);
  node.innerHTML = '';
}
```

We have now a **fully functional "isomophic" system**.
You can check out this [gist](https://gist.github.com/gcanti/7dd8e887df62e6e1830a) for an actual simple implementation of these three functions.

You can actually render the view in a browser typing into its `console`:

```js
// mounting node
var node = document.getElementById('myapp');

var controller = {
  increment: function () {
    console.log('now type `render(counter({count: 1}, controller), node)`');
  }
};

render(counter({count: 0}, controller), node);
```

In this case *you* are the reactive engine. Let's build something more advanced, which implements a `setState` function.

## A reactive kōan

This is the minimal reactive system I can think of: the state lives in the `setState` function argument (it reminds me how an Erlang node keeps its state):

```js
var node = document.getElementById('myapp');

// the reactive loop
function setState(state) {
  unmountAtNode(node);
  var controller = {
    increment: function () {
      setState({count: state.count + 1}); // next state
    }
  };
  render(counter(state, controller), node);
}

setState({count: 0}); // start with an initial state
```

You can check out the code on [JSFiddle](http://jsfiddle.net/yb3zmubb/3/).

What if I need to handle a more complex state? I could use a finite state machine.

## Apps as finite state machines

The gist of a finite state machine in my case is:

```
state ------------------> render()
Ʌ                            |
|                            |
|                            V
+-------- transition --------+
```

Having a single point containing all the app state makes easy to reason about the whole system and it has several advantages:

- a simple model, it fits well in your head
- testability, you can inject a state and test all your app configurations
- easy debugging and error tracking, you can take snapshots of the app state when a client error happens and send it to your error tracker
- easy implementation of undo / redo functionalities

So far we solved the `render` phase. There are several emerging proposals to handle the `transition` phase:

- [Om](https://github.com/swannodette/om)
- [Flux and its variants](https://reactjsnews.com/the-state-of-flux/)
- [omniscientjs](http://omniscientjs.github.io)

But once again I'd like to stick with the old plain ReqRes architecture:

## ReqRes for state management

The ReqRes architecture **scales** well (in the sense of the [previous article](https://gcanti.github.io/2014/10/29/understanding-react-and-reimplementing-it-from-scratch-part-1.html)):

**old style**

```
                      response (html)
    state (server) ---------------------> render (browser)
                   Ʌ                    |
                   |                    |
                   +--------------------+
                    request (get, post)
```

**new style**

```
                      response (JSON)
    state (server) ---------------------> render (single page application)
                   Ʌ                    |
                   |                    |
                   +--------------------+
                    request (get, post)
```

**single page application** (zoom in)

```
                       response (props)
       state (SPA) ---------------------> render (React component)
                   Ʌ                    |
                   |                    |
                   +--------------------+
                      request (props)
```

**React component** (zoom in)

```
                      response (VDOM)
state (this.state) ---------------------> render (React.render)
                   Ʌ                    |
                   |                    |
                   +--------------------+
                  request (this.setState)
```

I think it would be interesting to bring the backend experience and tools to client side state management.

(if anyone is interested in such a project let me know)

## Digression: isomorphic view systems

Nothing said so far is strictly tied to JavaScript, hence I could choose to implement views with another programming language (say you have Ruby or Python on the server), but then how can I connect them cross-language? A mathematician would answer: find an isomorphism!

> In mathematics, an isomorphism is an invertible structure-preserving mapping from one mathematical structure to another.

That is, an isomorphism expresses the property: these two things are "equal" in some way.

Let `JavaScript` and `Ruby` two implementations of views and `f: JavaScript -> Ruby` a function such that `v(json) = f(v)(json)` for all `v` ∈ `JavaScript`, `json` ∈ `JSON` (that is `f` maps a function written in JavaScript to a function written in Ruby that performs the same computation on all JSONs).

Then `f` is a isomorphism between the `JavaScript` and `Ruby`monoids with respect to function composition.

As a consequence, if we had a compiler that takes a JavaScript function as input and outputs a corresponding Ruby function (or another programming language) we would have a way to **express a view independent of the language**.

So "isomorphic JavaScript" is a trivial case of isomorphism where `f` is the identity function.

(if anyone is interested in such a project let me know)

## Conclusion

The presented implementation isn't bad for 170 LOC but there are some issues:

- no components
- the DOM is statefull so we must tackle:
  - input focus and selection
  - scroll position
  - iframes
- performance

In the next article I'll talk about Components and optimizations.
