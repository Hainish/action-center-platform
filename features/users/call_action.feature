@javascript
Feature: Do a Call Action
  An interested member of the community should be able to call to a
  Relevant congress person's phone

  Scenario: An activist creates a call petition and a supporter uses it
    Given A call campaign targeting a person exists
      And I am not logged in
    When I browse to the call action page
    Then I can use the form to call the target

    When I go down the try again path of the call form
    Then I was shown the calling you now message
