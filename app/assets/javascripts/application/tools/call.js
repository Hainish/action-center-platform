$(document).on('ready', function() {
  if($('#call-tool').length > 0){

    // A class for working with the call tool
    window.CallPower = function() {
      var call_campaign_id = $('[data-call-campaign-id]').attr('data-call-campaign-id');
      var url = '/tools/call_required_fields?call_campaign_id=' + call_campaign_id;

      var required_location;

      var $phone_number_field = $(document.getElementById('phone-input').text);
      var $zip_field = $(document.getElementById('zip-input').text);
      var $street_address_field = $(document.getElementById('street-address-input').text);

      $phone_number_field.each(function(){
        $phone = $(this);
        $phone.bfhphone($phone.data());
      });

      // The app needs to essentially look at the call-power tool and see
      // stuff like userLocation, if it want's lat-long, zipcode, or nothing
      this.populate_forms_based_on_required_location = function() {
        $.ajax({
          url: url,
          success: function(res){
            required_location = res.userLocation;
            populate_form_with_response_data();
          },
          error: function() { console.log("Failed when querying " + url); }
        });
      };

      // This function will initiate a call to the number specified.
      // Some of the data for this call comes from
      this.submit_call_request = function(phone, location, zip_code, street_address, action_id, call_campaign_id, update_user_data){
        var url = '/tools/call?action_id=' + encodeURIComponent(action_id) +
                  '&call_campaign_id=' + encodeURIComponent(call_campaign_id) +
                  '&phone=' + encodeURIComponent(phone) +
                  '&location=' + encodeURIComponent(location) +
                  (street_address == '' ? '' : '&street_address=' + encodeURIComponent(street_address)) +
                  '&zipcode=' + encodeURIComponent(zip_code) +
                  '&update_user_data=' + encodeURIComponent(update_user_data);
        $.ajax({
          url: url,
          type: 'POST',
          success: function(res) {},
          error: function() {}
        });
      };

      // Pass in selectors for that buttons that:
      // call_submit, try_again, and change_source_number.
      // call_submit must be a submit type action, the others are onclick actions
      this.setup_handlers = function(options) {
        var $call_submit = $(options['call_submit']);
        var $try_again = $(options['try_again']);
        var $change_source_number = $(options['change_source_number']);
        var call = this;

        $call_submit.on('submit', function(ev) {
          var form = $(ev.currentTarget);

          var update_user_data = $('#update_user_data', form).val();
          var phone_number = $phone_number_field.val().replace(/[^\d.]/g, '');
          var street_address = $street_address_field.val();
          var zip_code = $zip_field.val().replace(/[^\d.]/g, '').slice(0,5);
          var action_id = $('[name="action-id"]', form).val();

          if(!isValidPhoneNumber(phone_number)){
            console.log("not valid phone number");
            rumbleEl($phone_number_field);
          } else if(zip_code.length != 5 && required_location === 'postal') {
            console.log("failed to have zip_code.length == 5");
            rumbleEl($zip_field);
          } else {
            determine_location(zip_code, street_address, function(err, location){
              call.show_calling_now_side_bar();
              height_changed();

              call.submit_call_request(phone_number, location, zip_code, street_address, action_id, call_campaign_id, update_user_data);
            });
          }
          return false;
        });

        $try_again.on('click', function(ev){
          call.show_manual_number_entry_form();
          height_changed();
          return false;
        });

        $change_source_number.on('click', function(ev){
          call.show_manual_number_entry_form();
          $('#inputPhone').val('').focus();
          height_changed();
          return false;
        });

      };


      // queries smarty streets with a zip code and street address to get a
      // lat/ lon position
      function determine_location(zip_code, street_address, cb){
        if(required_location == "latlon"){
          $.ajax({
            url: '/smarty_streets/street_address/?street=' + encodeURIComponent(street_address) + '&zipcode=' + encodeURIComponent(zip_code),
            success: function(res){
              if(res.length == 1){
                var lat = res[0].metadata.latitude;
                var lng = res[0].metadata.longitude;
                cb(null, lat + ',' + lng);
              }
            },
            error: function(err){
              cb(err);
            }
          });
        } else if (required_location == "postal") {
          cb(null, zip_code);
        } else {
          cb(null, null);
        }
      }

      function populate_form_with_response_data() {
        var $container = $('#call-tool-form-container');

        $('.call-tool-submit').removeAttr('disabled');
        $container.html("");
        if(required_location == "postal"){
          $container.append($phone_number_field);
          $container.append($zip_field);
        }
        else if(required_location == "latlon"){
          $container.append($phone_number_field);
          $container.append($street_address_field);
          $container.append($zip_field);
        }
        else {
          $container.append($phone_number_field);
        }
        height_changed();
      }

      // show form for entering your phone number manually and trying a call
      this.show_manual_number_entry_form = function(){
        hide_saved_phone_number_side_bar();

        toggle_manual_phone_number_entry_side_bar(true);
        toggle_calling_now_side_bar(false);
      };

      // indicate we're calling you now
      this.show_calling_now_side_bar = function(){
        hide_saved_phone_number_side_bar();

        toggle_calling_now_side_bar(true);
        toggle_manual_phone_number_entry_side_bar(false);
      };

      // pass in true to show, and false to hide
      function toggle_manual_phone_number_entry_side_bar(should_show){
        if (should_show) {
          $('.tool-title.precall').removeClass('hidden');
          $('.call-body-phone-not-saved').removeClass('hidden');
        } else {
          $('.tool-title.precall').addClass('hidden');
          $('.call-body-phone-not-saved').addClass('hidden');
        }
      }

      // pass in true to show, and false to hide
      function toggle_calling_now_side_bar(should_show){
        if (should_show) {
          $('.tool-title.postcall').removeClass('hidden');
          $('.call-body-active').removeClass('hidden');
        } else {
          $('.tool-title.postcall').addClass('hidden');
          $('.call-body-active').addClass('hidden');
        }
      }

      function hide_saved_phone_number_side_bar(){
        $('.call-body-phone-saved').addClass('hidden');
      }
    };

    // Begin code

    height_changed();

    window.call = new CallPower();

    call.setup_handlers({
      call_submit: 'form.call-tool, form.call-tool-saved',
      try_again: '.call-tool-try-again',
      change_source_number: '.call-tool-different-number'
    });

    call.populate_forms_based_on_required_location();
  }
});
