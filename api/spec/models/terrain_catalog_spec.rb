require "rails_helper"

RSpec.describe TerrainCatalog do
  it "describes every buildable terrain with a climate and feature" do
    expect(described_class.terrains).to include("forest", "grassland", "wetland", "volcanic", "aquatic")
    described_class.all.each do |terrain|
      expect(terrain.temperature).to be_a(Integer)
      expect(terrain.humidity).to be_a(Integer)
      expect(terrain.feature).to be_a(Symbol)
    end
  end

  it "makes volcanic the hottest and forest the coolest" do
    hottest = described_class.all.max_by(&:temperature)
    coolest = described_class.all.min_by(&:temperature)
    expect(hottest.terrain).to eq("volcanic")
    expect(coolest.terrain).to eq("forest")
  end

  it "looks terrains up by key and returns nil for unknown ones" do
    expect(described_class.find("wetland").feature).to eq(:disease_risk)
    expect(described_class.find("moon")).to be_nil
  end
end
