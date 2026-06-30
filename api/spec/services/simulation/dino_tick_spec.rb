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

  it "thrives in its climate but suffers when a habitat runs too hot for its range" do
    forest = player.habitats.create!(name: "Glade", terrain: "forest", capacity: 6)
    volcano = player.habitats.create!(name: "Rim", terrain: "volcanic", capacity: 6)
    attrs = DinoFactory.attributes_for(Species.find("coelophysis"), player:, habitat: forest)
                       .merge(stats_updated_at: 5.hours.ago, hunger: 0, last_diet_quality: "preferred", health: 80)
    comfy = player.dinosaurs.create!(attrs)
    hot = player.dinosaurs.create!(attrs.merge(habitat: volcano))

    described_class.call(comfy, now: Time.current)
    described_class.call(hot, now: Time.current)

    expect(comfy.reload.health).to be > 80
    expect(hot.reload.health).to be < comfy.health
  end

  it "rewards a heat-tolerant dino with extra happiness in a volcanic habitat" do
    volcano = player.habitats.create!(name: "Rim", terrain: "volcanic", capacity: 6)
    attrs = DinoFactory.attributes_for(Species.find("coelophysis"), player:, habitat: volcano)
                       .merge(stats_updated_at: 5.hours.ago, hunger: 0)
    heat_lover = player.dinosaurs.create!(attrs.merge(temperature_max: 40))
    heat_wimp = player.dinosaurs.create!(attrs.merge(temperature_max: 20))

    described_class.call(heat_lover, now: Time.current)
    described_class.call(heat_wimp, now: Time.current)

    expect(heat_lover.reload.happiness).to be > heat_wimp.reload.happiness
  end

  it "unsettles a grassland herbivore that shares its range with a carnivore" do
    calm_field = player.habitats.create!(name: "Calm", terrain: "grassland", capacity: 8)
    risky_field = player.habitats.create!(name: "Risky", terrain: "grassland", capacity: 8)
    calm = player.dinosaurs.create!(
      DinoFactory.attributes_for(Species.find("triceratops"), player:, habitat: calm_field).merge(stats_updated_at: 5.hours.ago)
    )
    player.dinosaurs.create!(DinoFactory.attributes_for(Species.find("triceratops"), player:, habitat: calm_field))
    risky = player.dinosaurs.create!(
      DinoFactory.attributes_for(Species.find("triceratops"), player:, habitat: risky_field).merge(stats_updated_at: 5.hours.ago)
    )
    player.dinosaurs.create!(DinoFactory.attributes_for(Species.find("velociraptor"), player:, habitat: risky_field))

    described_class.call(calm, now: Time.current)
    described_class.call(risky, now: Time.current)

    expect(risky.reload.happiness).to be < calm.reload.happiness
  end

  it "scales resident happiness down under an active habitat-scoped effect" do
    d = dino(stats_updated_at: 5.hours.ago)
    described_class.call(d, now: Time.current)
    baseline = d.reload.happiness

    player.active_effects.create!(kind: "heat_spike", multiplier: 0.5, habitat: habitat, expires_at: 1.hour.from_now)
    d.update!(stats_updated_at: 5.hours.ago)
    described_class.call(d, now: Time.current)

    expect(d.reload.happiness).to be_within(0.1).of(baseline * 0.5)
  end

  it "advances the stats_updated_at watermark" do
    now = Time.current
    d = dino(stats_updated_at: 5.hours.ago)
    described_class.call(d, now:)
    expect(d.reload.stats_updated_at).to be_within(1.second).of(now)
  end
end
