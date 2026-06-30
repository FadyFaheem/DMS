# Park-wide activity log entry (births, deaths, research, builds, upgrades).
# Written by services and controllers via Event.log and surfaced on the player
# payload as a recent feed.
class Event < ApplicationRecord
  KINDS = %w[birth death research build upgrade disease cure event].freeze

  belongs_to :player

  validates :kind, presence: true, inclusion: { in: KINDS }
  validates :message, presence: true

  scope :recent, ->(limit = 20) { order(created_at: :desc, id: :desc).limit(limit) }

  def self.log(player, kind, message, now: Time.current)
    player.events.create!(kind: kind, message: message, created_at: now, updated_at: now)
  end
end
