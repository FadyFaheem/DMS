require "rails_helper"

RSpec.describe Simulation::HealthFormula do
  describe ".daily_health_delta" do
    it "is positive for a well-fed dino in its preferred herd habitat" do
      delta = described_class.daily_health_delta(
        age_months: 0, diet_quality: "preferred",
        matches_terrain: true, overcrowded: false, structure: "herd", with_group: true
      )
      expect(delta).to be > 0
    end

    it "is strongly negative when starving, overcrowded, and alone" do
      delta = described_class.daily_health_delta(
        age_months: 0, diet_quality: "wrong",
        matches_terrain: false, overcrowded: true, structure: "herd", with_group: false
      )
      expect(delta).to be < -5
    end

    it "decays faster with age" do
      common = { diet_quality: "acceptable", matches_terrain: false, overcrowded: false, structure: "solitary", with_group: false }
      young = described_class.daily_health_delta(age_months: 0, **common)
      old = described_class.daily_health_delta(age_months: 120, **common)
      expect(old).to be < young
    end
  end

  describe ".temperature_delta" do
    it "gives a small bonus inside the comfortable range" do
      expect(described_class.temperature_delta(temperature: 20, min: 10, max: 26)).to eq(0.5)
    end

    it "penalises by distance outside the range" do
      expect(described_class.temperature_delta(temperature: 34, min: 10, max: 26)).to be_within(0.001).of(-1.6)
      expect(described_class.temperature_delta(temperature: 4, min: 10, max: 26)).to be_within(0.001).of(-1.2)
    end

    it "is neutral when the band or reading is unknown" do
      expect(described_class.temperature_delta(temperature: nil, min: 10, max: 26)).to eq(0.0)
      expect(described_class.temperature_delta(temperature: 20, min: nil, max: nil)).to eq(0.0)
    end

    it "feeds into the daily delta as an additive term" do
      common = { age_months: 0, diet_quality: "acceptable", matches_terrain: false, overcrowded: false, structure: "solitary", with_group: false }
      comfy = described_class.daily_health_delta(**common, temperature_delta: 0.5)
      cold = described_class.daily_health_delta(**common, temperature_delta: -2.0)
      expect(comfy - cold).to be_within(0.001).of(2.5)
    end
  end

  describe ".happiness" do
    it "rewards a matching terrain and herd company over a crowded, lonely pen" do
      happy = described_class.happiness(
        happiness_modifier: 10, matches_terrain: true, overcrowded: false, structure: "herd", with_group: true
      )
      miserable = described_class.happiness(
        happiness_modifier: 0, matches_terrain: false, overcrowded: true, structure: "herd", with_group: false
      )
      expect(happy).to be > miserable
    end
  end
end
