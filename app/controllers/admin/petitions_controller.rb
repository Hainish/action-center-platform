include PetitionHelper
class Admin::PetitionsController < Admin::ApplicationController
  before_action :set_petition
  def show
    @signatures = @petition.signatures.
      paginate(:page => params[:page], :per_page => 10).
      order('id desc')
  end

  # This file will wind up at CiviCRM
  def csv
    send_data @petition.to_csv
  end

  # this csv file is just for activists, they tender them to legislators after vetting
  def presentable_csv
    filename = sanitize_filename("#{@petition}.csv")
    send_data @petition.to_presentable_csv, filename: filename
  end

  def report
    @actionPage = Petition.find(params[:id]).action_page
    @legislator = Sunlight::Congress::Legislator.by_bioguide_id(params[:bioguide_id]).first
    @scorecard = CongressScorecard.find_by(action_page_id: @actionPage.id,
                                           bioguide_id: params[:bioguide_id])
    @petition = @actionPage.petition
    @signatures = @petition.signatures.where(state: @legislator.state_name).order(:city, :zipcode)
    render layout: 'report'
  end

  private
  def set_petition
    @petition = Petition.find(params[:id])
  end
end
