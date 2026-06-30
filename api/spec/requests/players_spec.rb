require "rails_helper"

RSpec.describe "Api::Players", type: :request do
  describe "POST /api/players" do
    it "creates a player and seeds a starter park" do
      expect { post "/api/players" }.to change(Player, :count).by(1)

      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body["player_code"]).to be_present
      expect(body["currency"]).to eq(10_000)
      expect(body["habitats"].size).to eq(1)
      expect(body["dinosaurs"].size).to eq(Species.starters.size)
    end
  end

  describe "GET /api/players/me" do
    it "returns the player for a valid code" do
      post "/api/players"
      code = JSON.parse(response.body)["player_code"]

      get "/api/players/me", headers: { "Authorization" => "Bearer #{code}" }

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["player_code"]).to eq(code)
      expect(body["summary"]["population"]).to eq(Species.starters.size)
    end

    it "includes goals and prestige state in the payload" do
      post "/api/players"
      code = JSON.parse(response.body)["player_code"]

      get "/api/players/me", headers: { "Authorization" => "Bearer #{code}" }

      body = JSON.parse(response.body)
      expect(body["goals"]["total"]).to eq(GoalCatalog.all.size)
      expect(body["goals"]["catalog"]).to be_an(Array)
      expect(body["prestige"]).to include("level" => 0, "won" => false)
    end

    it "401s without a valid code" do
      get "/api/players/me"
      expect(response).to have_http_status(:unauthorized)

      get "/api/players/me", headers: { "Authorization" => "Bearer NOPE" }
      expect(response).to have_http_status(:unauthorized)
    end
  end
end
