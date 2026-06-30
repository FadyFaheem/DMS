class Structure < ApplicationRecord
  belongs_to :player

  validates :kind, presence: true,
            inclusion: { in: ->(_) { StructureCatalog.kinds } },
            uniqueness: { scope: :player_id }
  validates :level, numericality: { only_integer: true, greater_than: 0 }
end
