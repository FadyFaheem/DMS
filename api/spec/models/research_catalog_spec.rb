require "rails_helper"

RSpec.describe ResearchCatalog do
  it "indexes the Phase 2 technologies" do
    expect(described_class.keys).to include(
      "plant_farming", "hunting_grounds", "fishing_ponds", "advanced_farming", "habitat_expansion"
    )
  end

  it "looks up a tech and exposes its cost and prerequisites" do
    tech = described_class.find("advanced_farming")
    expect(tech.cost).to be > 0
    expect(tech.prerequisites).to eq(%w[plant_farming])
  end

  it "gates habitat expansion behind a population milestone" do
    expect(described_class.find("habitat_expansion").requires_population).to eq(5)
  end

  it "returns nil for an unknown key" do
    expect(described_class.find("time_travel")).to be_nil
  end
end
