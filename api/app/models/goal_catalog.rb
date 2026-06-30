# Static catalog of goals / achievements (Phase 3D). Each goal compares a
# computed `metric` against a `threshold`; once reached it is recorded (once)
# and pays a one-off currency `reward`. Boolean-style metrics (self-sustaining,
# perfect IV, the win condition) report 1 when satisfied against a threshold of
# 1. Exactly one goal is the `win` condition, which flips the player's win flag
# (and unlocks prestige). Evaluation lives in Goals::Evaluation.
module GoalCatalog
  Goal = Data.define(:key, :name, :description, :metric, :threshold, :reward, :win)

  # Game-days a park must run without a hand-feed to count as self-sustaining.
  SELF_SUSTAIN_DAYS = 7
  # Genetics quality (IV) that counts a bred dino as "perfect".
  PERFECT_IV = 95
  # Minimum populations that make the health/sustaining goals non-trivial (a
  # fresh starter park shouldn't instantly clear them).
  THRIVING_MIN_POPULATION = 5
  SUSTAIN_MIN_POPULATION = 3

  CATALOG = [
    Goal.new("growing_park",   "Growing Park",   "Reach a population of 10 living dinosaurs.",                       :population,      10,                 2_000,  false),
    Goal.new("thriving_park",  "Thriving Park",  "Keep a park of at least #{THRIVING_MIN_POPULATION} dinos at 90+ average health.", :avg_health, 90,        2_500,  false),
    Goal.new("self_sustaining", "Self-Sustaining", "Go #{SELF_SUSTAIN_DAYS} game-days without hand-feeding a dino.", :self_sustaining, 1,                  3_000,  false),
    Goal.new("perfect_genes",  "Perfect Genes",  "Breed a dinosaur with a genetics quality of #{PERFECT_IV}+.",      :perfect_iv,      1,                  4_000,  false),
    Goal.new("master_breeder", "Master Breeder", "Unlock every species in the catalog.",                             :all_species,     Species.keys.size,  5_000,  false),
    Goal.new("park_legend",    "Park Legend",    "Build a legendary park: 15 dinos, every species, 80+ health.",     :park_legend,     1,                  10_000, true)
  ].freeze

  INDEX = CATALOG.index_by(&:key).freeze

  module_function

  def all = CATALOG

  def find(key) = INDEX[key.to_s]

  def keys = INDEX.keys
end
