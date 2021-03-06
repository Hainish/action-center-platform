/*
 *  Congress Forms - v0.0.1
 *  A widget for building forms for contacting congress.
 *  https://github.com/efforg/congress-forms.js
 *
 *  Made by Thomas Davis
 *  Under TBD License
 */
 ; // close other statements for safety
(function($, window, document, undefined) {

  // This code is based off the jquery boilerplate project

  // Create the defaults once
  var pluginName = "congressForms";
  var defaults = {
    labels: true,
    // Debug, doesn't send emails just triggers error and success callbacks
    debug: false,
    values: {},
    bioguide_ids: [],
    labelClasses: '',
    textInputClasses: 'form-control',
    textareaClasses: 'form-control',
    formClasses: 'form',
    selectInputClasses: 'form-control',
    formGroupClasses: 'form-group',
    legislatorLabelClasses: '',
    submitClasses: 'btn',
    // Callbacks
    success: function () {},
    onRender: function () {},
    topic_category: null,
    campaign_tag: null,

    // Legislator callbacks are called for each email ajax request
    onLegislatorSubmit: function (legislatorId, legislatorFieldset) {},
    onLegislatorCaptcha: function (legislatorId, legislatorFieldset) {},
    onLegislatorCaptchaSubmit: function (legislatorId, legislatorFieldset) {},
    onLegislatorCaptchaSuccess: function (legislatorId, legislatorFieldset) {},
    onLegislatorCaptchaError: function (legislatorId, legislatorFieldset) {},
    onLegislatorSuccess: function (legislatorId, legislatorFieldset) {},
    onLegislatorError: function (legislatorId, legislatorFieldset) {},

    error: function () {}
  };

  // The actual plugin constructor

  function Plugin(element, options) {
    this.element = element;
    this.settings = $.extend({}, defaults, options);
    this._defaults = defaults;
    this._name = pluginName;
    this.init();
  }

  Plugin.prototype = {

    completedEmails: 0,
    legislatorCount: 0,

    init: function() {
      _.bindAll(this, 'toggleChecked', 'onCaptchaNeeded');
      var that = this;

      var form = $('<form/>').addClass(this.settings.formClasses);
      this.retrieveFormElements(form);
      //console.log(form);
      $(form).on('submit', this.submitForm.bind(this));

      // Detect click of captcha form
      $('body').on('click', '.' + pluginName + '-captcha-button', function (ev) {
        var answerEl = $(ev.currentTarget).parents('.' + pluginName + '-captcha-container').find('.' + pluginName + '-captcha');
        that.submitCaptchaForm(answerEl);
      });
      $('body').on('click', '.recaptcha-submit', function(ev){
        var answerEl = $(ev.currentTarget).parents('.recaptcha-wrapper').find('#answer_serialized');
        that.submitCaptchaForm(answerEl);
      });
      // Detect enter key on input
      $('body').on('keypress', '.' + pluginName + '-captcha', function(ev) {
        if(ev.which == 13) {
          var answerEl = $(ev.currentTarget);
          that.submitCaptchaForm(answerEl);
        }
      });
    },
    // Get's required form fields for the legislators and generates inputs
    retrieveFormElements: function(form) {
      var that = this;
      $.ajax({
        url: that.settings.contactCongressServer + '/retrieve-form-elements',
        type: 'post',
        data: {
          bio_ids: this.settings.bioguide_ids
        },
        success: function(data) {
          // TODO - throw on server error
          var groupedData = that.groupCommonFields(data);
          that.generateForm(groupedData, form)
        }

      });

    },
    submitForm: function (ev) {
      //console.log(this, 'a')
      var that = this;

      var form = $(ev.currentTarget);
      // Select common field set
      var commonFieldset = $('#' + pluginName + '-common-fields', form);
      var commonData = commonFieldset.serializeObject();
      //console.log(commonData);
      if($('.' + pluginName + '-legislator-fields').length > 0 ){
        $.each($('.' + pluginName + '-legislator-fields'), function(index, legislatorFieldset) {
          var legislatorId = $(legislatorFieldset).attr('data-legislator-id');
          var legislatorData = $(legislatorFieldset).serializeObject();
          console.log(legislatorId, legislatorFieldset, legislatorData);
          var fullData = $.extend({}, commonData, legislatorData);
          var captcha_uid = that.generateUID();
          that.settings.onLegislatorSubmit(legislatorId, $(legislatorFieldset));
          if(that.settings.debug) {
            // Simulate error and success per legislator 50/50 of the time
            setTimeout(function () {
              var randomNumber = Math.ceil(Math.random() * 3);
              switch (randomNumber) {
                case 1:
                  that.settings.onLegislatorSuccess(legislatorId, $(legislatorFieldset));
                  break;
                case 2:
                  that.settings.onLegislatorError(legislatorId, $(legislatorFieldset));
                  break;
                case 3:

                  var captchaForm = that.generateCaptchaForm('http://i.imgur.com/BG2yMUp.png', legislatorId, captcha_uid);
                  $(legislatorFieldset).append(captchaForm);
                  that.settings.onLegislatorCaptcha(legislatorId, $(legislatorFieldset));

                  break;
              }
            }, 500);
          } else {
            $.ajax({
              url: that.settings.contactCongressServer + '/fill-out-form',
              type: 'post',
              xhrFields: {
                withCredentials: true
              },
              data: {
                bio_id: legislatorId,
                campaign_tag: that.settings.campaign_tag,
                fields: fullData
              },
              success: function( data ) {
                console.log('what', data)
                if(data.status === 'success') {
                  that.settings.onLegislatorSuccess(legislatorId, $(legislatorFieldset));
                  //SUCCESS GOES HERE
                } else if (data.status === 'captcha_needed'){
                  that.onCaptchaNeeded(legislatorId, legislatorFieldset, data.url, data.uid);
                } else {
                  that.settings.onLegislatorError(legislatorId, $(legislatorFieldset));
                }
                //console.log(arguments);
              }
            });

          }

        });
      } else {
        // There is only one legislator
        var legislator = that.settings.bioguide_ids[0];

        var captcha_uid = that.generateUID();
        if(that.settings.debug) {
          // Simulate error and success per legislator 50/50 of the time
          setTimeout(function () {
            var randomNumber = Math.ceil(Math.random() * 3);
            switch (randomNumber) {
              case 1:
                that.settings.onLegislatorSuccess(legislator, $(commonFieldset));
                break;
              case 2:
                that.settings.onLegislatorError(legislator, $(commonFieldset));
                break;
              case 3:
                var captchaForm = that.generateCaptchaForm('http://i.imgur.com/BG2yMUp.png', legislator, captcha_uid);
                $(commonFieldset).append(captchaForm);
                that.settings.onLegislatorCaptcha(legislator, $(commonFieldset));
                break;
            }
          }, 500);
        } else {

          $.ajax({
            url: that.settings.contactCongressServer + '/fill-out-form',
            type: 'post',
            data: {
              bio_id: legislator,
              fields: commonData
            },
            success: function( data ) {
              console.log('hey', data);
              if(data.status === 'success') {
                that.settings.onLegislatorSuccess(legislator, $(commonFieldset));
                //SUCCESS GOES HERE
              } else if (data.status === 'captcha_needed'){
                that.onCaptchaNeeded(legislator, commonFieldset, data.url, data.uid);
              } else {
                that.settings.onLegislatorError(legislator, $(commonFieldset));
              }
              //console.log(arguments);
            }
          });
        }
      }
      // Disable inputs after we serialize their values otherwise they won't be picked up
      $('input, textarea, select, button' , form).attr('disabled', 'disabled');
      return false;
    },
    onCaptchaNeeded: function(legislator, fieldset, url, uid, replace){
      var captchaForm;
      if($('[data-google-recaptcha=true]', fieldset).length > 0){
        captchaForm = this.generateRecaptchaForm(url, legislator, uid);
        $('.recaptcha-option', captchaForm).click(this.toggleChecked);
      } else {
        captchaForm = this.generateCaptchaForm(url, legislator, uid);
      }
      if(replace){
        $(fieldset).find('.recaptcha-div').replaceWith(captchaForm);
      } else {
        $(fieldset).append(captchaForm);
      }
      this.settings.onLegislatorCaptcha(legislator, $(fieldset));
    },
    generateForm: function(groupedData, form) {
      var that = this;


      var required_actions = groupedData.common_fields;

      // Generate a <fieldset> for common fields
      var commonFieldsFieldSet = $('<fieldset/>').attr('id', pluginName + '-common-fields');
      //commonFieldsFieldSet.append('<legend>Common Fields</legend>');
      $.each(required_actions, function(index, field) {
        var form_group = that.generateFormGroup(field);
        commonFieldsFieldSet.append(form_group);
      });
      form.append(commonFieldsFieldSet);

      // Generate a <fieldset> for each extra legislator fields
      $.each(groupedData.individual_fields, function(legislator, fields) {
        //console.log(legislator);
        var fieldset = $('<fieldset/>').attr('data-legislator-id', legislator).addClass(pluginName + '-legislator-fields');
        fieldset.append($('<label>').text(legislator).addClass(that.settings.legislatorLabelClasses));
        //fieldset.append('<legend>' + legislator + '</legend>');
        $.each(fields, function(index, field) {
          var form_group = that.generateFormGroup(field);
          fieldset.append(form_group);
        });
        form.append(fieldset);
      });
      if(that.settings.bioguide_ids.length === 1) {
        var legislator = that.settings.bioguide_ids[0];
        commonFieldsFieldSet.attr('data-legislator-id', legislator).addClass(pluginName + '-legislator-fields').prepend($('<label>').text(legislator).addClass(that.settings.legislatorLabelClasses));
      }

      // Attach submit button
      var submitButton = $('<input type="submit"/>');
      submitButton.addClass(that.settings.submitClasses);
      form.append(submitButton);

      $(that.element).append(form);
      that.settings.onRender();
    },
    submitCaptchaForm : function (answerEl) {
      var that = this;
      var answer = $(answerEl).val();
      var captchaUID = $(answerEl).attr('data-captcha-uid');
      var legislatorId = $(answerEl).attr('data-captcha-legislator-id');
      var legislatorFieldset = $('fieldset[data-legislator-id="'+legislatorId+'"]');
      that.settings.onLegislatorCaptchaSubmit(legislatorId, $(legislatorFieldset));

      if(that.settings.debug) {
        var randomNumber = Math.ceil(Math.random() * 2);
        setTimeout(function () {
        switch (randomNumber) {
          case 1:
            that.settings.onLegislatorCaptchaSuccess(legislatorId, $(legislatorFieldset));
            break;
          case 2:
            that.settings.onLegislatorCaptchaError(legislatorId, $(legislatorFieldset));
            break;
        }
        }, 1500)
      } else {
        $.ajax({
          url: that.settings.contactCongressServer + '/fill-out-captcha',
          type: 'post',
          xhrFields: {
            withCredentials: true
          },
          data: {
            uid: captchaUID,
            answer: answer
          },
          success: function( data ) {
            if(data.status === 'success') {
              that.settings.onLegislatorCaptchaSuccess(legislatorId, $(legislatorFieldset));
            } else if (data.status === 'captcha_needed') {
              that.onCaptchaNeeded(legislatorId, legislatorFieldset, data.url, captchaUID, true);
            } else {
              that.settings.onLegislatorCaptchaError(legislatorId, $(legislatorFieldset));
            }
          }
        });
      }
  /*
        $.each($('.' + pluginName + '-legislator-fields'), function(index, legislatorFieldset) {
          var legislatorId = $(legislatorFieldset).attr('data-legislator-id');
          var legislatorData = $(legislatorFieldset).serializeObject();
          console.log(legislatorId, legislatorFieldset, legislatorData);
          var fullData = $.extend({}, commonData, legislatorData);
          var captcha_uid = that.generateUID();
          that.settings.onLegislatorSubmit(legislatorId, $(legislatorFieldset));
*/

      console.log('answer', answer,captchaUID, legislatorId, legislatorFieldset);
      return false;
    },
    generateCaptchaForm: function (captchaUrl, legislatorId, captchaUID) {
      var that = this;
      var formGroup = $('<div/>').addClass(pluginName +'-captcha-container');
      var label = $('<label/>').text('Type the text in the image to send your message').addClass(pluginName +'-captcha-label');
      formGroup.append(label);
      var img = $('<img/>').attr('src', captchaUrl).addClass(pluginName +'-captcha-image');
      formGroup.append(img);
      var input = $('<input/>').attr('type', 'text').addClass('form-control ' + pluginName +'-captcha')
          .attr('data-captcha-legislator-id', legislatorId)
          .attr('data-captcha-uid', captchaUID);
      formGroup.append(input);
      var submitButton = $('<button>').attr('type', 'button').addClass('btn btn-primary ' + pluginName +'-captcha-button').text('Submit Captcha');
      formGroup.append(submitButton);
      return formGroup;
    },
    generateRecaptchaForm: function (captchaUrl, legislatorId, captchaUID) {
      return $(JST['application/templates/recaptcha']({
        captcha_url: captchaUrl,
        captcha_uid: captchaUID,
        legislator_id: legislatorId
      }));
    },
    toggleChecked: function(ev){
      var options_selected = this.deserialize_options($('#answer_serialized', $(ev.target).parents('.recaptcha-wrapper')).val());
      var new_value = !options_selected[$(ev.target).data('recaptcha-option')];
      options_selected[$(ev.target).data('recaptcha-option')] = new_value;
      if(new_value){
        $(ev.target).html('&#10003;');
      } else {
        $(ev.target).html('');
      }
      $('#answer_serialized', $(ev.target).parents('.recaptcha-wrapper')).val(this.serialize_options(options_selected));
    },
    deserialize_options: function(serialized){
      var deserialized = {};
      _.each(serialized.split(","), function(val){
        deserialized[Number(val)] = true;
      });
      return deserialized;
    },
    serialize_options: function(deserialized){
      return _.filter(
        _.map(deserialized, function(val, i){
          if(val && i != 0) return i;
        })
      ).join(',');
    },
    generateFormGroup: function(field) {
      var that = this;
      var label_name = that._format_label(field.value);
      var field_name = field.value;

      // Create a container for each label and input, defaults to bootstrap classes
      var form_group = $('<div/>').addClass(this.settings.formGroupClasses);


      // Generate the label
      if (that.settings.labels) {
        var label = $('<label/>')
          .text(label_name)
          .attr('for', field_name)
          .addClass(this.settings.labelClasses);

        form_group.append(label);
      }

      var valid_types = undefined;
      if(field.value in this.fieldData && "valid_types" in this.fieldData[field.value]){
        valid_types = this.fieldData[field.value]["valid_types"];
      }

      // Generate the input
      if (
        (
          field.options_hash !== null ||
          field.value === '$ADDRESS_STATE_POSTAL_ABBREV' ||
          field.value === '$ADDRESS_STATE_FULL'
        ) && (
          valid_types === undefined || "select" in valid_types
        )
      ) {
        var $input = $('<select/>');
        $input.addClass(that.settings.selectInputClasses);

        field.options = [];
        if(field.value === '$ADDRESS_STATE_POSTAL_ABBREV') {
          field.options = STATES.ABBREV;
          delete field.options_hash;
        }
        if(field.value === '$ADDRESS_STATE_FULL') {
          field.options = STATES.FULL;
          delete field.options_hash;
        }

        // If options_hash is an array of objects
        if (field.options_hash && $.isArray(field.options_hash) && typeof field.options_hash[0] === 'object') {
          var temp_options_hash = {};
          $.each(field.options_hash, function(option, key) {
            // Loop through properties of nested object
            $.each(option, function(prop, propName) {
              temp_options_hash[propName] = prop;
            });
          });
          field.options_hash = temp_options_hash;
        }
        // If options_hash an object?
        if (field.options_hash && !$.isArray(field.options_hash)) {
          $.each(field.options_hash, function(option, key) {
            field.options.push({
              name: option,
              value: key
            });
          });
          delete field.options_hash;
        };
        //console.log(typeof field.options_hash)
        if (typeof field.options_hash === 'string' || !field.options_hash) {
          field.options_hash = [];
        }

        var final_fuzzymatch;
        if(field.value === "$TOPIC"){
          if(field.options.length > 0){
            var fs = FuzzySet(_.map(field.options, function(option){ return option.name; }) || _.values(field.options_hash));
          } else {
            var fs = FuzzySet(_.values(field.options_hash));
          }

          var fsu = new FuzzySetUtil(fs)

          var best_fuzzymatch = fsu.find_best_match(
            this.settings.topic_category,
            .75
          )
          final_fuzzymatch = best_fuzzymatch ? best_fuzzymatch.term : null;
        }

        $.each(field.options_hash, function(key, option) {
          var optionEl = $('<option/>')
            .attr('value', option)
            .text(option);
          if(option == final_fuzzymatch){
            optionEl.attr("selected", "selected");
          }
          $input.append(optionEl);
        });
        $.each(field.options, function(key, option) {
        	//console.log(option);
          var optionEl = $('<option/>')
            .attr('value', option.value)
            .text(option.name);
          if(option.name == final_fuzzymatch){
            optionEl.attr("selected", "selected");
          }
          $input.append(optionEl);
        });



      } else if(field_name === '$MESSAGE') {

        var $input = $('<textarea />')
          .attr('id', field_name)
          .attr('placeholder', label_name);
        $input.addClass(that.settings.textareaClasses);
      } else if(field_name === '$PHONE') {
        var $input = $(JST['application/templates/phone_fields']());
        $input.each(function(){
          $phone = $(this);
          $phone.bfhphone($phone.data());
        });
      } else {
        var $input = $('<input type="text" />')
          .attr('placeholder', label_name);
        $input.addClass(that.settings.textInputClasses);
        if(field.options_hash && "google_recaptcha" in field.options_hash)
          $input.attr('data-google-recaptcha', 'true');
      }
      if(that.settings.values && typeof that.settings.values[field_name] !== 'undefined') {
        $input.val(that.settings.values[field_name]);
      }

      $input.attr('id', field_name).attr('name', field_name);
      $input.attr('required', 'required');
      var fieldData = that.fieldData;
      if(fieldData[field_name]) {
        $.each(fieldData[field_name], function (attr, attrValue) {
          $input.attr(attr, attrValue);
        })
      }
      form_group.append($input);
      return form_group;
    },
    fieldData: {
      '$EMAIL': {
        'pattern': "^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$",
        'title': "Must be a valid e-mail address",
        'valid_types': ['text']
      },
      '$NAME_FIRST': {
        'maxlength': '20',
        'valid_types': ['text']
      },
      '$NAME_LAST': {
        'maxlength': '20',
        'valid_types': ['text']
      },
      '$CAPTCHA_SOLUTION': {
        'valid_types': ['text']
      },
      '$MESSAGE': {
        'valid_types': ['text']
      }
    },
    fieldsOrder: [
      '$NAME_PREFIX',
      '$NAME_FIRST',
      '$NAME_LAST',
      '$PHONE',
      '$EMAIL',
      '$SUBJECT',
      '$TOPIC'
    ],
    groupCommonFields: function(data) {
      // TODO - This needs a refactor, don't think this was done well
      // The following clumsy logic, compiles the groupedData object below
      var that = this;
      var groupedData = {
        common_fields: [],
        individual_fields: {}
      }

      var sort = function(a, b){
        return that.fieldsOrder.indexOf(a.value) - that.fieldsOrder.indexOf(b.value);
      };

      var numberOfLegislators = that.settings.bioguide_ids.length;

      // If we have multiple legislators lets group their common fields
      if (numberOfLegislators > 1) {

        var common_field_counts = {};
        // Let's figure out which fields the legislators have in common
        // TODO - Probably a better way to do this
        $.each(this.settings.bioguide_ids, function(index, bioguide_id) {
          var legislator = data[bioguide_id];
          try {
            $.each(legislator.required_actions, function(index, field) {
              if (field.options_hash === null) {
                // Option hashes make it difficult for their to be a common field
                if (typeof common_field_counts[field.value] === 'undefined') {
                  common_field_counts[field.value] = [];
                }
                common_field_counts[field.value].push(bioguide_id);
              } else {
                if(typeof groupedData.individual_fields[bioguide_id] === 'undefined') {
                  groupedData.individual_fields[bioguide_id] = []
                }
                groupedData.individual_fields[bioguide_id].push(field);
              }
            });
          }
          catch(e) {}
        });

        var common_fields = [];

        $.each(common_field_counts, function(field, bioguide_ids) {

          // Common fields should have all legislators onboard
          if (bioguide_ids.length > 1) {
            groupedData.common_fields.push({
              value: field,
              options_hash: null
            });
          } else {
            $.each(bioguide_ids, function(index, bioguide_id) {
              if (typeof groupedData.individual_fields[bioguide_id] === 'undefined') {
                groupedData.individual_fields[bioguide_id] = [{
                  value: field,
                  options_hash: null
                }];
              } else {
                groupedData.individual_fields[bioguide_id].push({
                  value: field,
                  options_hash: null

                });
              }
              groupedData.individual_fields[bioguide_id].sort(sort);
            });

          }

        });
        groupedData.common_fields.sort(sort);
      } else {
        // If we only have 1 legislator, their fields are the common fields
        groupedData.common_fields = that.dedupeAndSortFields(
          data[that.settings.bioguide_ids[0]].required_actions,
          sort
        );
      }
      //console.log(groupedData);
      return groupedData;
    },

    dedupeAndSortFields: function(required_actions, sorting_function){
      var fieldValues = {};
      var deduped = [];
      $.each(required_actions, function(index, field){
        if(!(field.value in fieldValues)){
          fieldValues[field.value] = true;
          deduped.push(field);
        }
      });
      deduped.sort(sorting_function);
      return deduped;
    },

    // Turns the servers required field into a more readable format
    // e.g. $NAME_FIRST -> Name First
    // TODO - Make even more readable form labels, probably manually
    _format_label: function(string) {
      var manual_labels = {
        '$NAME_LAST': 'Your last name',
        '$NAME_FIRST': 'Your first name',
        '$EMAIL': 'Your email',
        '$TOPIC': 'Message topic',
        '$NAME_PREFIX': 'Your prefix (e.g. Mr./Ms.)',
        '$PHONE': 'Your phone number'


      }
      if(typeof manual_labels[string] !== 'undefined') {
          return manual_labels[string];
      } else {
        var string_arr = string.replace("$", "").replace("_", " ").split(" ");
        return $.map(string_arr, function(word) {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(" ");
      }
    },

    // Generates UID's for request to congress form server
    generateUID: function() {
      var text = "";
      var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

      for( var i=0; i < 10; i++ )
          text += possible.charAt(Math.floor(Math.random() * possible.length));

      return text;
    }
  };

  // Extend jquery
  $.fn.serializeObject = function() {
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
       if (o[this.name]) {
           if (!o[this.name].push) {
               o[this.name] = [o[this.name]];
           }
           o[this.name].push(this.value || '');
       } else {
           o[this.name] = this.value || '';
       }
    });
    return o;
  };


  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations
  $.fn[pluginName] = function(options) {
    this.each(function() {
      if (!$.data(this, "plugin_" + pluginName)) {
        $.data(this, "plugin_" + pluginName, new Plugin(this, options));
      }
    });

    // chain jQuery functions
    return this;
  };

})(jQuery, window, document);
