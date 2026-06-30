class Disease < ApplicationRecord
  belongs_to :dinosaur

  validates :kind, presence: true, inclusion: { in: ->(_) { DiseaseCatalog.kinds } }

  scope :active, -> { where(cured_at: nil) }

  def active?
    cured_at.nil?
  end
end
