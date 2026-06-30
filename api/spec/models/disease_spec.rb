require "rails_helper"

RSpec.describe Disease do
  let(:player) { Player.create!(player_code: PlayerCode.generate, display_name: "K") }
  let(:habitat) { player.habitats.create!(name: "Forest", terrain: "forest", capacity: 6) }
  let(:dino) { player.dinosaurs.create!(DinoFactory.attributes_for(Species.find("stegosaurus"), player:, habitat:)) }

  it "scopes to active (uncured) ailments" do
    active = dino.diseases.create!(kind: "parasites", started_at: Time.current)
    dino.diseases.create!(kind: "scale_rot", started_at: 1.day.ago, cured_at: Time.current)

    expect(dino.diseases.active).to contain_exactly(active)
  end

  it "rejects an unknown kind" do
    expect(dino.diseases.build(kind: "the_sniffles", started_at: Time.current)).not_to be_valid
  end
end
