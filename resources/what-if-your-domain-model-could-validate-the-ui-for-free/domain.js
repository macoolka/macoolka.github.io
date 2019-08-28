// domain.js

// A Reddit like sign up:
// - username: required
// - password: required
// - email: optional

var subtype = t.subtype;
var struct = t.struct;
var maybe = t.maybe;
var Str = t.Str;

// a username is a string with at least 1 char
var Username = subtype(Str, function (s) {
  return s.length >= 1;
}, 'Username');

// a password is a string with at least 6 chars
var Password = subtype(Str, function (s) {
  return s.length >= 6;
}, 'Password');

// an email is a string that contains '@' :)
var Email = subtype(Str, function (s) {
  return s.indexOf('@') !== -1;
}, 'Email');

// sign up info
var User = struct({
  username: Username,
  password: Password,
  email: maybe(Email) // optional, can be `null`
}, 'User');

// send signup info to server
User.prototype.signup = function () {
  $.post('/signup', JSON.stringify(this));
};