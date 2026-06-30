require "rails_helper"

RSpec.describe "Api::Structures", type: :request do
  let(:player) { Player.create!(player_code: PlayerCode.generate, display_name: "K", currency: 20_000) }
  let(:headers) { { "Authorization" => "Bearer #{player.player_code}" } }

  describe "POST /api/structures" do
    it "builds a vet lab when veterinary is researched and charges currency" do
      player.researches.create!(tech_key: "veterinary")

      expect do
        post "/api/structures", params: { kind: "vet_lab" }, headers: headers
      end.to change(player.structures, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(player.reload.currency).to eq(20_000 - StructureCatalog.find("vet_lab").cost)
    end

    it "refuses to build without the required research" do
      post "/api/structures", params: { kind: "vet_lab" }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
      expect(player.structures.count).to eq(0)
    end

    it "refuses to build the same structure twice" do
      player.researches.create!(tech_key: "veterinary")
      player.structures.create!(kind: "vet_lab")

      post "/api/structures", params: { kind: "vet_lab" }, headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "requires a player code" do
      post "/api/structures", params: { kind: "vet_lab" }
      expect(response).to have_http_status(:unauthorized)
    end
  end
end
