// signup.js

$(function () {

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

});