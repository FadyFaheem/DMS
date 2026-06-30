require "rails_helper"

RSpec.describe Simulation::DinoTick do
  let(:player) { Player.create!(player_code: PlayerCode.generate, display_name: "K") }
  let(:habitat) { player.habitats.create!(name: "Forest", terrain: "forest", capacity: 6) }

  # Default scale: 60 real minutes per game day => 1 real hour == 1 game day.
  def dino(**overrides)
    attrs = DinoFactory.attributes_for(Species.find("stegosaurus"), player:, habitat:)
    player.dinosaurs.create!(attrs.merge(overrides))
  end

  it "does nothing when no game time has elapsed" do
    d = dino(stats_updated_at: Time.current, hunger: 10)
    expect { described_class.call(d, now: Time.current) }.not_to(change { d.reload.hunger })
  end

  it "leaves hunger to the consumption pass" do
    d = dino(stats_updated_at: 10.hours.ago, hunger: 30)
    described_class.call(d, now: Time.current)
    expect(d.reload.hunger).to eq(30)
  end

  it "kills a long-neglected, starving dino" do
    d = dino(stats_updated_at: 400.hours.ago, hunger: 100, health: 30, last_diet_quality: "wrong")
    described_class.call(d, now: Time.current)
    expect(d.reload.alive).to be(false)
    expect(d.health).to eq(0)
  end

  it "logs a death event when a dino dies" do
    d = dino(stats_updated_at: 400.hours.ago, hunger: 100, health: 30, last_diet_quality: "wrong")
    expect { described_class.call(d, now: Time.current) }
      .to change { player.events.where(kind: "death").count }.by(1)
  end

  it "contracts scale rot in a crowded wetland and loses health to it" do
    wetland = player.habitats.create!(name: "Bog", terrain: "wetland", capacity: 1)
    sick = player.dinosaurs.create!(
      DinoFactory.attributes_for(Species.find("parasaurolophus"), player:, habitat: wetland)
        .merge(stats_updated_at: 5.hours.ago, hunger: 10, last_diet_quality: "preferred", health: 90)
    )

    described_class.call(sick, now: Time.current)

    expect(sick.diseases.active.pluck(:kind)).to include("scale_rot")
    expect(sick.reload.health).to be < 90
  end

  it "does not infect a quarantined dino" do
    wetland = player.habitats.create!(name: "Bog", terrain: "wetland", capacity: 1)
    safe = player.dinosaurs.create!(
      DinoFactory.attributes_for(Species.find("parasaurolophus"), player:, habitat: wetland)
        .merge(stats_updated_at: 5.hours.ago, quarantined: true)
    )

    described_class.call(safe, now: Time.current)

    expect(safe.diseases.active).to be_empty
  end

  it "advances the stats_updated_at watermark" do
    now = Time.current
    d = dino(stats_updated_at: 5.hours.ago)
    described_class.call(d, now:)
    expect(d.reload.stats_updated_at).to be_within(1.second).of(now)
  end
end
