require "rails_helper"

RSpec.describe Simulation::FoodCollection do
  # Default scale: 60 real minutes == 1 game-day, so 10 real hours == 10 game-days.
  let(:player) { Player.create!(player_code: PlayerCode.generate, display_name: "K", food_plants: 0, food_meat: 0, food_fish: 0) }

  it "accrues output per game-day into the matching food store" do
    player.food_productions.create!(kind: "plant_farm", level: 1, last_collected_at: 10.hours.ago)

    described_class.call(player, now: Time.current)

    expect(player.reload.food_plants).to eq(10 * FoodProductionCatalog.find("plant_farm").base_output_per_day)
  end

  it "scales output with the building level" do
    player.food_productions.create!(kind: "plant_farm", level: 3, last_collected_at: 5.hours.ago)

    described_class.call(player, now: Time.current)

    expect(player.reload.food_plants).to eq(5 * 3 * 50)
  end

  it "routes each building kind to its own food store" do
    player.food_productions.create!(kind: "hunting_ground", last_collected_at: 4.hours.ago)
    player.food_productions.create!(kind: "fishing_pond", last_collected_at: 4.hours.ago)

    described_class.call(player, now: Time.current)

    player.reload
    expect(player.food_meat).to eq(4 * 40)
    expect(player.food_fish).to eq(4 * 35)
    expect(player.food_plants).to eq(0)
  end

  it "accrues nothing within the same game-day and keeps the remainder" do
    building = player.food_productions.create!(kind: "plant_farm", last_collected_at: 30.minutes.ago)
    collected_before = building.last_collected_at

    described_class.call(player, now: Time.current)

    expect(player.reload.food_plants).to eq(0)
    expect(building.reload.last_collected_at).to be_within(1.second).of(collected_before)
  end

  describe "production events" do
    it "reduces a farm's output by an active effect's multiplier" do
      building = player.food_productions.create!(kind: "plant_farm", last_collected_at: 2.hours.ago)
      player.active_effects.create!(kind: "pest", multiplier: 0.5, food_production: building, expires_at: 1.hour.from_now)

      described_class.call(player, now: Time.current)

      expect(player.reload.food_plants).to eq((2 * 50 * 0.5).to_i)
    end

    it "ignores effects that have expired" do
      building = player.food_productions.create!(kind: "plant_farm", last_collected_at: 2.hours.ago)
      player.active_effects.create!(kind: "pest", multiplier: 0.5, food_production: building, expires_at: 1.hour.ago)

      described_class.call(player, now: Time.current)

      expect(player.reload.food_plants).to eq(2 * 50)
    end
  end

  describe "prey pools" do
    it "depletes the prey pool as a hunting ground produces" do
      building = player.food_productions.create!(
        kind: "hunting_ground", level: 3, prey_capacity: 240, prey_population: 240, last_collected_at: 3.hours.ago
      )

      described_class.call(player, now: Time.current)

      expect(building.reload.prey_population).to be < 240
      expect(player.reload.food_meat).to be > 0
    end

    it "regrows a depleted pool over game-days" do
      building = player.food_productions.create!(
        kind: "hunting_ground", level: 1, prey_capacity: 240, prey_population: 0, last_collected_at: 4.hours.ago
      )

      described_class.call(player, now: Time.current)

      expect(building.reload.prey_population).to be > 0
    end

    it "crashes output to zero when the pool is empty (overhunting)" do
      player.food_productions.create!(
        kind: "hunting_ground", level: 5, prey_capacity: 240, prey_population: 0, last_collected_at: 1.hour.ago
      )

      described_class.call(player, now: Time.current)

      expect(player.reload.food_meat).to eq(0)
    end

    it "stacks an algal bloom on top of prey limits for fishing ponds" do
      building = player.food_productions.create!(
        kind: "fishing_pond", level: 1, prey_capacity: 210, prey_population: 210, last_collected_at: 2.hours.ago
      )
      player.active_effects.create!(kind: "algae", multiplier: 0.4, food_production: building, expires_at: 1.hour.from_now)

      described_class.call(player, now: Time.current)

      # 2 game-days * 35 caught, then halved-ish by the 0.4 bloom multiplier.
      expect(player.reload.food_fish).to eq((2 * 35 * 0.4).to_i)
    end
  end
end
