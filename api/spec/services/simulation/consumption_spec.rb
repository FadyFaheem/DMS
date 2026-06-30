require "rails_helper"

RSpec.describe Simulation::Consumption do
  # Default scale: 60 real minutes == 1 game-day, so 5 real hours == 5 game-days.
  let(:player) do
    Player.create!(player_code: PlayerCode.generate, display_name: "K", food_plants: 1000, food_meat: 0, food_fish: 0)
  end
  let(:habitat) { player.habitats.create!(name: "Forest", terrain: "forest", capacity: 6) }

  def dino(**overrides)
    attrs = DinoFactory.attributes_for(Species.find("stegosaurus"), player:, habitat:) # herbivore -> food_plants
    player.dinosaurs.create!(attrs.merge(overrides))
  end

  it "draws size-based rations from the matching store and lowers hunger" do
    d = dino(size_lbs: 2000, hunger: 50)
    player.update!(last_consumed_at: 5.hours.ago)

    described_class.call(player, now: Time.current)

    expect(player.reload.food_plants).to eq(1000 - 5) # ration 1/day * 5 days
    expect(d.reload.hunger).to be < 50
    expect(d.last_diet_quality).to eq("preferred")
  end

  it "raises hunger and marks the diet wrong when the store is empty" do
    player.update!(food_plants: 0, last_consumed_at: 5.hours.ago)
    d = dino(size_lbs: 2000, hunger: 10)

    described_class.call(player, now: Time.current)

    expect(d.reload.hunger).to be > 10
    expect(d.last_diet_quality).to eq("wrong")
  end

  it "does nothing within the same game-day" do
    player.update!(last_consumed_at: Time.current)
    d = dino(hunger: 30)

    expect { described_class.call(player, now: Time.current) }.not_to(change { d.reload.hunger })
  end

  it "inflicts malnutrition after prolonged starvation" do
    player.update!(food_plants: 0, last_consumed_at: 5.hours.ago)
    d = dino(size_lbs: 2000)

    described_class.call(player, now: Time.current)

    expect(d.diseases.active.pluck(:kind)).to include("malnutrition")
  end

  it "clears malnutrition once the park can feed the dino again" do
    d = dino(size_lbs: 2000)
    d.diseases.create!(kind: "malnutrition", started_at: 1.hour.ago)
    player.update!(food_plants: 1000, last_consumed_at: 2.hours.ago)

    described_class.call(player, now: Time.current)

    expect(d.diseases.active.pluck(:kind)).not_to include("malnutrition")
  end

  it "burns extra plant food when a habitat is overpopulated" do
    crowded = player.habitats.create!(name: "Pen", terrain: "forest", capacity: 1)
    3.times { dino(size_lbs: 1000, habitat: crowded) } # two over capacity, ration 1 each
    player.update!(food_plants: 1000, last_consumed_at: 1.hour.ago)

    described_class.call(player, now: Time.current)

    extra = 2 * Simulation::Consumption::OVERPOP_PLANT_DRAIN_PER_DINO
    expect(player.reload.food_plants).to eq(1000 - 3 - extra)
  end
end
