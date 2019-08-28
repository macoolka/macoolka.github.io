---
layout: post
title: JavaScript, Types and Sets - Part II
excerpt: "Now it's time to define four other useful type combinators"
---

## Summary

In [JavaScript, Types and Sets - Part I](/2014/09/29/javascript-types-and-sets.html), I introduced two fundamental math concepts: sets and functions. Then I implemented sets in JavaScript as functions and finally I defined four type combinators:

- subtype
- enums
- tuple
- struct

which allow you to define new types from previous defined types.

Now it's time to define four other useful type combinators.

## Lists

Lists are a particular case of a (possibly infinite) tuple `A × B × C ...` where A = B = C = ...

```js
// the list combinator

function list(type) {
  return function List(arr) {
    // check input structure
    assert(Array.isArray(arr));
    // check i-th coordinate and hydrate nested structures
    return Object.freeze(arr.map(type));
  };
}

var Hashtags = list(Str);
Hashtags(['#javascript', 1]); // => throws TypeError
Hashtags(['#javascript', '#types', '#sets']); // => ['#javascript', '#types', '#sets'] (immutable)
```

> **Note**. In [Part I](/2014/09/29/javascript-types-and-sets.html) I showed how hashes can be viewed as functions, it turns out that lists also can be viewed as functions:

```js
// f: Num -> Str
// f(0) = 'a'
// f(1) = 'b'
// f(2) = 'c'
// ore more succinctly..
var f = ['a', 'b', 'c'];
// where we exploit the set of the list indexes as the domain of the function
```

You can even compose hashes and arrays. In math, function composition is the pointwise application of one function to the result of another to produce a third function. For instance, the functions `f: X -> Y` and `g: Y -> Z` can be composed to yield a function `h: X -> Z`, `h(x) = g(f(x))` (notice that the codomain of `f` must be equal to the domain of `g`).

```js
// f: Str -> Num
var f = {
  a: 2,
  b: 0,
  c: 1
};

// g: Num -> Str
var g = ['b', 'c', 'a'];

// h: Str -> Str
var h = function (x) {
  return g[f[x]];
};

// h turns out to be the identity function and g the inverse function of f
h('a'); // => 'a'
h('b'); // => 'b'
h('c'); // => 'c'
```

## Dictionaries

Dictionaries are a particular case of a (possibly inifnite) struct `A × B × C ...` where A = B = C = ...

```js
// the dict combinator

function dict(type) {
  return function Dic(obj) {
    // check input structure
    assert(isObject(obj));
    var ret = {};
    for (var k in obj) {
      if (obj.hasOwnProperty(k)) {
        ret[k] = type(obj[k]); // check prop and hydrate nested structures
      }
    }
    return Object.freeze(ret);
  };
}

var Phonebook = dict(Num);

var phonebook = Phonebook({
  'Andrew Parson': 8806336,
  'Emily Everett': 6784346,
  'Peter Power': 7658344
}); // => {'Andrew Parson': 8806336, 'Emily Everett': 6784346, 'Peter Power': 7658344} (immutable)
```

> **Note**. `dict(A)` can be viewed as the set of all the functions `f` such that `f: Str -> A`.

## Unions

The union of two sets A and B is the collection of elements which are in A or in B or in both A and B.

Union is the trickiest type to implement since, given an input, generally it's not determined which of the types involved
must be used to handle it, even more if the sets are not disjoint, that is they have elements in common.
A solution could be to provide a `dispatch: Any -> Types` function that accepts the same input and returns the suitable type.

```js
// the union combinator

function union(types) {
  return function Union(x) {
    assert(typeof Union.dispatch === 'function');
    var type = Union.dispatch(x);
    assert(typeof type === 'function');
    return type(x);
  };
}

var CssWidth = union([Str, Num]);

// only the developer knows the semantic
CssWidth.dispatch = function (x) {
  if (Str.is(x)) return Str;
  if (Num.is(x)) return Num;
};

CssWidth(true);   // => throws TypeError
CssWidth(10);     // => 10
CssWidth('10px'); // => '12px'
```

Sometimes it's not so easy to define the `dispatch` function, especially when the types involved overlap (that is the underlying sets are not disjoint). I'll consider the worst case (I hate when documentation shows the best case to "sell the product") when the involved types have the "same shape"

```js
var Employer = struct({
  name: Str,
  surname: Str
});

var Employee = struct({
  name: Str,
  surname: Str
});

var Person = union([Employer, Employee]);

Person.dispatch = function (x) {
  ???
};
```

This is a good occasion for implementing a **tagged union**. From [Wikipedia](http://en.wikipedia.org/wiki/Tagged_union): "A tagged union is a data structure used to hold a value that could take on several different, but fixed types. Only one of the types can be in use at any one time, and a tag field explicitly indicates which one is in use".

```js
var Employer = struct({
  name: Str,
  surname: Str
});

// helps JSON deserialization
Employer.prototype.toJSON = function () {
  return mixin({tag: 'employer'}, this);
};

var Employee = struct({
  name: Str,
  surname: Str
});

// helps JSON deserialization
Employer.prototype.toJSON = function () {
  return mixin({tag: 'employee'}, this);
};

var Person = union([Employer, Employee]);

Person.dispatch = function (x) {
  if (x.tag === 'employer') return Employer;
  if (x.tag === 'employee') return Employee;
};

Person({
  tag: 'employer',
  name: 'Mark',
  surname: 'Zuckerberg'
}); // => new Employer({name: 'Mark', surname: 'Zuckerberg'});

Person({
  tag: 'employee',
  name: 'Giulio',
  surname: 'Canti'
}); // => new Employee({name: 'Giulio', surname: 'Canti'});
```

## Optional values

Optional values of type `A` can be modeled as the union of `Nil` and `A`.

```js
// the maybe combinator

function maybe(type) {
  var Maybe = union([Nil, type]);
  Maybe.dispatch = function (x) {
    return Nil.is(x) ? Nil : type;
  };
  return Maybe;
}

var OptionalStr = maybe(Str);

OptionalStr(1);         // => throws TypeError
OptionalStr(null);      // => null
OptionalStr(undefined); // => undefined
OptionalStr('hello');   // => 'hello'
```

## Conclusion

I think Math can bring to software development a real benefit: its methodology. Math has proven **over the centuries**
to be a successful paradigm (quite everything around us is built on it) in terms of achievements and (why not) beauty.

According to this methodology the domain models are a series of set definitions, functions must be defined clearly specifying domain and codomain and immutability is everywhere.

It's a good time to be a mathematician and a programmer: functional programming starts to go mainstream and libraries like React.js
do a good job to prove that well founded functional software can be also pragmatic.

Finally, as a personal note, I'd like to spend a few more words on React: it's the first library that fits well with my mind. The first time I saw this:

> Any user input will have no effect on the rendered element because React has declared the value to be "Hello!" (excerpt
from React [docs](http://facebook.github.io/react/docs/forms.html) on Controlled Components)

I thought "That is a library I can love!". Not for the implementation (though it's very good) but for **the pureness of the underlying idea**, so pure that they have designed what, at the first sight, might seem a weird behaviour. If someone of the readers knows personally the engineers who designed React, please shake their hand for me.

## Real world examples

If you want to see these concepts in action:

- [tcomb](https://github.com/gcanti) - Pragmatic runtime type checking for JavaScript based on type combinators
- [tcomb-form](https://gcanti.github.io/resources/tcomb-form/playground/playground.html) - Domain Driven Forms. Automatically generate form markup from a domain model
