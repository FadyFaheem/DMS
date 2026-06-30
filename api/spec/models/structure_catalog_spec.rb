require "rails_helper"

RSpec.describe StructureCatalog do
  it "includes the veterinary lab gated by veterinary research" do
    vet = described_class.find("vet_lab")
    expect(vet.required_tech).to eq("veterinary")
    expect(vet.cost).to be > 0
  end

  it "returns nil for an unknown structure" do
    expect(described_class.find("space_elevator")).to be_nil
  end
end
