# Static catalog of dinosaur ailments (Phase 3A). `daily_health` is the per
# game-day health change while the disease is active (negative = harm). Onset is
# rule-based (terrain + crowding + low health / starvation); cures come from the
# veterinary lab, except malnutrition which clears once the dino is fed again.
module DiseaseCatalog
  Ailment = Data.define(:kind, :name, :daily_health, :contagious)

  CATALOG = [
    Ailment.new("scale_rot",    "Scale Rot",    -5.0, false),
    Ailment.new("parasites",    "Parasites",    -3.0, true),
    Ailment.new("heat_stress",  "Heat Stress",  -4.0, false),
    Ailment.new("malnutrition", "Malnutrition", -2.0, false)
  ].freeze

  INDEX = CATALOG.index_by(&:kind).freeze

  module_function

  def all = CATALOG

  def find(kind) = INDEX[kind.to_s]

  def kinds = INDEX.keys
end
