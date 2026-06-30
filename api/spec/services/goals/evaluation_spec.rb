require "rails_helper"

RSpec.describe Goals::Evaluation do
  let(:player) { Player.create!(player_code: PlayerCode.generate, display_name: "K", currency: 0) }
  let(:habitat) { player.habitats.create!(name: "Plains", terrain: "grassland", capacity: 50) }

  def add_dino(**overrides)
    player.dinosaurs.create!(
      DinoFactory.attributes_for(Species.find("triceratops"), player:, habitat:).merge(overrides)
    )
  end

  def keys
    player.goal_completions.pluck(:goal_key)
  end

  it "completes the population goal and grants exactly its reward" do
    10.times { add_dino(health: 40) } # health below 90 so the health goal stays unmet

    described_class.call(player)

    expect(keys).to include("growing_park")
    expect(player.reload.currency).to eq(GoalCatalog.find("growing_park").reward)
  end

  it "completes the average-health goal for a healthy park" do
    GoalCatalog::THRIVING_MIN_POPULATION.times { add_dino(health: 95) }
    described_class.call(player)
    expect(keys).to include("thriving_park")
  end

  it "does not complete the health goal below the minimum population" do
    add_dino(health: 100)
    described_class.call(player)
    expect(keys).not_to include("thriving_park")
  end

  it "completes self-sustaining after fed-free game-days" do
    player.update_column(:created_at, 8.hours.ago) # 8 game-days at the default scale
    3.times { add_dino(health: 80, last_fed_at: nil) }

    described_class.call(player)

    expect(keys).to include("self_sustaining")
  end

  it "does not count as self-sustaining if a dino was recently hand-fed" do
    player.update_column(:created_at, 8.hours.ago)
    3.times { add_dino(health: 80) }
    player.dinosaurs.first.update!(last_fed_at: Time.current)

    described_class.call(player)

    expect(keys).not_to include("self_sustaining")
  end

  it "completes perfect genes for a bred 95+ IV dino" do
    add_dino(generation: 2, genetics_quality: GoalCatalog::PERFECT_IV + 1)
    described_class.call(player)
    expect(keys).to include("perfect_genes")
  end

  it "completes master breeder when every species is unlocked" do
    Species.all.reject(&:starter).each { |s| player.species_unlocks.create!(species_key: s.key) }
    described_class.call(player)
    expect(keys).to include("master_breeder")
  end

  it "sets the win flag when the legendary-park goal is reached" do
    Species.all.reject(&:starter).each { |s| player.species_unlocks.create!(species_key: s.key) }
    15.times { add_dino(health: 85) }

    described_class.call(player)

    expect(keys).to include("park_legend")
    expect(player.reload.won).to be(true)
  end

  it "grants each reward only once across repeated reads" do
    10.times { add_dino(health: 40) }
    described_class.call(player)

    expect { described_class.call(player) }.not_to(change { player.reload.currency })
    expect(player.goal_completions.where(goal_key: "growing_park").count).to eq(1)
  end

  it "reports live progress without granting via snapshot" do
    5.times { add_dino(health: 40) }
    snapshot = described_class.snapshot(player)

    growing = snapshot.find { |g| g[:key] == "growing_park" }
    expect(growing[:current]).to eq(5)
    expect(growing[:threshold]).to eq(10)
    expect(growing[:completed]).to be(false)
    expect(player.goal_completions).to be_empty
  end
end
