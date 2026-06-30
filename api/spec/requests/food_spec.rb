require "rails_helper"

RSpec.describe "Api::Food", type: :request do
  let(:player) { Player.create!(player_code: PlayerCode.generate, display_name: "K", currency: 1_000, food_meat: 0) }
  let(:headers) { { "Authorization" => "Bearer #{player.player_code}" } }

  it "buys food" do
    post "/api/food", params: { type: "meat", quantity: 20 }, headers: headers

    expect(response).to have_http_status(:created)
    expect(player.reload.food_meat).to eq(20)
  end

  it "returns 422 without enough currency" do
    player.update!(currency: 0)
    post "/api/food", params: { type: "meat", quantity: 20 }, headers: headers
    expect(response).to have_http_status(:unprocessable_entity)
  end
end
