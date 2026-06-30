# Static species catalog for Phase 1 (no species table yet).
# Each entry is an immutable value object describing fixed traits.
module Species
  Entry = Data.define(
    :key, :name, :period, :diet_primary, :diet_secondary,
    :preferred_terrain, :social_structure, :base_size_lbs, :rarity, :starter
  )

  CATALOG = [
    Entry.new("triceratops",     "Triceratops",     "Cretaceous", "plants", "insects", "grassland", "herd",     13_000, :common,   true),
    Entry.new("stegosaurus",     "Stegosaurus",     "Jurassic",   "plants", nil,       "forest",    "herd",      11_000, :common,   true),
    Entry.new("velociraptor",    "Velociraptor",    "Cretaceous", "meat",   "insects", "grassland", "pair",         35, :common,   true),
    Entry.new("brachiosaurus",   "Brachiosaurus",   "Jurassic",   "plants", nil,       "grassland", "herd",      62_000, :uncommon, false),
    Entry.new("parasaurolophus", "Parasaurolophus", "Cretaceous", "plants", "insects", "wetland",   "herd",       5_000, :common,   false),
    Entry.new("coelophysis",     "Coelophysis",     "Triassic",   "meat",   nil,       "forest",    "solitary",      60, :common,   false),
    Entry.new("dilophosaurus",   "Dilophosaurus",   "Jurassic",   "meat",   "fish",    "forest",    "pair",         900, :uncommon, false)
  ].freeze

  INDEX = CATALOG.index_by(&:key).freeze

  module_function

  def all = CATALOG

  def find(key) = INDEX[key.to_s]

  def starters = CATALOG.select(&:starter)

  def adjacent?(key_a, key_b)
    a = find(key_a)
    b = find(key_b)
    return false unless a && b

    a.key == b.key || (a.diet_primary == b.diet_primary && a.period == b.period)
  end
end
