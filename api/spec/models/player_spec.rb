require "rails_helper"

RSpec.describe Player, type: :model do
  subject(:player) { Player.new(player_code: "TEST-CODE", display_name: "Keeper") }

  it "is valid with a code and name" do
    expect(player).to be_valid
  end

  it "requires a player_code" do
    player.player_code = nil
    expect(player).not_to be_valid
  end

  it "enforces a unique player_code" do
    Player.create!(player_code: "DUP-CODE", display_name: "A")
    expect(Player.new(player_code: "DUP-CODE", display_name: "B")).not_to be_valid
  end

  it "rejects negative currency" do
    player.currency = -1
    expect(player).not_to be_valid
  end

  describe "#food_for" do
    it "maps each diet to the right store" do
      player.assign_attributes(food_plants: 10, food_meat: 20, food_fish: 30)
      expect(player.food_for("plants")).to eq(10)
      expect(player.food_for("insects")).to eq(10)
      expect(player.food_for("meat")).to eq(20)
      expect(player.food_for("fish")).to eq(30)
      expect(player.food_for("rocks")).to eq(0)
    end
  end
end
