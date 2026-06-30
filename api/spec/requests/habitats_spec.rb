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

  describe "POST /api/habitats/:id/upgrade" do
    let(:habitat) { player.habitats.create!(name: "Forest", terrain: "forest", capacity: 6) }

    it "raises level and capacity when habitat_expansion is unlocked" do
      player.researches.create!(tech_key: "habitat_expansion")

      post "/api/habitats/#{habitat.id}/upgrade", headers: headers

      expect(response).to have_http_status(:ok)
      expect(habitat.reload.level).to eq(2)
      expect(habitat.capacity).to eq(6 + Economy::HABITAT_CAPACITY_STEP)
      expect(player.reload.currency).to eq(10_000 - Economy.habitat_upgrade_cost(1))
    end

    it "refuses to upgrade without habitat_expansion" do
      post "/api/habitats/#{habitat.id}/upgrade", headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(habitat.reload.level).to eq(1)
    end

    it "requires a player code" do
      post "/api/habitats/#{habitat.id}/upgrade"
      expect(response).to have_http_status(:unauthorized)
    end
  end
end
