require "rails_helper"

RSpec.describe Research do
  let(:player) { Player.create!(player_code: PlayerCode.generate, display_name: "K") }

  it "belongs to a player and stores a tech key" do
    research = player.researches.create!(tech_key: "plant_farming")
    expect(research.player).to eq(player)
  end

  it "forbids unlocking the same tech twice" do
    player.researches.create!(tech_key: "plant_farming")
    dup = player.researches.build(tech_key: "plant_farming")
    expect(dup).not_to be_valid
  end
end
