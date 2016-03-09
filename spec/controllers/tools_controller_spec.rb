require 'rails_helper'

RSpec.describe ToolsController, type: :controller do

  let(:valid_attributes) { {
    signature: {
      "petition_id"=>"1",
      "email"=>"rob@eff.org",
      "first_name"=>"adsf",
      "last_name"=>"asdf",
      "zipcode"=>"94109",
      "city"=>"",
      "country_code"=>""
    }
  } }

  before(:each) do
    stub_smarty_streets
  end

  it "should create signatures when a user signs" do
    stub_update_congress_scorecards
    create_signature_and_have_user_sign

    sig = @petition.signatures.last

    expect(sig.city).to eq "San Francisco"
    expect(sig.state).to eq "California"
    expect(@petition.signatures.count).to eq 100
  end

  # this is a tricky one... there's some coupling in the javascript layer as
  # well as in the controllers
  it "should still work if SmartyStreets credentials aren't hooked up" do
    # we want to raise an exception if we get into SmartyStreets at all
    # with a nil SmartyStreets API an alt code path is followed
    allow(SmartyStreets).to receive(:get_city_state).with("94109").and_raise("should not have wandered into SmartyStreets")
    Rails.application.secrets.smarty_streets_id = nil

    stub_update_congress_scorecards
    create_signature_and_have_user_sign
    sig = @petition.signatures.last
    expect(sig.city).to eq ""
    expect(sig.state).to eq ""
    expect(sig.zipcode).to eq valid_attributes[:signature]["zipcode"]
    expect(@petition.signatures.count).to eq 100
  end


  it "should test the call tool requests" do
    stub_query_call_initiation

    @call_campaign = FactoryGirl.create(:call_campaign)
    @action = @call_campaign.action_page

    call_params = {
      action_id: @action.id,
      call_campaign_id: @call_campaign.call_campaign_id,
      location: "null",
      phone: 415_555_5555,
      update_user_data: "undefined",
      zipcode: 94109
    }

    post :call, call_params

    expect(response.code).to eq "200"
  end

end

# refactor, does more than stub...
def create_signature_and_have_user_sign
  @petition = FactoryGirl.create(:petition_with_99_signatures_needing_1_more)
  post :petition, signature: valid_attributes[:signature].merge({ "petition_id" => @petition.id.to_s })
end
