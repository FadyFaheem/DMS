require "rails_helper"

RSpec.describe Economy do
  let(:player) { Player.create!(player_code: PlayerCode.generate, display_name: "K", currency: 0) }

  describe ".passive_income" do
    it "awards income per living dino per game-day" do
      habitat = player.habitats.create!(name: "Forest", terrain: "forest", capacity: 6)
      2.times { player.dinosaurs.create!(DinoFactory.attributes_for(Species.find("stegosaurus"), player:, habitat:)) }
      player.update!(last_income_at: 10.hours.ago) # 10 game-days at the default scale

      amount = described_class.passive_income(player, now: Time.current)

      expect(amount).to eq(10 * 2 * Economy::INCOME_PER_DINO_PER_DAY)
      expect(player.reload.currency).to eq(amount)
    end

    it "awards nothing within the same game-day" do
      player.update!(last_income_at: Time.current)
      expect(described_class.passive_income(player, now: Time.current)).to eq(0)
    end
  end

  describe ".habitat_cost" do
    it "returns terrain-specific costs with a default fallback" do
      expect(described_class.habitat_cost("grassland")).to eq(4_000)
      expect(described_class.habitat_cost("unknown")).to eq(Economy::DEFAULT_HABITAT_COST)
    end
  end

  describe "upgrade costs" do
    it "scales the food-production upgrade cost with the current level" do
      expect(described_class.food_production_upgrade_cost(1)).to eq(Economy::FOOD_PRODUCTION_UPGRADE_BASE)
      expect(described_class.food_production_upgrade_cost(3)).to eq(Economy::FOOD_PRODUCTION_UPGRADE_BASE * 3)
    end

    it "scales the habitat upgrade cost with the current level" do
      expect(described_class.habitat_upgrade_cost(1)).to eq(Economy::HABITAT_UPGRADE_BASE)
      expect(described_class.habitat_upgrade_cost(2)).to eq(Economy::HABITAT_UPGRADE_BASE * 2)
    end

    it "scales the treatment cost with the number of diseases" do
      expect(described_class.treatment_cost(2)).to eq(Economy::TREATMENT_COST_PER_DISEASE * 2)
    end
  end
end
