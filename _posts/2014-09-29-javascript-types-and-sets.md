---
layout: post
title: JavaScript, Types and Sets - Part I
excerpt: "In this article I'll illustrate how a mathematician could regard the JavaScript language and its type system.
I'll talk about sets, functions and immutability, building a coherent framework of concepts.
This framework helps me to reason about the system while I'm coding. I hope it can help you too"
---

## Introduction

In this article I'll illustrate how a mathematician could regard the JavaScript language and its type system.
I'll talk about sets, functions and immutability, building a coherent framework of concepts.
This framework helps me to reason about the system while I'm coding. I hope it can help you too.

Mathematicians for a long, long time and with terrific success have used two fundamental building blocks: sets and functions.

## Sets

A *set* is a well defined collection of distinct objects. The objects that make up a set (also known as the *elements* or *members*) can be anything: numbers, people, letters of the alphabet, other sets, and so on.

I'll show you how **JavaScript types can be viewed as sets**. Let's start defining four primitive sets that we will need later. To represent the concept of a set in JavaScript I'll use a function that behave like the identity if everything is fine and throws a `TypeError` otherwise. From a math point of view ensuring the correct values and failing loudly is essential.

```js
// helper
function assert(guard) {
  if (guard !== true) throw new TypeError();
}

// Nil is the set containing null and undefined
var Nil = function (x) {
  assert(x === null || x === undefined);
  return x;
};

// Str is the set of all strings
var Str = function (x) {
  assert(typeof x === 'string');
  return x;
};

// Num is the set of all numbers
var Num = function (x) {
  assert(typeof x === 'number' && isFinite(x) && !isNaN(x));
  return x;
};

// Bool is the set containing true and false
var Bool = function (x) {
  assert(x === true || x === false);
  return x;
};
```

> **Note**: In math the elements of a set are **immutables**. For what concerns JavaScript primitives we are lucky since they are immutables out of the box.

## Functions

We could think at JavaScript functions like black boxes that accept an "input" and spit out an "output"

```js
function len(str) {
  return str.length;
}
```

Can we define what is an input and an output with our new tool, the sets?
Yes! In math a function `f` is a relation between a set A of inputs (also called *domain*) and a set B of permissible outputs (also called *codomain*) with the property that each input `a` is related to exactly one output `b = f(a)`. We denote this by `f: A -> B`

> **Note**. In math it **doesn't make sense** to apply a function `f` to an element that do not belong to its domain. I'll implement this fact in JavaScript throwing a `TypeError`.

It turns out that when you write the JsDocs, you are actually stating which is the domain and the codomain of your function

```js
/**
 * len: Str -> Num
 * @param {Str} str
 * @return {Num} the length of str
 */
function len(str) {
  return str.length;
}
```

> **Advice**. When you define a function, try to figure out which is the domain and the codomain. If you find it difficult, it could be a code smell.

Take your time to absorb these two paragraphs, read them a second time if needed, because with these basic tools I'm going to define an entire type system only combining sets! (the same way you can compose JavaScript functions).

From now on, I'll consider the words "set" and "type" interchangeables.

## Subtypes and type combinators

In math a set A is a *subset* of a set B if A is "contained" inside B, that is, all elements of A are also elements of B. But how to express the word "contained" with our new tools? The trick is to define a function `isA: B -> Bool` (also called *characteristic function*)
that tells us if an element `b` of B can be considered member of A, that is if `isA(b) === true` holds. Say you want to define the subset `Positive` of all the numbers `Num` that are greater than zero

```js
// isPositive: Num -> Bool

function isPositive(b) {
  return b > 0;
}
```

Now I need to define an helper function called `subtype` that accepts a type and a characteristic function as input and returns a new type as output

```js
// the subtype combinator

function subtype(B, isA) {
  return function Subtype(b) {
    b = B(b); // ensures that b belongs to B
    assert(isA(b));
    return b;
  };
}
```

Now it's straightforward to define the `Positive` type

```js
var Positive = subtype(Num, isPositive);

Positive('a');  // throws TypeError
Positive(-1);   // throws TypeError
Positive(2.5);  // => 2.5
```

The `subtype` function is the first of a series of functions accepting a bunch of already defined types as input (and sometimes other values) and return a new type as output. I call this kind of functions **type combinators**.

The `subtype` combinator, like the other combinators, can be applied, mixed and composed multiple times. Let's see an example

```js
var PositiveInteger = subtype(Positive, function (b) {
  // here we are sure that b is a positive number
  return b % 1 === 0;
});

PositiveInteger(-1);  // throws TypeError
PositiveInteger(2.5); // throws TypeError
PositiveInteger(2);   // => 2
```

> **Note**. When the characteristic function is executed, we can rely on the fact that its argument `b` contains always a correct value (i.e. a B value), handy!

## Enums

Enums are a particular case of subtypes, where `B = Str` and `isA` is implemented exploiting `hasOwnProperty`

```js
// the enums combinator

function enums(map) {
  return subtype(Str, function (s) {
    return map.hasOwnProperty(s);
  });
}

var f = {
  left:    true,
  center:  true,
  right:   true,
  justify: true
};

var CSSTextAlign = enums(f);

CSSTextAlign('up');   // => throws TypeError
CSSTextAlign('left'); // => 'left'
```

Have you noticed the choice of the names: `map` and `f`?
"map" is a synonym of "function" and "f" is the conventional short name of a function... what's going on?
Well, it turns out that hashes are another way of defining a function, where you list for all the
elements of the domain (always a subset of `Str`) the related value of the codomain:

```
// this is what would write a mathematician

f: Str -> Bool

f("left") = true;
f("center") = true;
f("right") = true;
f("justify") = true;
```

Now replace `()` with `[]`

```js
// this is what would write a JavaScripter

var f = {};

f["left"] = true;
f["center"] = true;
f["right"] = true;
f["justify"] = true;
```

When I look at an hash, what I **see** is a function. And from now on maybe you too.

## Tuples and Structs

```js
// this is a JavaScript tuple

['Giulio', 40, true]

// this is a JavaScript struct

{
  name: 'Giulio',
  age: 40,
  isSingle: true
}
```

Tuples and structs are two ways to express the **same math concept**: the *Cartesian product* of two sets A and B, denoted by `A × B` is the set of all ordered pairs `(a, b)` such that `a` is a member of A and `b` is a member of B.

The two objects in the code snippet above can be thought (*) belonging to the same set `Str × Num × Bool`. The only difference is that tuples are accessed by index, structs by name.

(*) It's easy to define a bijective function `order` that maps the set of the struct props names to the set {0, 1, 2} of the tuple indexes:

```js
// remember that hashes can be viewed as functions
var order = {
  name: 0,
  surname: 1,
  isSingle: 2
};
```

> **Note**. Another example of a tuple is the `arguments` object of a function. As discussed above it's the same having `n` different arguments as a tuple or only [one argument](https://gcanti.github.io/2014/09/25/six-reasons-to-define-constructors-with-only-one-argument.html) as a struct (or even mix the two).

Let's define the `tuple` and `struct` combinators

```js
// the tuple combinator

"use strict";

function tuple(types) {
  return function Tuple(arr) {
    // check input structure
    assert(Array.isArray(arr));
    // check i-th coordinate and hydrate nested structures
    return Object.freeze(arr.map(function (el, i) {
      return types[i](el);
    }));
  };
}

var Person = tuple([Str, Num, Bool]);

Person(['Giulio', 'Canti', true]);  // => throws TypeError
Person(['Giulio', 40, true]);       // => ['Giulio', 40, true] (immutable)
```

> **Note**. Native JavaScript arrays and objects are mutable, but fortunately JavaScript provides the excellent function [Object.freeze](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze) that "freezes an object: that is, prevents new properties from being added to it; prevents existing properties from being removed; and prevents existing properties, or their enumerability, configurability, or writability, from being changed. **In essence the object is made effectively immutable**".

```js
// the struct combinator

"use strict";

// helper
function isObject(x) {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function struct(props) {
  return function Struct(obj) {
    // makes Struct idempotent
    if ( obj instanceof Struct ) return obj;
    // makes new optional
    if ( !(this instanceof Struct) ) return new Struct(obj);
    // check input structure
    assert(isObject(obj));
    var ret = {};
    for (var name in props) {
      if (props.hasOwnProperty(name)) {
        var type = props[name];
        ret[name] = type(obj[name]); // check prop type and hydrate nested structures
      }
    }
    return Object.freeze(ret);
  };
}

var Person = struct({
  name: Str,
  age: Num,
  isSingle: Bool
});

Person({
  name: 'Giulio',
  age: 'Canti', // wrong
  isSingle: true
});  // => throws TypeError

Person({
  name: 'Giulio',
  age: 40,
  isSingle: true
}); // => {name: 'Giulio', age: 40, isSingle: true} (immutable)
```

> **Advice**. Remember to add `"use strict";` to your source files. From [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze) "Nothing can be added to or removed from the properties set of a frozen object. Any attempt to do so will fail, either silently or by throwing a TypeError exception (most commonly, but not exclusively, when in strict mode)."

## Sets are expressive

So far I have defined four combinators:

- subtype
- enums
- tuple
- struct

Let's compose all of them to prove the power and flexibility of sets: I'll define the type `Climber` of all the Italian males that have a favorable BMI (body mass index) to climb.

```js
// helper types and functions

var Country = enums({Italy: true, US: true});
var Gender = enums({Male: true, Female: true});
var Body = tuple([Num, Num]); // height (cm) x weight (Kg)

var Person = struct({
  name: Str,
  gender: Gender,
  country: Country,
  body: Body
});

function getBMI(height, weight) { return weight / Math.pow(height / 100, 2); }

function isFavorable(body) {
  var bmi = getBMI(body[0], body[1]);
  return bmi >= 18.5 && bmi <= 25;
}

// here we are

var Climber = subtype(Person, function (p) {
  return (p.gender === 'Male') && (p.country === 'Italy') && isFavorable(p.body);
});

var giulio = {
  name: 'Giulio',
  gender: 'Male',
  country: 'Italy',
  body: [178, 65]
};

Climber(giulio); // => giulio
```

## Further reading

In the [next part](https://gcanti.github.io/2014/10/07/javascript-types-and-sets-part-II.html) I'll talk about lists, unions, optional values and dictionaries.

I know, Math is not a popular topic, if you share with me the interest
(in my case the passion) on the subject, please share this article with your friends.
I hope you enjoyed this ride between sets and functions, thanks for reading.

Giulio

## Real world examples

If you want to see these concepts in action:

- [tcomb](https://github.com/gcanti) - Pragmatic runtime type checking for JavaScript based on type combinators
- [tcomb-form](https://gcanti.github.io/resources/tcomb-form/playground/playground.html) - Domain Driven Forms. Automatically generate form markup from a domain model
