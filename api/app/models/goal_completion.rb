# Records that a player has completed a goal/achievement (Phase 3D). The unique
# (player_id, goal_key) index makes reward-granting idempotent: a goal can only
# be recorded -- and therefore rewarded -- once per player.
class GoalCompletion < ApplicationRecord
  belongs_to :player

  validates :goal_key, presence: true,
            inclusion: { in: ->(_) { GoalCatalog.keys } },
            uniqueness: { scope: :player_id }
end
