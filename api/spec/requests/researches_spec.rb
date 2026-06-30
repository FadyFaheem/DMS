require "rails_helper"

RSpec.describe "Api::Researches", type: :request do
  let(:player) { Player.create!(player_code: PlayerCode.generate, display_name: "K", currency: 10_000) }
  let(:headers) { { "Authorization" => "Bearer #{player.player_code}" } }

  describe "GET /api/researches" do
    it "returns the catalog with unlocked flags" do
      player.researches.create!(tech_key: "plant_farming")
      get "/api/researches", headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["unlocked"]).to include("plant_farming")
      plant = body["catalog"].find { |t| t["key"] == "plant_farming" }
      expect(plant["unlocked"]).to be(true)
    end

    it "requires a player code" do
      get "/api/researches"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "POST /api/researches" do
    it "unlocks a tech and charges currency" do
      expect do
        post "/api/researches", params: { tech_key: "plant_farming" }, headers: headers
      end.to change(player.researches, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(player.reload.currency).to eq(10_000 - ResearchCatalog.find("plant_farming").cost)
    end

    it "rejects an unknown tech" do
      post "/api/researches", params: { tech_key: "warp_drive" }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "rejects a tech whose prerequisites are missing" do
      post "/api/researches", params: { tech_key: "advanced_farming" }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
      expect(player.researches.count).to eq(0)
    end

    it "enforces the population milestone" do
      post "/api/researches", params: { tech_key: "habitat_expansion" }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)["error"]).to match(/living dinosaurs/)
    end

    it "rejects when the player cannot afford it" do
      player.update!(currency: 0)
      post "/api/researches", params: { tech_key: "plant_farming" }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end
end
