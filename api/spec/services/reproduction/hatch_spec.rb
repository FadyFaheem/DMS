require "rails_helper"

RSpec.describe Reproduction::Hatch do
  let(:player) { Player.create!(player_code: PlayerCode.generate, display_name: "K") }
  let(:habitat) { player.habitats.create!(name: "Plains", terrain: "grassland", capacity: 8) }

  def parent(gender)
    player.dinosaurs.create!(
      DinoFactory.attributes_for(Species.find("triceratops"), player:, habitat:).merge(gender:, generation: 1, size_lbs: 1000)
    )
  end

  let(:mom) { parent("female") }
  let(:dad) { parent("male") }
  let(:breeding) { player.breedings.create!(parent_a: dad, parent_b: mom, hatches_at: 1.hour.ago, status: "incubating") }

  it "creates a linked offspring and claims the breeding" do
    offspring = described_class.call(breeding, rng: Random.new(7))

    expect(offspring).to be_persisted
    expect(offspring.parent_a_id).to eq(dad.id)
    expect(offspring.parent_b_id).to eq(mom.id)
    expect(offspring.generation).to eq(2)
    expect(offspring.health).to eq(100)
    expect(Dinosaur::DIETS).to include(offspring.diet_primary)

    breeding.reload
    expect(breeding.status).to eq("claimed")
    expect(breeding.offspring_id).to eq(offspring.id)
  end

  it "logs a birth event for the player" do
    expect { described_class.call(breeding, rng: Random.new(7)) }
      .to change { player.events.where(kind: "birth").count }.by(1)
  end

  it "applies a giant mutation to the offspring size" do
    allow(Reproduction::Genetics).to receive(:roll_mutations).and_return([ "giant" ])

    offspring = described_class.call(breeding, rng: Random.new(7))

    expect(offspring.mutation_traits).to eq([ "giant" ])
    expect(offspring.size_lbs).to eq((1000 * 1.2).round) # both parents are 1000 lbs -> avg 1000
  end
end
