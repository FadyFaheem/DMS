require "rails_helper"

RSpec.describe FoodPurchase do
  let(:player) { Player.create!(player_code: PlayerCode.generate, display_name: "K", currency: 1_000, food_meat: 0) }

  it "buys food and debits currency" do
    FoodPurchase.call(player, type: "meat", quantity: 50)

    player.reload
    expect(player.food_meat).to eq(50)
    expect(player.currency).to eq(1_000 - 50 * Economy::FOOD_COST_PER_UNIT)
  end

  it "raises when funds are insufficient" do
    player.update!(currency: 10)
    expect { FoodPurchase.call(player, type: "meat", quantity: 50) }.to raise_error(FoodPurchase::InsufficientFunds)
  end

  it "rejects unknown types and non-positive quantities" do
    expect { FoodPurchase.call(player, type: "rocks", quantity: 1) }.to raise_error(ArgumentError)
    expect { FoodPurchase.call(player, type: "meat", quantity: 0) }.to raise_error(ArgumentError)
  end
end
