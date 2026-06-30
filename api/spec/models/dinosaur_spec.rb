require "rails_helper"

RSpec.describe Dinosaur, type: :model do
  let(:player) { Player.create!(player_code: PlayerCode.generate, display_name: "K") }

  def build_dino(**overrides)
    attrs = DinoFactory.attributes_for(Species.find("triceratops"), player:, habitat: nil)
    Dinosaur.new(attrs.merge(overrides))
  end

  it "is valid from the factory" do
    expect(build_dino).to be_valid
  end

  it "validates gender and diet" do
    expect(build_dino(gender: "other")).not_to be_valid
    expect(build_dino(diet_primary: "rocks")).not_to be_valid
  end

  it "rejects out-of-range stats" do
    expect(build_dino(health: 120)).not_to be_valid
    expect(build_dino(hunger: -1)).not_to be_valid
  end

  describe "#status" do
    it "maps health to the spec's bands" do
      expect(build_dino(health: 90).status).to eq("Thriving")
      expect(build_dino(health: 60).status).to eq("Stable")
      expect(build_dino(health: 40).status).to eq("Struggling")
      expect(build_dino(health: 10).status).to eq("Critical")
      expect(build_dino(alive: false).status).to eq("Dead")
    end
  end

  describe "#breeding_ready?" do
    it "needs alive, health >= 60, and readiness >= 100" do
      expect(build_dino(health: 80, reproduction_readiness: 100)).to be_breeding_ready
      expect(build_dino(health: 50, reproduction_readiness: 100)).not_to be_breeding_ready
      expect(build_dino(health: 80, reproduction_readiness: 90)).not_to be_breeding_ready
      expect(build_dino(health: 80, reproduction_readiness: 100, alive: false)).not_to be_breeding_ready
    end
  end
end
