require "rails_helper"

RSpec.describe DiseaseCatalog do
  it "lists the Phase 3 ailments with a harmful daily health effect" do
    expect(described_class.kinds).to include("scale_rot", "parasites", "heat_stress", "malnutrition")
    expect(described_class.find("scale_rot").daily_health).to be < 0
  end

  it "flags parasites as contagious" do
    expect(described_class.find("parasites").contagious).to be(true)
  end

  it "returns nil for an unknown ailment" do
    expect(described_class.find("the_sniffles")).to be_nil
  end
end
