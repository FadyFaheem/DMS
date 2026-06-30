class Habitat < ApplicationRecord
  belongs_to :player
  has_many :dinosaurs, dependent: :nullify

  validates :name, :terrain, presence: true
  validates :capacity, numericality: { only_integer: true, greater_than: 0 }

  def living_count
    dinosaurs.alive.count
  end

  def at_capacity?
    living_count >= capacity
  end

  # Disease/density modelling uses ">80% capacity"; the live health formula
  # treats strictly-over-capacity as overcrowded.
  def overcrowded?
    living_count > capacity
  end
end
