require "rails_helper"

RSpec.describe "Api::Dinosaurs", type: :request do
  let(:player) { Player.create!(player_code: PlayerCode.generate, display_name: "K", food_plants: 100) }
  let(:habitat) { player.habitats.create!(name: "Forest", terrain: "forest", capacity: 6) }
  let(:grassland) { player.habitats.create!(name: "Plains", terrain: "grassland", capacity: 8) }
  let(:dino) do
    player.dinosaurs.create!(
      DinoFactory.attributes_for(Species.find("stegosaurus"), player:, habitat:).merge(hunger: 80)
    )
  end
  let(:headers) { { "Authorization" => "Bearer #{player.player_code}" } }

  it "feeds a dino" do
    post "/api/dinosaurs/#{dino.id}/feed", params: { diet: "plants" }, headers: headers

    expect(response).to have_http_status(:ok)
    dino.reload
    expect(dino.last_diet_quality).to eq("preferred")
    expect(dino.hunger).to eq(0)
  end

  it "returns 422 when feeding with no food in store" do
    player.update!(food_plants: 0)
    post "/api/dinosaurs/#{dino.id}/feed", params: { diet: "plants" }, headers: headers
    expect(response).to have_http_status(:unprocessable_entity)
  end

  it "moves a dino to another habitat" do
    post "/api/dinosaurs/#{dino.id}/move", params: { habitat_id: grassland.id }, headers: headers

    expect(response).to have_http_status(:ok)
    expect(dino.reload.habitat_id).to eq(grassland.id)
  end

  it "requires a valid player code" do
    post "/api/dinosaurs/#{dino.id}/feed", params: { diet: "plants" }
    expect(response).to have_http_status(:unauthorized)
  end
end
