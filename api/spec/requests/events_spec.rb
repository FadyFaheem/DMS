require "rails_helper"

RSpec.describe "Park events", type: :request do
  let(:player) { Player.create!(player_code: PlayerCode.generate, display_name: "K", currency: 20_000) }
  let(:headers) { { "Authorization" => "Bearer #{player.player_code}" } }

  it "records research and build actions in the player's event feed" do
    post "/api/researches", params: { tech_key: "plant_farming" }, headers: headers
    post "/api/food_productions", params: { kind: "plant_farm" }, headers: headers

    get "/api/players/me", headers: headers
    expect(response).to have_http_status(:ok)

    kinds = JSON.parse(response.body)["events"].map { |e| e["kind"] }
    expect(kinds).to include("research", "build")
  end
end
