---
layout: post
title: "Understanding React and reimplementing it from scratch Part 1: Views"
excerpt: "Pressed by my own thread on Reddit I started a journey to understand what can be generalized and unified in the different implementations of a React-like library. The best way I know to understand something isn't just to learn how it works but which problems it's trying to solve and why it's designed that way."
---

## Introduction

Pressed by my own [thread](http://www.reddit.com/r/javascript/comments/2jav2q/is_there_any_good_standalone_implementation_of/) on Reddit I started a journey to understand what can be generalized and unified in the different implementations of a React-like library. The best way I know to understand something isn't just to learn how it works but **which problems** it's trying to solve and **why it's designed** that way.

I'll start with a bare model and then I'll add feature after feature trying to explain the design decisions, pointing when possible to the corresponding implementations in [React](http://facebook.github.io/react/), [Mitrhil](http://lhorie.github.io/mithril/) and [Mercury](https://github.com/Raynos/mercury).

What follows is **my own interpretation** of React, feel free to criticize and contribute.

## A bit of history

History is fundamental to understand why a particular artifact exists, libraries like React don't appear out of the thin air:

> So, the history of React is that we had this awesome way of building front-end on PHP called [XHP]( http://codebeforethehorse.tumblr.com/post/3096387855/an-introduction-to-xhp). We had been using it very successfully on the server for a while and when you moved to JS you were left with bare DOM manipulation which was terrible.

> The idea of React was to port the XHP way of writing interfaces to JS. The three main characteristics are:

> 1. syntax extension to write XML inside of JS
2. components
3. using JS to generate markup (and not a template language)

> The big question that needed to be answered was how do you deal with updates? On the server you just re-render the entire page so you don't have to deal with this. In React, the diff algorithm and lifecycle methods were invented.

> [@Vjeux](https://twitter.com/Vjeux)

Therefore React has its roots in the **plain old request / response cycle** between client and server (further referred to as ReqRes).
Now I see why React can be easily rendered server side: it's not a plus or a second thought, server side rendering belongs to its DNA.

## Implementing a virtual DOM

Why? There are three major reasons:

- Performance
- Flexibility
- Testability

### Performance

Can be surprising but the history of React tells us that:

> [Performance] was more a requirement to be able to use it rather than something we did React for.

> [@Vjeux](https://twitter.com/Vjeux)

If you want a simple architecture like ReqRes **and** you have performance issues **then** it's a good idea to implement a diff algorithm:
`ReqRes + Perf => VDOM + diff`.

Let me rephrase it: if you want a simple architecture like ReqRes and you have no performance issues then you could simply end up with the client equivalent of "re-render the entire page":  `innerHTML`.

One goal of the React team was to bring the ReqRes architecture to the client, while diffing and patching is an (awesome) implementation detail (this explains my choice to put them in the "Optimizations" part).

I had the same goal three years ago when I implemented the internal framework of [madai](http://madai.com/consumer/us/home.html) using ReqRes and a single point of mutability (an idea similar to [om](https://github.com/swannodette/om)). At that time React wasn't there and since we had no performance issues I implemented the re-rendering with an `innerHTML` of the app root to keep things KISS-y. This series of posts is grounded on the experience of these three years.

### Flexibility

Even if you have no performance issues, a VDOM can be extremely useful. As a frontend library author I'd like to target as many frontend and css framework as possible, but it's very difficult to achieve this goal if my views output HTML. Even worse, the users of my library are tied to me (well some author might be happy with this lock-in). If they are not satisfied by the output, they must ask and wait for a change, or fork the library if it's open source. Conversely if I'd output VDOMs, they will be able to patch the output autonomously, customizing styles, removing unnecessary nodes, and so on.

### Testability

I'd like to easily test my views in all circumstances and with simple tools (no more HTML please!). The simplest solution I can think of is the following:

- the view output is determined by a single immutable data structure representing its state
- the view output should be unit testable without messing around with DOM, HTML, PhantomJS...

Do you want to show somebody how your app will be rendered in some particular circumstance? Take the proper view, inject the proper state and ...bang! the browser show you the result. This is also an invaluable benefit for mockups and previews.

Did you write a form library and you must test the gazzilion of possible outputs? What about writing a test suite with only Node.js and `assert.deepEqual`?

## Virtual DOM definition

Let's design a virtual dom as a JSON DSL (further referred to as universal VDOM or `UVDOM`), here its minimal (in)formal type definition:

```js
type UVDOM = Node | Array<Node> // a tree or a forest

type Nil = null | undefined

type Node = {
  tag: string
  attrs: Nil | {
    style:      Nil | object<string, any>,
    className:  Nil | object<string, boolean>,
    xmlns:      Nil | string, // namespaces
    ...
  },
  children: Nil | string | UVDOM
}
```

**Note**. `tag` is a string since the browser actually allows any name, and Web Components will use this fact for people to write custom names. `className` is a dictionary `string -> boolean` since it's easy to patch and to manage (like React `cx(className)`).

**Example:**

```js
// <a href="http://facebook.github.io/react/">React</a>
var react = {
  tag: 'a',
  attrs: {href: 'http://facebook.github.io/react/'},
  children: 'React'
};

// <p class="lead">
//   <span>A JavaScript library for building user interfaces </span>
//   <a href="http://facebook.github.io/react/">React</a>
// </p>
var paragraph = {
  tag: 'p',
  attrs: {className: {'lead': true}},
  children: [
    {
      tag: 'span',
      children: 'A JavaScript library for building user interfaces '
    },
    react
  ]
};
```

### Compairison

All the implementations are very similar:

**React (v0.12.0-rc1)**

- `tag` is named `type`
- `attrs` is named `props`
- `className` is a `string`
- `children` is merged in `props`

React calls a virtual node `ReactDOMElement` ([React Virtual DOM Terminology](https://gist.github.com/sebmarkbage/fcb1b6ab493b0c77d589)).

**Mithril (v0.1.22)**

- `className` is a `string`

**Mercury (v8.0.0)**

- `tag` is named `tagName`
- `attrs` is named `properties`
- `className` is a string
- `children` is always an array
- namespaces are handled with an additional property `namespace`

## Implementing views

Let `JSON` be the set of all the JSON data structures and `VDOM` a virtual DOM implementation, then we call a *view* a [pure](http://en.wikipedia.org/wiki/Pure_function) function such that `view: JSON -> VDOM`, that is a function accepting a JSON state and returning a virtual DOM.

**Definition**. A `VDOM`-*view system* is a pair `(VDOM, View)` where `VDOM` is a virtual DOM implementation
and `View` is the set of all the related views. Let's call *universal view system* the `UVDOM`-view system.

```js
// a simple view, outputs a bolded link
function anchorView(state) {
  return {
    tag: 'a',
    attrs: {href: state.url},
    children: {
      tag: 'b',
      children: state.text
    }
  };
}
```

### Views customization

An interesting property of such views is that they can be composed with any function that outputs JSON, included other views. This means you can use the power of functional programming in the view world:

```js
// button: object -> VDOM (a view without styling, the output of my library)
function button(style) {
  return {
    tag: 'button',
    attrs: {className: style}
  };
}

// boostrap: string -> object (Bootstrap 3 style)
function bootstrap(type) {
  var style = {btn: true};
  style['btn-' + type] = true;
  return style;
}

// boostrap: string -> object (Pure css style)
function pure(type) {
  var style = {'pure-button': true};
  style['pure-button-' + type] = true;
  return style;
}

// bootstrapButton: string -> VDOM
var bootstrapButton = compose(button, bootstrap);
// pureButton: string -> VDOM
var pureButton = compose(button, pure);

console.log(bootstrapButton('primary'));
```

prints

```json
{
  "tag": "button",
  "attrs": {
    "className": {
      "btn": true,
      "btn-primary": true
    }
  }
}
```

You obtain flexibility without loss of control:

- you can rely on the expressiveness of JavaScript instead of learning a separate template language
- the output of a view is determined by its input
- you can customize the output simply applying a JSON transformation

*Structure and function composition* are two building blocks of mathematics, so it's an approach you can bet on: it's well founded and battle tested for a few centuries. But does it scale? Well, it depends by the definition of "scalability". Let's consider this definition:

**Definition**. A set `System` is *scalable* with respect to a property `P` if (zooming in and) taking any subset `Subsystem` the property `P` holds.

Now take a tree `T`, pick a random node `N` and consider the *downset* of `N`:

```js
downset(N) = { x in T such that x = N or x is a descendant of N }
```

It's trivial to prove that `downset(N)` is a tree for all the `N`. So the set of all the downsets of a tree is scalable with respect to the property "be a tree".

This is a good property for our case since VDOMs are trees and you can collapse a node (that is collapse its downset) and replace it with a subview. And this leads to the concept of **components like an optimization for humans**: we need componentization since we can't handle the complexity of a deep tree (this explains my choice to put components in the "Optimizations" part).

### Tests made easy

Since a view is determined by its input and returns a JSON it's easily testable:

```js
var assert = require('assert');

describe('anchorView', function () {

  it('should return an anchor', function () {

    var state = {
      href: 'http://facebook.github.io/react/',
      text: 'React'
    };

    // inject the state
    var actual = anchorView(state);

    var expected = {
      tag: 'a',
      attrs: {href: 'http://facebook.github.io/react/'},
      children: {
        tag: 'b',
        children: 'React'
      }
    };

    assert.deepEqual(actual, expected);
  });

});
```

### Compairison

All the implementations are similar:

**React**

As of v0.12.0 you can express directly the VDOM as a data structure rather than use the helper functions provided in the `React.DOM` namespace.

```js
function anchorView(state) {
  return {
    type: 'a',
    props: {
      href: state.href,
      children: {
        type: 'b',
        props: {
          children: state.text
        },
        _isReactElement: true // hack
      }
    },
    _isReactElement: true // hack
  };
}

React.render(anchorView({
  href: 'http://facebook.github.io/react/',
  text: 'React'
}), document.body);
```

**Mithril**

```js
function anchorView(state) {
  return {
    tag: 'a',
    attrs: {
      href: state.href
    },
    children: {
      tag: 'b',
      attrs: {},
      children: state.text
    }
  };
}

m.render(document.body, anchorView({
  href: 'http://facebook.github.io/react/',
  text: 'React'
}));
```

**Mercury**

```js
// we need these constructors or the require('virtual-hyperscript') helper
var VirtualNode = require('vtree/vnode');
var VirtualText = require('vtree/vtext');

function anchorView(state) {
  return new VirtualNode(
    'a',
    {href: state.href},
    [
      new VirtualNode(
        'b',
        null,
        [new VirtualText(state.text)]
      )
    ]
  );
}

// mercury.create returns a DOM node
var node = mercury.create(anchorView({
  href: 'http://facebook.github.io/react/',
  text: 'React'
}))
document.body.appendChild(node);
```

## Conclusion

As I hoped, being the VDOM implementations so similar, it's straightforward to translate one view system into another.
This fact opens a new world of possibilities: [this is a demo](/resources/uvdom/demo/views.html) where a `UVDOM`-view system is converted
into React, Mithril and mercury with two different styles applied (Bootstrap and Pure), check it out.

In the [next article](/2014/11/24/understanding-react-and-reimplementing-it-from-scratch-part-2.html) I'll talk about Controllers.
