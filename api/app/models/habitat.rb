class Habitat < ApplicationRecord
  belongs_to :player
  has_many :dinosaurs, dependent: :nullify
  has_many :active_effects, dependent: :destroy

  validates :name, :terrain, presence: true
  validates :capacity, numericality: { only_integer: true, greater_than: 0 }

  before_create :apply_terrain_climate

  def living_count
    dinosaurs.alive.count
  end

  # Climate falls back to the terrain's catalog default when a habitat hasn't
  # been given its own reading (older rows / freshly seeded parks).
  def effective_temperature
    temperature || TerrainCatalog.find(terrain)&.temperature
  end

  def effective_humidity
    humidity || TerrainCatalog.find(terrain)&.humidity
  end

  def terrain_feature
    TerrainCatalog.find(terrain)&.feature
  end

  def at_capacity?
    living_count >= capacity
  end

  # Disease risk threshold from the design spec: density above 80% of capacity.
  def crowded?
    living_count > capacity * 0.8
  end

  # Disease/density modelling uses ">80% capacity"; the live health formula
  # treats strictly-over-capacity as overcrowded.
  def overcrowded?
    living_count > capacity
  end

  private

  # New habitats inherit their terrain's climate unless one was given explicitly.
  def apply_terrain_climate
    spec = TerrainCatalog.find(terrain)
    return unless spec

    self.temperature ||= spec.temperature
    self.humidity ||= spec.humidity
  end
end
