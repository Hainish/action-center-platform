FactoryGirl.define do
  factory :call_campaign do
    title "important call"
    message "Please protect my right to use the Internet safely"
    call_campaign_id 0

    after(:create) do |call_campaign|
      FactoryGirl.create(:action_page_with_call_campaign, call_campaign_id: call_campaign.id)
    end
  end


  # factory :tweet_targeting_senate, :parent => :call_campaign do
  #   target_senate true
  # end

end
