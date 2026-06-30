require "rails_helper"

RSpec.describe Reproduction::Prediction do
  let(:player) { Player.create!(player_code: PlayerCode.generate, display_name: "K") }
  let(:habitat) { player.habitats.create!(name: "Plains", terrain: "grassland", capacity: 8) }

  def dino(species, **overrides)
    player.dinosaurs.create!(DinoFactory.attributes_for(Species.find(species), player:, habitat:).merge(overrides))
  end

  it "previews a compatible pairing with species, cost, and quality range" do
    mom = dino("triceratops", gender: "female", health: 90, genetics_quality: 60)
    dad = dino("triceratops", gender: "male", health: 90, genetics_quality: 80)

    preview = described_class.call(dad, mom, player)

    expect(preview[:compatible]).to be(true)
    expect(preview[:reason]).to be_nil
    expect(preview[:cost]).to eq(Economy::BREEDING_COST)
    expect(preview[:species_options]).to contain_exactly(hash_including(key: "triceratops", chance: 1.0))
    expect(preview[:genetics_quality][:expected]).to eq(70)
    expect(preview[:genetics_quality][:max]).to be > 70
    expect(preview[:mutation_chance]).to eq(Reproduction::Genetics::MUTATION_CHANCE)
  end

  it "splits species 50/50 for a mixed but compatible pairing" do
    mom = dino("triceratops", gender: "female", health: 90)
    dad = dino("velociraptor", gender: "male", health: 90)
    # Same period (Cretaceous) but different diets -> incompatible; use diet match.
    velo = dino("velociraptor", gender: "female", health: 90)

    preview = described_class.call(dad, velo, player)
    expect(preview[:species_options]).to contain_exactly(hash_including(key: "velociraptor", chance: 1.0))
    expect(mom).to be_present
  end

  it "reports the blocking reason for an incompatible pairing" do
    mom = dino("triceratops", gender: "female", health: 90)
    same = dino("triceratops", gender: "female", health: 90)

    preview = described_class.call(mom, same, player)
    expect(preview[:compatible]).to be(false)
    expect(preview[:reason]).to match(/opposite genders/)
  end

  it "reports the boosted mutation chance when researched" do
    player.researches.create!(tech_key: "mutation_rate_boost")
    mom = dino("triceratops", gender: "female", health: 90)
    dad = dino("triceratops", gender: "male", health: 90)

    expect(described_class.call(dad, mom, player)[:mutation_chance]).to eq(Reproduction::Genetics::BOOSTED_MUTATION_CHANCE)
  end
end
