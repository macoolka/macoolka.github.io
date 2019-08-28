---
layout: post
title: JSON Deserialization Into An Object Model
excerpt: "Deserializing the payload of a JSON Api into your object model can be cumbersome: you must handle all this issues by hand. In this post I'll show you how this work can be done in a few lines of code and in a safe way with the help of tcomb."
---

## The Problem

Deserializing the payload of a JSON Api into your object model can be cumbersome: you must handle all this issues by hand:

- check the type of all values (especially during development)
- put values in the right place within the model tree
- if there are nested models, instantiate them with proper constructors

In this post I'll show you how
this work can be done in **a few lines of code and in a safe way** with the help of [tcomb](https://github.com/gcanti/tcomb).

tcomb is a library for Node.js and the browser which allows you to check the types of JavaScript values at runtime with a simple syntax. It's great for **Domain Driven Design**, for checking external input, for testing and for adding safety to your internal code.

## The Payload

Let the payload returned by the API be:

```js
var payload = {
  "posts": [
    {
      "id": 1,
      "title": "An alternative syntax for React propTypes"
    },
    {
      "id": 2,
      "title": "What if your domain model could validate the UI for free?"
    }
  ],
  "comments": [
    {
      "id": 1,
      "text": "Ooh those features are nice.",
      "postId": 1
    },
    {
      "id": 2,
      "text": "Awesome!",
      "postId": 2
    }
  ]
};
```

## The Object Model

Let's define the object model. First, with vanilla JavaScript:

```js
function Post(id, title) {
  // custom type checking here...
  this.id =     id;
  this.title =  title;
}

function Comment(id, text, postId) {
  // custom type checking here...
  this.id =     id;
  this.text =   text;
  this.postId = postId;
}

function Payload(posts, comments) {
  // custom type checking here...
  this.posts =    posts;
  this.comments = comments;
}
```
In order to deserialize the payload, we must **implement and maintain** a custom deserialization function:

```js
function deserialize(payload) {
  var posts = payload.posts.map(function (post) {
    return new Post(post.id, post.title);
  });
  var comments = payload.comments.map(function (comment) {
    return new Comment(comment.id, comment.text, comment.postId);
  });
  return new Payload(posts, comments);
}

var data = deserialize(payload);
console.log(data.posts[0] instanceof Post); // => true
```

## And Now Using tcomb

```js
var t = require('tcomb');

// a struct is a type containing properties (i.e. a class)
var Post = t.struct({
  id:     t.Num,  // number type
  title:  t.Str   // string type
});

var Comment = t.struct({
  id:     t.Num,
  text:   t.Str,
  postId: t.Num
});

var Payload = t.struct({
  posts:    t.list(Post),   // list of objects of type Post
  comments: t.list(Comment)
});
```

In order to deserialize the payload, we simply create a new instance of the `Payload` type and tcomb
will perform all the type checkings for us. If some check fails the debugger kicks in so you can inspect the stack and quickly find out what's wrong:

```js
var data = new Payload(payload);
console.log(data.posts[0] instanceof Post); // => true
```

## Reference

For a reference of the tcomb library see [here](https://github.com/gcanti/tcomb) on GitHub.

## Further reading

The Part II of this post: [JSON API Validation In Node.js](/2014/09/15/json-api-validation-in-node.html).