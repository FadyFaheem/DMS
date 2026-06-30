require "rails_helper"

RSpec.describe Habitat, type: :model do
  let(:player) { Player.create!(player_code: PlayerCode.generate, display_name: "K") }
  subject(:habitat) { player.habitats.new(name: "Forest", terrain: "forest", capacity: 2) }

  it "is valid" do
    expect(habitat).to be_valid
  end

  it "requires name and terrain" do
    habitat.name = nil
    expect(habitat).not_to be_valid
  end

  it "requires a positive capacity" do
    habitat.capacity = 0
    expect(habitat).not_to be_valid
  end

  describe "capacity helpers" do
    it "tracks living count, capacity, and overcrowding" do
      habitat.save!
      expect(habitat).not_to be_at_capacity

      2.times { add_dino }
      expect(habitat.reload).to be_at_capacity
      expect(habitat).not_to be_overcrowded

      add_dino
      expect(habitat.reload).to be_overcrowded
    end
  end

  def add_dino
    player.dinosaurs.create!(
      DinoFactory.attributes_for(Species.find("triceratops"), player:, habitat:)
    )
  end
end
