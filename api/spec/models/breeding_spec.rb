require "rails_helper"

RSpec.describe Breeding, type: :model do
  let(:player) { Player.create!(player_code: PlayerCode.generate, display_name: "K") }
  let(:mom) { make_dino("female") }
  let(:dad) { make_dino("male") }
  subject(:breeding) { player.breedings.new(parent_a: dad, parent_b: mom, hatches_at: 1.hour.from_now) }

  it "is valid and defaults to incubating" do
    expect(breeding).to be_valid
    breeding.save!
    expect(breeding.status).to eq("incubating")
  end

  it "validates status inclusion" do
    breeding.status = "bogus"
    expect(breeding).not_to be_valid
  end

  describe "#ready?" do
    it "is ready only while incubating and past the hatch time" do
      breeding.update!(hatches_at: 1.hour.ago)
      expect(breeding).to be_ready

      breeding.update!(hatches_at: 1.hour.from_now)
      expect(breeding).not_to be_ready
    end
  end

  def make_dino(gender)
    player.dinosaurs.create!(
      DinoFactory.attributes_for(Species.find("triceratops"), player:, habitat: nil).merge(gender:)
    )
  end
end
