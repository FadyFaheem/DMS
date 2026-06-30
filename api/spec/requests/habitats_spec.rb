require "rails_helper"

RSpec.describe "Api::Habitats", type: :request do
  let(:player) { Player.create!(player_code: PlayerCode.generate, display_name: "K", currency: 10_000) }
  let(:headers) { { "Authorization" => "Bearer #{player.player_code}" } }

  describe "POST /api/habitats" do
    it "builds a habitat and charges currency" do
      expect do
        post "/api/habitats", params: { terrain: "grassland", name: "Open Plains" }, headers: headers
      end.to change(player.habitats, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(player.reload.currency).to eq(10_000 - Economy.habitat_cost("grassland"))
    end

    it "rejects an unknown terrain" do
      post "/api/habitats", params: { terrain: "moon" }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 422 without enough currency" do
      player.update!(currency: 0)
      post "/api/habitats", params: { terrain: "forest" }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "GET /api/habitats" do
    it "lists the player's habitats" do
      player.habitats.create!(name: "Forest", terrain: "forest", capacity: 6)
      get "/api/habitats", headers: headers
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body).size).to eq(1)
    end
  end
end
