class AddLastConsumedAtToPlayers < ActiveRecord::Migration[8.1]
  def change
    add_column :players, :last_consumed_at, :datetime
  end
end
