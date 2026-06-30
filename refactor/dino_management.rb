# frozen_string_literal: true

# Dinosaur "management": from a list of raw records, derive each dino's health,
# living status and age metric, then summarise the herd by category.
#
# This is a refactor of a single, deeply-nested `run` method. The guiding ideas:
#
#   * One responsibility per piece. `Dinosaur` models a single animal and owns
#     its derived stats; `DinoManagement` maps a collection and builds the
#     summary. The original interleaved all of this in one long method.
#   * No hidden mutation. The original wrote `health`/`comment`/`age_metrics`
#     back into the caller's hashes (a surprising side effect). `Dinosaur` is an
#     immutable value object (`Data`), so the caller's input is left untouched.
#   * Total, not partial. The original raised on empty input (its `a` variable
#     was never assigned) and on any category other than herbivore/carnivore
#     (`health` stayed nil, then `nil > 0` blew up). Both are handled here.
#   * Data over branches. The "right food for this category" rule lives in the
#     EXPECTED_DIET table, so adding a category is a one-line change rather than
#     another nested `if`.
module DinoManagement
  # The food each category is meant to eat. Eating anything else halves a dino's
  # health. A category absent from this table simply has no dietary requirement
  # (see Dinosaur#eats_right_food?).
  EXPECTED_DIET = {
    "herbivore" => "plants",
    "carnivore" => "meat",
  }.freeze

  # Health starts at MAX_HEALTH and drops one point per unit of age.
  MAX_HEALTH = 100
  # Eating the wrong food divides the age-based health by this much.
  WRONG_DIET_DIVISOR = 2

  # An immutable snapshot of one dinosaur. The base attributes come straight
  # from the input record; health, status and age_metric are *derived* on
  # demand, so there is no duplicated state to keep in sync.
  Dinosaur = Data.define(:name, :category, :period, :diet, :age) do
    # Build a Dinosaur from a raw string-keyed record (e.g. parsed JSON),
    # tolerating missing keys. `age` is coerced to an Integer so a string or a
    # nil age can't crash the arithmetic later on.
    def self.from_record(record)
      new(
        name: record["name"],
        category: record["category"],
        period: record["period"],
        diet: record["diet"],
        age: record["age"].to_i,
      )
    end

    # Age-based health, halved for the wrong diet and never below zero.
    # A non-positive age means the dino isn't really alive: zero health.
    def health
      return 0 if age <= 0

      base = [MAX_HEALTH - age, 0].max
      eats_right_food? ? base : base / WRONG_DIET_DIVISOR
    end

    def alive?
      health.positive?
    end

    def status
      alive? ? "Alive" : "Dead"
    end

    # A coarse "half the age" figure, only meaningful for a living adult dino.
    def age_metric
      return 0 unless alive? && age > 1

      age / 2
    end

    # The serialisable view: original attributes plus the derived stats.
    def to_h
      super.merge(health: health, status: status, age_metric: age_metric)
    end

    private

    # A dino eats correctly when its diet matches the expectation for its
    # category. An unknown category has no expectation, so we don't penalise it
    # (and, crucially, don't crash the way the original did). Flip this to treat
    # unknown categories as "wrong diet" if the catalogue should be exhaustive.
    def eats_right_food?
      expected = EXPECTED_DIET[category]
      expected.nil? || diet == expected
    end
  end

  module_function

  # Enrich every record with derived stats and count the herd by category.
  # Accepts nil or an empty list; the input records are never modified.
  def analyze(records)
    dinos = Array(records).map { |record| Dinosaur.from_record(record) }
    { dinos: dinos.map(&:to_h), summary: summarize(dinos) }
  end

  # Category => number of dinos, in first-seen order.
  def summarize(dinos)
    dinos.map(&:category).tally
  end
end
