# frozen_string_literal: true

# Run with:  rspec refactor/dino_management_spec.rb
require_relative "dino_management"

RSpec.describe DinoManagement do
  # Builds one dino from a sensible default record so each example only states
  # the attribute(s) it actually cares about.
  def dino(overrides = {})
    base = { "name" => "Rex", "category" => "carnivore", "period" => "Jurassic", "diet" => "meat", "age" => 80 }
    DinoManagement::Dinosaur.from_record(base.merge(overrides))
  end

  describe DinoManagement::Dinosaur do
    describe "#health" do
      it "is 100 minus age when the diet suits the category" do
        expect(dino("category" => "herbivore", "diet" => "plants", "age" => 30).health).to eq(70)
        expect(dino("category" => "carnivore", "diet" => "meat", "age" => 80).health).to eq(20)
      end

      it "is halved when the diet is wrong for the category" do
        expect(dino("category" => "herbivore", "diet" => "meat", "age" => 30).health).to eq(35)
        expect(dino("category" => "carnivore", "diet" => "plants", "age" => 80).health).to eq(10)
      end

      it "is zero for an age of zero or below" do
        expect(dino("age" => 0).health).to eq(0)
        expect(dino("age" => -5).health).to eq(0)
      end

      it "never goes negative, even past the maximum age" do
        expect(dino("category" => "herbivore", "diet" => "plants", "age" => 150).health).to eq(0)
      end

      it "does not penalise (or crash on) an unknown category" do
        expect { dino("category" => "omnivore", "age" => 40).health }.not_to raise_error
        expect(dino("category" => "omnivore", "diet" => "fruit", "age" => 40).health).to eq(60)
      end
    end

    describe "#status" do
      it "is Alive while health remains" do
        expect(dino("category" => "carnivore", "diet" => "meat", "age" => 80).status).to eq("Alive")
      end

      it "is Dead once health hits zero" do
        expect(dino("age" => 0).status).to eq("Dead")
        expect(dino("category" => "herbivore", "diet" => "plants", "age" => 100).status).to eq("Dead")
      end
    end

    describe "#age_metric" do
      it "is half the (integer) age for a living adult" do
        expect(dino("category" => "carnivore", "diet" => "meat", "age" => 80).age_metric).to eq(40)
        expect(dino("category" => "carnivore", "diet" => "meat", "age" => 81).age_metric).to eq(40)
      end

      it "is zero for a dead dino" do
        expect(dino("age" => 0).age_metric).to eq(0)
      end

      it "is zero for a barely-aged dino" do
        expect(dino("category" => "carnivore", "diet" => "meat", "age" => 1).age_metric).to eq(0)
      end
    end
  end

  describe ".analyze" do
    let(:records) do
      [
        { "name" => "DinoA", "category" => "herbivore", "period" => "Cretaceous", "diet" => "plants", "age" => 100 },
        { "name" => "DinoB", "category" => "carnivore", "period" => "Jurassic", "diet" => "meat", "age" => 80 },
      ]
    end

    it "returns each dino enriched with derived stats" do
      expect(described_class.analyze(records)[:dinos]).to eq(
        [
          { name: "DinoA", category: "herbivore", period: "Cretaceous", diet: "plants", age: 100, health: 0, status: "Dead", age_metric: 0 },
          { name: "DinoB", category: "carnivore", period: "Jurassic", diet: "meat", age: 80, health: 20, status: "Alive", age_metric: 40 },
        ]
      )
    end

    it "summarises the herd by category" do
      expect(described_class.analyze(records)[:summary]).to eq("herbivore" => 1, "carnivore" => 1)
    end

    it "does not mutate the caller's records" do
      snapshot = records.map(&:dup)
      described_class.analyze(records)
      expect(records).to eq(snapshot)
    end

    it "handles an empty list without crashing" do
      expect(described_class.analyze([])).to eq(dinos: [], summary: {})
    end

    it "treats nil as an empty list" do
      expect(described_class.analyze(nil)).to eq(dinos: [], summary: {})
    end

    it "counts a dino of an unfamiliar category instead of raising" do
      mixed = records + [{ "name" => "DinoC", "category" => "omnivore", "diet" => "fruit", "age" => 10 }]
      expect(described_class.analyze(mixed)[:summary]).to eq("herbivore" => 1, "carnivore" => 1, "omnivore" => 1)
    end
  end
end
