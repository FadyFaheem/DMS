class FoodProduction < ApplicationRecord
  belongs_to :player
  has_many :active_effects, dependent: :destroy

  validates :kind, presence: true, inclusion: { in: ->(_) { FoodProductionCatalog.kinds } }
  validates :level, numericality: { only_integer: true, greater_than: 0 }

  # Prey-limited farms (hunting grounds / fishing ponds) carry a depleting pool.
  def prey?
    prey_capacity.positive?
  end
end
