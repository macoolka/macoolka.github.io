---
layout: post
title: What if your domain model could validate the UI for free?
folder: what-if-your-domain-model-could-validate-the-ui-for-free
excerpt: "Does the world need another validation library? Probably not, but I think of tcomb more as a tool to build
fast and safe domain models"
---

## The Idea

Does the world need another validation library? Probably not, but I think of tcomb more as a tool to build
fast and safe domain models. Since I want the **models be the single source of truth** and
it's hard to keep my models and the UI validation rules synced, I think there is still something to explore.
The models should already express those validation rules so I only need to make them explicits.
I'll show you how to achive this goal with a simple example, a sign up form.

## Demo

You can found a demo [here](/resources/{{ page.folder }}/signup.html).

## [UPDATE] Implementation

For an implementation of the ideas exposed in this post see the [tcomb-form](https://github.com/gcanti/tcomb-form) library on GitHub.

## The Model

Let's design the domain model for the sign up process

```javascript
// domain.js

// A Reddit like sign up:
// - username: required
// - password: required
// - email: optional

// a username is a string with at least 1 char
var Username = subtype(Str, function (s) {
  return s.length >= 1;
});

// a password is a string with at least 6 chars
var Password = subtype(Str, function (s) {
  return s.length >= 6;
});

// an email is a string that contains '@' :)
var Email = subtype(Str, function (s) {
  return s.indexOf('@') !== -1;
});

// sign up info
var User = struct({
  username: Username,
  password: Password,
  email: maybe(Email) // optional, can be `null`
});

// send signup info to server
User.prototype.signup = function () {
  $.post('/signup', JSON.stringify(this));
};
```

## The View

I'll use [Bootstrap](http://getbootstrap.com) for this

```html
<!-- signup.html -->

<script src="tcomb.js"></script>
<script src="domain.js"></script>
<script src="signup.js"></script>

<form role="form" method="post">
  <div class="form-group">
    <input type="text" id="username" placeholder="Username" class="form-control"/>
  </div>
  <div class="form-group">
    <input type="password" id="password" placeholder="Password" class="form-control"/>
  </div>
  <div class="form-group">
    <input type="text" id="email" placeholder="Email (optional)" class="form-control"/>
  </div>
  <button class="btn btn-primary btn-block">Sign up</button>
</form>
```

## The View Controller

This is the tricky part: the controller must validate the input and show visual feedback to the
user that something went wrong. It's straightforward to write a general validating function exploiting
the `meta.props` hash of {{ site.projects.tcomb.markdown }} structs.

```javascript
// signup.js

$('form').on('submit', function (evt) {
  evt.preventDefault();
  // getting an instance of User means validation succeded
  var user = validate(User);
  if (user) {
    user.signup();
    alert('Signup info sent.');
  }
});

// configurable validating function
// - visual feedback is more fine grained
// - assume inputs are named like the struct props
function validate(Struct) {

  var values = {};
  var props = Struct.meta.props;
  var isValid = true;

  for (var id in props) {
    if (props.hasOwnProperty(id)) {
      var $input = $('#' + id);
      var value = values[id] = $input.val().trim() || null;
      if (!props[id].is(value)) {
        isValid = false;
        $input.parent().addClass('has-error');
      } else {
        $input.parent().removeClass('has-error');
      }
    }
  }

  return isValid ? new Struct(values) : null;
}
```

If you decide later that a username must be a string with at least 4 chars and you change the
model accordingly, you don't have to touch the view controller code.
