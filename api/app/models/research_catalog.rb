# Static catalog of unlockable technologies (Phase 2). Mirrors the immutable
# value-object pattern used by Species. Pay-to-unlock: prerequisites + an
# optional population milestone gate each tech; no research timers yet.
module ResearchCatalog
  Tech = Data.define(
    :key, :name, :description, :cost, :prerequisites, :requires_population, :unlocks
  )

  CATALOG = [
    Tech.new("plant_farming",     "Plant Farming",     "Build plant farms that grow plant food over time.",   1_500, [],                0, %w[plant_farm]),
    Tech.new("hunting_grounds",   "Hunting Grounds",   "Build hunting grounds that yield meat over time.",     2_000, [],                0, %w[hunting_ground]),
    Tech.new("fishing_ponds",     "Fishing Ponds",     "Build fishing ponds that yield fish over time.",       2_000, [],                0, %w[fishing_pond]),
    Tech.new("advanced_farming",  "Advanced Farming",  "Upgrade food-production buildings past level 1.",      4_000, %w[plant_farming], 0, %w[food_production_upgrade]),
    Tech.new("habitat_expansion", "Habitat Expansion", "Upgrade habitats to raise their capacity.",            3_000, [],                5, %w[habitat_upgrade]),
    Tech.new("veterinary",        "Veterinary Science", "Build a veterinary lab to treat and cure sick dinosaurs.", 2_500, [],             0, %w[vet_lab])
  ].freeze

  INDEX = CATALOG.index_by(&:key).freeze

  module_function

  def all = CATALOG

  def find(key) = INDEX[key.to_s]

  def keys = INDEX.keys
end
