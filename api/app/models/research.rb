class Research < ApplicationRecord
  belongs_to :player

  validates :tech_key, presence: true, uniqueness: { scope: :player_id }
end
