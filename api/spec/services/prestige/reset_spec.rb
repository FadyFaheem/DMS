require "rails_helper"

RSpec.describe Prestige::Reset do
  let(:player) do
    Player.create!(player_code: PlayerCode.generate, display_name: "K", currency: 99_999, won: true, prestige_level: 0)
  end
  let(:habitat) { player.habitats.create!(name: "Plains", terrain: "grassland", capacity: 8) }

  before do
    3.times { player.dinosaurs.create!(DinoFactory.attributes_for(Species.find("triceratops"), player:, habitat:)) }
    player.researches.create!(tech_key: "veterinary")
    player.structures.create!(kind: "vet_lab")
    player.species_unlocks.create!(species_key: "ankylosaurus")
  end

  it "wipes the park, increments prestige, and re-seeds a starter park" do
    expect { described_class.call(player) }.to change { player.reload.prestige_level }.by(1)

    expect(player.won).to be(false)
    expect(player.currency).to eq(Prestige::Reset::STARTING_CURRENCY)
    expect(player.researches.count).to eq(0)
    expect(player.structures.count).to eq(0)
    expect(player.species_unlocks.count).to eq(0)
    expect(player.habitats.count).to eq(1)
    expect(player.dinosaurs.alive.count).to eq(Species.starters.size)
  end

  it "keeps a permanent income bonus after prestiging" do
    expect { described_class.call(player) }.to change { player.reload.income_multiplier }.from(1.0).to(be > 1.0)
  end

  it "refuses to prestige before the win condition is met" do
    player.update!(won: false)
    expect { described_class.call(player) }.to raise_error(Prestige::Reset::Error)
  end
end
