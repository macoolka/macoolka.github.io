---
layout: post
title: JSON API Validation In Node.js
excerpt: "In the last post I've showed a good solution for consuming a JSON API on the client, but what about the server?"
---

## The Problem

In the last post ([JSON Deserialization Into An Object Model](/2014/09/12/json-deserialization-into-an-object-model.html)) I've showed a good solution for consuming a JSON API on the client, but what about the server?

While on the client type checking is a plus (especially in development), on the server the matter is more critical:

- you can't assume the correctness of the payloads so you must always **validate** the receiving data
- when requests are bad, you should respond with **meaningful error messages** to help your API users
- you must **write and maintain** extensive api documentation

In this post I'll show you how this work can be done in **a few lines of code and with the bonus of providing a contract to your API users**, with the help of [tcomb-validation](https://github.com/gcanti/tcomb-validation).

tcomb-validation is a a general purpose JavaScript validation library based on [type combinators](https://github.com/gcanti/tcomb).

## Example: A SignUp API

Say you have a sign up API receiving in post a JSON like this:

```js
{
  "username": "giulio", // a required string
  "password": "secret", // a required string with at least 6 chars
  "locale": "it_IT"     // optional, one of "it_IT", "en_US"
}
```

and returning a JSON like this:

```js
{
  "id": 1,              // a required number
  "username": "giulio", // a required string
  "locale": "it_IT"     // optional, one of "it_IT", "en_US"
}
```

Let's write its domain model:

## API Model

```js
// domain.js

var t = require('tcomb');

// a subtype is a pair (type, predicate)
// where predicate is a function with signature (x) -> boolean
var Password = t.subtype(t.Str, function (s) {
  return s.length >= 6;
});

// enum
var Locale = t.enums.of('it_IT en_US');

// a struct is a type containing properties (i.e. a class)
var SignUpInput = t.struct({
  username: t.Str,          // string type
  password: Password,
  locale:   t.maybe(Locale) // maybe means optional
});

var SignUpOutput = t.struct({
  id:       t.Num,          // number type
  username: t.Str,
  locale:   t.maybe(Locale)
});

module.exports = {
  Password:     Password,
  Locale:       Locale,
  SignUpInput:  SignUpInput,
  SignUpOutput: SignUpOutput
};
```

And now the code of the server application:

## Payload Validation

```js
// app.js

var express = require('express');
var app =     express();
var t =       require('tcomb-validation');
var domain =  require('./domain');

app.post('/signup', function (req, res) {
  var input = JSON.parse(req.body.input);

  // one-liner validation
  var result = t.validate(input, domain.SignUpInput);

  if (result.isValid()) {

    // ..your logic here..

    // using SignUpOutput it's not mandatory, but enforces the contract
    var output = new domain.SignUpOutput({id: 1, username: 'giulio', locale: 'it_IT'});

    res.status(200).json(output);

  } else {
    // in result.errors there are details on the validation failure
    res.status(400).json(result.errors);
  }
});
```

## API Contract

As a consequence of what presented in [JSON Deserialization Into An Object Model](/2014/09/12/json-deserialization-into-an-object-model.html), if you **open source** the `domain.js` file you can provide to your API users a:

- cheap
- (auto) documented
- type checked (with descriptive error messages)
- already tested
- easy to use
- **versioned with your API**

minimal JavaScript client.

## Reference

For a reference of the tcomb-validation library see [here](https://github.com/gcanti/tcomb-validation) on GitHub.

