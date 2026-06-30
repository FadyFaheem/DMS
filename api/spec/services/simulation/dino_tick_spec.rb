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

  it "increases hunger as game-days pass" do
    d = dino(stats_updated_at: 10.hours.ago, hunger: 0)
    described_class.call(d, now: Time.current)
    expect(d.reload.hunger).to be > 0
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

  it "advances the stats_updated_at watermark" do
    now = Time.current
    d = dino(stats_updated_at: 5.hours.ago)
    described_class.call(d, now:)
    expect(d.reload.stats_updated_at).to be_within(1.second).of(now)
  end
end
