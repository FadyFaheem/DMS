require "rails_helper"

# Predator-prey coupling (Phase 3B): carnivores are fed from hunting-ground /
# fishing-pond output, which is gated by each farm's prey pool. An empty pool
# produces no meat, so meat-eaters go unfed and starve through the normal
# Consumption path. Default scale: 60 real minutes == 1 game-day.
RSpec.describe "Simulation predator-prey coupling" do
  let(:player) do
    Player.create!(player_code: PlayerCode.generate, display_name: "K", food_plants: 0, food_meat: 0, food_fish: 0)
  end
  let(:habitat) { player.habitats.create!(name: "Plains", terrain: "grassland", capacity: 6) }

  def carnivore(**overrides)
    attrs = DinoFactory.attributes_for(Species.find("velociraptor"), player:, habitat:) # diet meat
    player.dinosaurs.create!(attrs.merge(overrides))
  end

  it "starves carnivores when the hunting ground's prey pool is empty" do
    player.food_productions.create!(
      kind: "hunting_ground", level: 2, prey_capacity: 240, prey_population: 0, last_collected_at: 1.hour.ago
    )
    raptor = carnivore(hunger: 10, last_diet_quality: "preferred")
    player.update!(last_consumed_at: 1.hour.ago)

    Simulation::FoodCollection.call(player, now: Time.current)
    expect(player.reload.food_meat).to eq(0)

    Simulation::Consumption.call(player, now: Time.current)
    expect(raptor.reload.last_diet_quality).to eq("wrong")
    expect(raptor.hunger).to be > 10
  end

  it "feeds carnivores when the prey pool is stocked" do
    player.food_productions.create!(
      kind: "hunting_ground", level: 2, prey_capacity: 240, prey_population: 240, last_collected_at: 1.hour.ago
    )
    raptor = carnivore(hunger: 40)
    player.update!(last_consumed_at: 1.hour.ago)

    Simulation::FoodCollection.call(player, now: Time.current)
    expect(player.reload.food_meat).to be > 0

    Simulation::Consumption.call(player, now: Time.current)
    expect(raptor.reload.last_diet_quality).to eq("preferred")
    expect(raptor.hunger).to be < 40
  end
end
