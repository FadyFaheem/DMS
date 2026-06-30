require "rails_helper"

RSpec.describe Feeding do
  let(:player) { Player.create!(player_code: PlayerCode.generate, display_name: "K", food_plants: 100, food_meat: 100) }
  let(:habitat) { player.habitats.create!(name: "Forest", terrain: "forest", capacity: 6) }
  let(:dino) do
    player.dinosaurs.create!(
      DinoFactory.attributes_for(Species.find("stegosaurus"), player:, habitat:).merge(hunger: 90)
    )
  end

  it "resets hunger, marks the preferred diet, and consumes food" do
    Feeding.call(dino, diet: "plants")

    dino.reload
    expect(dino.hunger).to eq(0)
    expect(dino.last_diet_quality).to eq("preferred")
    expect(player.reload.food_plants).to eq(100 - Feeding::UNITS_PER_FEED)
  end

  it "marks acceptable for a secondary diet" do
    tri = player.dinosaurs.create!(DinoFactory.attributes_for(Species.find("triceratops"), player:, habitat:))
    Feeding.call(tri, diet: "insects") # triceratops secondary diet
    expect(tri.reload.last_diet_quality).to eq("acceptable")
  end

  it "marks a wrong diet when fed incorrect food" do
    Feeding.call(dino, diet: "meat")
    expect(dino.reload.last_diet_quality).to eq("wrong")
  end

  it "raises when there isn't enough food" do
    player.update!(food_plants: 0)
    expect { Feeding.call(dino, diet: "plants") }.to raise_error(Feeding::InsufficientFood)
  end

  it "rejects unknown food types" do
    expect { Feeding.call(dino, diet: "rocks") }.to raise_error(ArgumentError)
  end
end
