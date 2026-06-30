# Static catalog of buildable facilities (Phase 3). One of each kind per player.
# Extended in later milestones (hatchery, research station, attractions).
module StructureCatalog
  Building = Data.define(:kind, :name, :cost, :required_tech)

  CATALOG = [
    Building.new("vet_lab", "Veterinary Lab", 8_000, "veterinary")
  ].freeze

  INDEX = CATALOG.index_by(&:kind).freeze

  module_function

  def all = CATALOG

  def find(kind) = INDEX[kind.to_s]

  def kinds = INDEX.keys
end
