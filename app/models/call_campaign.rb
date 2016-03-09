class CallCampaign < ActiveRecord::Base
  has_one :action_page

  # queries the call-power tool and responds with the 'required_fields'
  def self.query_required_fields(call_campaign_id)
    response = RestClient.get Rails.application.config.call_tool_url +
      '/api/campaign/' + call_campaign_id +
      '?api_key=' + Rails.application.secrets.call_tool_api_key
    JSON.parse(response.body)["required_fields"]
  end

  # This method will initiate a call through the twilio service.
  # The function wants params to contain:
  #   "location",
  #   "phone",
  #   "zipcode"
  # some can be missing.
  def initiate_call(params)
    begin
      response = query_call_initiation(params)
    rescue RestClient::BadRequest => e
      begin
        error = JSON.parse(e.http_body)["error"]
      rescue
        raise e
      end
      # Don't raise for twilio error 13224: number invalid
      unless error.match(/^13224:/)
        if Rails.application.secrets.sentry_dsn.nil?
          raise error
        else
          Raven.capture_message(error, { :level => 'info' })
        end
      end
    end
  end

  private
    # TODO: refactor this into the call_campaign model
    # This request initiates the call tool to have the twilio service call the
    # supporter's phone and connect them to the target will raise a
    # RestClient::BadRequest exception if there's an error which will happen
    # if there's a twilio "13224: number invalid" for instance
    def query_call_initiation(params)
      RestClient.get Rails.application.config.call_tool_url + '/call/create',
        params: { campaignId: params[:call_campaign_id],
                  userPhone:  params[:phone],
                  userCountry: 'US',
                  userLocation: params[:location],
                  # TODO - Settle on the schema of the private meta data
                  meta: {
                    user_id:     @user.try(:id),
                    action_id:   params[:action_id],
                    action_type: 'call'
                  }.to_json,
                  callback_url: root_url }
    end


end
