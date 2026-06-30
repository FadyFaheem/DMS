require "rails_helper"

RSpec.describe Event do
  let(:player) { Player.create!(player_code: PlayerCode.generate, display_name: "K") }

  describe ".log" do
    it "records a kind and message for the player" do
      event = described_class.log(player, "research", "Researched Plant Farming")

      expect(event).to be_persisted
      expect(player.events.last.message).to eq("Researched Plant Farming")
    end
  end

  it "rejects an unknown kind" do
    event = player.events.build(kind: "explosion", message: "boom")
    expect(event).not_to be_valid
  end

  describe ".recent" do
    it "returns newest first and respects the limit" do
      described_class.log(player, "build", "one")
      described_class.log(player, "build", "two")
      described_class.log(player, "build", "three")

      expect(player.events.recent(2).map(&:message)).to eq(%w[three two])
    end
  end
end
