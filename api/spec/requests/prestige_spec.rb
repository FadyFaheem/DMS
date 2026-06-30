require "rails_helper"

RSpec.describe "Api::Prestige", type: :request do
  let(:player) { Player.create!(player_code: PlayerCode.generate, display_name: "K", won: true) }
  let(:headers) { { "Authorization" => "Bearer #{player.player_code}" } }

  before { player.habitats.create!(name: "Plains", terrain: "grassland", capacity: 8) }

  describe "POST /api/prestige" do
    it "prestiges a won park and returns the reset player" do
      post "/api/prestige", headers: headers

      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body["prestige"]["level"]).to eq(1)
      expect(body["prestige"]["multiplier"]).to be > 1.0
      expect(player.reload.won).to be(false)
    end

    it "returns 422 when the win condition is not met" do
      player.update!(won: false)
      post "/api/prestige", headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "requires a player code" do
      post "/api/prestige"
      expect(response).to have_http_status(:unauthorized)
    end
  end
end
