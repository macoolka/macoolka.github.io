---
layout: post
title: Six reasons to define constructors with only one argument
excerpt: "After all the comments here and on Reddit (thanks to all), I've updated this article to better explain my POV."
---

## Introduction

After all the comments here and on [Reddit](http://www.reddit.com/r/javascript/comments/2hezdw/six_reasons_to_define_constructors_with_only_one/) (thanks to all), I've updated this article to better explain my POV.

This is how to define a "class" in vanilla JavaScript (further referred to as `vanilla`):

```js
function VanillaPerson(name, surname) { // multiple arguments
  this.name = name;
  this.surname = surname;
}

var person = new VanillaPerson('Giulio', 'Canti');
person.name; // => 'Giulio'
```

And this is the same class defined with a constructor with only one argument (further referred to as `1-arity`):

```js
function Person(obj) { // only one argument
  this.name = obj.name;
  this.surname = obj.surname;
}

var person = new Person({name: 'Giulio', surname: 'Canti'});
person.name; // => 'Giulio'
```

I'll list the reasons why I think the latter is a better choice **when extreme performance is not required**.

## 1. Easy maintenance and optional `new`

With `vanilla` there are 4 points of maintenance if you add an argument:

```js
/**
 ...
 * @param {String} email // change
 ...
 */
function VanillaPerson(name, surname, email) { // change

  // make `new` optional
  if (!(this instanceof VanillaPerson)) {
    return new VanillaPerson(name, surname, email); // change
  }

  this.name = name;
  this.surname = surname;
  this.email = email; // change
}
```

With `1-arity` there is a single point of maintenance if you add an argument:


```js
function Person(obj) {

  if (!(this instanceof Person)) {
    return new Person(obj);
  }

  this.name = obj.name;
  this.surname = obj.surname;
  this.email = obj.email; // change
}
```

Many people consider the optional `new` an anti-pattern. I don't, but I'm fine with that.
Personally I use `new` when I'm instantiating a class because it makes clear the intent, but
I'll continue to write `$('.myclass').show()` instead of `new $('.myclass').show()` despite the anti-pattern thing.


## 2. Named parameters

JavaScript hasn't named parameters:

```js
// first argument is name or surname? I don't remember
var person = new VanillaPerson('Canti', 'Giulio'); // wrong!
```

`1-arity` is more verbose, but code is read more than written:

```js
// order doesn't matter and it's more readable
var person = new Person({surname: 'Canti', name: 'Giulio'});
```

## 3. Better management of optional parameters

With `vanilla`, handling optional arguments can be ugly and error prone:

```js
function VanillaPerson(name, surname, email, vat, address) {
  this.name = name;
  this.surname = surname;
  this.email = email;
  this.vat = vat;
  this.address = address;
}

// I must count the arguments to know where to put 'myaddress'
var person = new VanillaPerson('Giulio', 'Canti', null, 'myaddress'); // wrong!
```

With `1-arity` it's easy:

```js
var person = new Person({surname: 'Canti', name: 'Giulio', address: 'myaddress'});
```

## 4. JSON deserialization for free

Say you have a JSON of a person served by a JSON API:

```json
{
  "name": "Giulio",
  "surname": "Canti"
}
```

With `vanilla` you must implement (and maintain) a custom deserializer:

```js
function deserialize(x) {
  return new VanillaPerson(x.name, x.surname);
}

var person = deserialize(json);
```

Since in `1-arity` arguments and instances have the same shape, you get
deserialization for free.

```js
var person = new Person(json);
```

For a deeper discussion about deserialization see [JSON Deserialization Into An Object Model](http://gcanti.github.io/2014/09/12/json-deserialization-into-an-object-model.html).

## 5. Idempotency

In math a function `f` is idempotent if `f(f(x)) = f(x)`.

`vanilla` is not idempotent, but it's easy to make `1-arity` idempotent:

```js
function Person(obj) {

  if (obj instanceof Person) {
    return obj;
  }

  ...
}

var person = new Person({name: 'Giulio', surname: 'Canti'});
new Person(person) === person; // => true
```

## 6. Avoid boilerplate

If you are a Domain Driven Design guy, you struggle with the verbosity of defining
all your classes, but with the `1-arity` pattern you can avoid the boilerplate with a simple function like this:

```js
function struct(props) {

  function Struct(obj) {

    // make Struct idempotent
    if (obj instanceof Struct) return obj;

    // make `new` optional, decomment if you agree
    // if (!(this instanceof Struct)) return new Struct(obj);

    // add props
    for (var name in props) {
      if (props.hasOwnProperty(name)) {
        // here you could implement type checking exploiting props[name]
        this[name] = obj[name];
      }
    }

    // make the instance immutable, decomment if you agree
    // Object.freeze(this);

  }

  // keep a reference to meta infos for further processing,
  // documentation tools and IDEs support
  Struct.meta = {
    props: props
  };

  return Struct;

}

// defines a 1-arity Person class
var Person = struct({
  name: String,
  surname: String
});

var person = new Person({surname: 'Canti', name: 'Giulio'});
```

## Further reading

This is an article explaining the rationale behind these reasons: [JavaScript, Types and Sets - Part I](https://gcanti.github.io/2014/09/29/javascript-types-and-sets.html)

## Implementation

I used this pattern to implement [tcomb](https://github.com/gcanti).

tcomb is a library for Node.js and the browser which allows you to **check the types** of
JavaScript values at runtime with a simple syntax. It's great for **Domain Driven Design**,
for testing and for adding safety to your internal code.

