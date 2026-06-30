# A time-limited environmental/production event affecting a player's park
# (Phase 3B). Scoped to a single habitat or food-production building (or neither
# for a park-wide effect). `multiplier` scales the target's output while the
# effect is active; expired rows are swept on read by Simulation::Events.
class ActiveEffect < ApplicationRecord
  belongs_to :player
  belongs_to :habitat, optional: true
  belongs_to :food_production, optional: true

  validates :kind, presence: true, inclusion: { in: ->(_) { EventEffectCatalog.kinds } }
  validates :multiplier, numericality: true
  validates :expires_at, presence: true

  scope :active, ->(now = Time.current) { where(expires_at: now..) }

  def spec
    EventEffectCatalog.find(kind)
  end

  def name
    spec&.name
  end
end
