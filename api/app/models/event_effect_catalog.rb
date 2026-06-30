# Static catalog of environmental / production events (Phase 3B). Each kind is a
# temporary ActiveEffect that scales some "output" by `multiplier` while active:
#   - :food_production scope -> reduces a matching farm's daily food output.
#   - :habitat scope        -> reduces resident dinos' happiness.
# `targets` lists the farm kinds (food_production) or terrains (habitat) a kind can
# strike. Rolls are deterministic per game-day (see Simulation::Events).
module EventEffectCatalog
  Effect = Data.define(:kind, :name, :scope, :targets, :multiplier, :duration_days, :weight)

  # Per game-day probability that some event fires for a player.
  DAILY_CHANCE = 0.2

  CATALOG = [
    Effect.new("drought",    "Drought",       :food_production, %w[plant_farm hunting_ground],         0.4, 3, 3),
    Effect.new("flood",      "Flood",         :food_production, %w[plant_farm],                         0.3, 2, 2),
    Effect.new("pest",       "Pest Outbreak", :food_production, %w[plant_farm],                         0.5, 3, 3),
    Effect.new("algae",      "Algal Bloom",   :food_production, %w[fishing_pond],                       0.4, 3, 2),
    Effect.new("heat_spike", "Heat Spike",    :habitat,         %w[forest grassland wetland volcanic aquatic], 0.5, 2, 2)
  ].freeze

  INDEX = CATALOG.index_by(&:kind).freeze
  TOTAL_WEIGHT = CATALOG.sum(&:weight)

  module_function

  def all = CATALOG

  def find(kind) = INDEX[kind.to_s]

  def kinds = INDEX.keys

  # Picks an effect in proportion to its weight using the supplied (seeded) RNG.
  def weighted_sample(rng)
    target = rng.rand(TOTAL_WEIGHT)
    CATALOG.each do |effect|
      return effect if target < effect.weight

      target -= effect.weight
    end
    CATALOG.last
  end
end
