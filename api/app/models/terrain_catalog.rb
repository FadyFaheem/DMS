# Static catalog of terrain "depth" (Phase 3D): each terrain carries a default
# climate (temperature in degrees Celsius + relative humidity) and a special
# feature that the simulation reacts to:
#   - :shade        (forest)    -> coolest terrain; comfortable for most dinos
#   - :predation    (grassland) -> herbivores are uneasy sharing it with carnivores
#   - :disease_risk (wetland)   -> humid; breeds scale rot (see Simulation::DinoTick)
#   - :heat         (volcanic)  -> hottest; delights heat-tolerant dinos
#   - :humid        (aquatic)   -> very humid; suits aquatic species
# Habitats copy these defaults on creation but store their own columns so they
# can drift later; Habitat#effective_temperature falls back here when unset.
module TerrainCatalog
  Terrain = Data.define(:terrain, :name, :temperature, :humidity, :feature, :feature_label)

  CATALOG = [
    Terrain.new("forest",    "Forest",    18, 60, :shade,        "Shaded canopy keeps residents cool"),
    Terrain.new("grassland", "Grassland", 24, 40, :predation,    "Open ground; herbivores fear nearby carnivores"),
    Terrain.new("wetland",   "Wetland",   22, 85, :disease_risk, "Standing water breeds disease"),
    Terrain.new("volcanic",  "Volcanic",  34, 20, :heat,         "Volcanic warmth delights heat-lovers"),
    Terrain.new("aquatic",   "Aquatic",   20, 95, :humid,        "Open water suits aquatic species")
  ].freeze

  INDEX = CATALOG.index_by(&:terrain).freeze

  module_function

  def all = CATALOG

  def find(terrain) = INDEX[terrain.to_s]

  def terrains = INDEX.keys
end
