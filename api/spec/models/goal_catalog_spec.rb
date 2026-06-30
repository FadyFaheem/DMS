require "rails_helper"

RSpec.describe GoalCatalog do
  it "has a unique key per goal and exactly one win condition" do
    expect(described_class.keys.uniq.size).to eq(described_class.all.size)
    expect(described_class.all.count(&:win)).to eq(1)
  end

  it "rewards every goal with currency" do
    expect(described_class.all).to all(have_attributes(reward: be_positive))
  end

  it "finds goals by key and returns nil for unknown ones" do
    expect(described_class.find("growing_park").metric).to eq(:population)
    expect(described_class.find("nope")).to be_nil
  end
end
