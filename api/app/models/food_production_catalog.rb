# Static catalog of food-production buildings (Phase 2). Each kind feeds one
# food store, costs currency to build, and is gated behind a research tech.
# Output scales linearly with a building's level. Hunting grounds and fishing
# ponds also draw from a prey pool (Phase 3B): `prey_capacity` seeds a new
# building's pool, which depletes as it produces and regrows `prey_regrow_per_day`
# game-day; a pool of 0 means an unlimited farm (plant farms).
module FoodProductionCatalog
  Building = Data.define(
    :kind, :name, :food_column, :base_output_per_day, :build_cost, :required_tech,
    :prey_capacity, :prey_regrow_per_day
  )

  CATALOG = [
    Building.new("plant_farm",     "Plant Farm",     :food_plants, 50, 2_500, "plant_farming",   0,   0),
    Building.new("hunting_ground", "Hunting Ground", :food_meat,   40, 3_000, "hunting_grounds", 240, 45),
    Building.new("fishing_pond",   "Fishing Pond",   :food_fish,   35, 3_000, "fishing_ponds",   210, 40)
  ].freeze

  INDEX = CATALOG.index_by(&:kind).freeze

  module_function

  def all = CATALOG

  def find(kind) = INDEX[kind.to_s]

  def kinds = INDEX.keys
end
