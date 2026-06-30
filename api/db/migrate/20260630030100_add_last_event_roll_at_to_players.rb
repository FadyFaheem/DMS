class AddLastEventRollAtToPlayers < ActiveRecord::Migration[8.1]
  def change
    add_column :players, :last_event_roll_at, :datetime
  end
end
