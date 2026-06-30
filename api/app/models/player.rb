class Player < ApplicationRecord
  has_many :habitats, dependent: :destroy
  has_many :dinosaurs, dependent: :destroy
  has_many :breedings, dependent: :destroy

  validates :player_code, presence: true, uniqueness: true
  validates :display_name, presence: true
  validates :currency, :food_plants, :food_meat, :food_fish,
            numericality: { only_integer: true, greater_than_or_equal_to: 0 }

  def food_for(diet)
    case diet
    when "plants", "insects" then food_plants
    when "meat" then food_meat
    when "fish" then food_fish
    else 0
    end
  end
end
