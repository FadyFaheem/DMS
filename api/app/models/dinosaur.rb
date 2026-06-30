class Dinosaur < ApplicationRecord
  belongs_to :player
  belongs_to :habitat, optional: true
  belongs_to :parent_a, class_name: "Dinosaur", optional: true
  belongs_to :parent_b, class_name: "Dinosaur", optional: true

  DIETS = %w[plants meat fish insects].freeze
  GENDERS = %w[male female].freeze
  SOCIAL_STRUCTURES = %w[solitary pair herd].freeze

  validates :species, :name, :gender, :diet_primary, presence: true
  validates :gender, inclusion: { in: GENDERS }
  validates :diet_primary, inclusion: { in: DIETS }
  validates :health, :hunger, :happiness, :reproduction_readiness,
            numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 100 }

  scope :alive, -> { where(alive: true) }

  # Health bands from the design spec.
  def status
    return "Dead" unless alive

    case health
    when 75..Float::INFINITY then "Thriving"
    when 50...75 then "Stable"
    when 25...50 then "Struggling"
    else "Critical"
    end
  end

  def breeding_ready?
    alive && health >= 60 && reproduction_readiness >= 100
  end

  def species_entry
    Species.find(species)
  end
end
