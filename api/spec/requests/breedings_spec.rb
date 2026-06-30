require "rails_helper"

RSpec.describe "Api::Breedings", type: :request do
  let(:player) { Player.create!(player_code: PlayerCode.generate, display_name: "K", currency: 5_000) }
  let(:habitat) { player.habitats.create!(name: "Plains", terrain: "grassland", capacity: 8) }
  let(:headers) { { "Authorization" => "Bearer #{player.player_code}" } }

  def parent(gender)
    player.dinosaurs.create!(
      DinoFactory.attributes_for(Species.find("triceratops"), player:, habitat:).merge(gender:, health: 90)
    )
  end

  let(:mom) { parent("female") }
  let(:dad) { parent("male") }

  describe "POST /api/breedings" do
    it "starts a breeding and charges currency" do
      expect do
        post "/api/breedings", params: { parent_a_id: dad.id, parent_b_id: mom.id }, headers: headers
      end.to change(Breeding, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(player.reload.currency).to eq(5_000 - Economy::BREEDING_COST)
    end

    it "returns 422 for an incompatible (same-gender) pair" do
      post "/api/breedings", params: { parent_a_id: dad.id, parent_b_id: parent("male").id }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 422 without enough currency" do
      player.update!(currency: 0)
      post "/api/breedings", params: { parent_a_id: dad.id, parent_b_id: mom.id }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "rejects a requested trait without the genetic engineering lab" do
      post "/api/breedings",
           params: { parent_a_id: dad.id, parent_b_id: mom.id, requested_trait: "giant" }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)["error"]).to match(/genetic_engineering_lab/)
    end

    it "stores a requested trait once the lab is researched" do
      player.researches.create!(tech_key: "genetic_engineering_lab")
      post "/api/breedings",
           params: { parent_a_id: dad.id, parent_b_id: mom.id, requested_trait: "giant" }, headers: headers

      expect(response).to have_http_status(:created)
      expect(Breeding.last.requested_trait).to eq("giant")
    end

    it "incubates faster when a hatchery is built" do
      player.structures.create!(kind: "hatchery")

      post "/api/breedings", params: { parent_a_id: dad.id, parent_b_id: mom.id }, headers: headers

      expect(response).to have_http_status(:created)
      hatches_at = Time.zone.parse(JSON.parse(response.body)["hatches_at"])
      expect(hatches_at).to be_within(5.minutes).of(Time.current + GameClock.real_seconds_for_game_days(1))
    end
  end

  describe "GET /api/breedings/preview" do
    it "returns a probabilistic offspring preview" do
      get "/api/breedings/preview", params: { parent_a_id: dad.id, parent_b_id: mom.id }, headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["compatible"]).to be(true)
      expect(body["cost"]).to eq(Economy::BREEDING_COST)
      expect(body["species_options"].first["key"]).to eq("triceratops")
      expect(body["genetics_quality"]).to include("min", "expected", "max")
    end

    it "requires a player code" do
      get "/api/breedings/preview", params: { parent_a_id: dad.id, parent_b_id: mom.id }
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "POST /api/breedings/:id/claim" do
    it "hatches a ready breeding into a new dino" do
      breeding = player.breedings.create!(parent_a: dad, parent_b: mom, hatches_at: 1.hour.ago, status: "incubating")

      expect do
        post "/api/breedings/#{breeding.id}/claim", headers: headers
      end.to change(Dinosaur, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(breeding.reload.status).to eq("claimed")
    end

    it "returns 422 while still incubating" do
      breeding = player.breedings.create!(parent_a: dad, parent_b: mom, hatches_at: 1.hour.from_now, status: "incubating")
      post "/api/breedings/#{breeding.id}/claim", headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end
end
