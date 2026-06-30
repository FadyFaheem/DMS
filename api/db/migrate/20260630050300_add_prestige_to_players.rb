class AddPrestigeToPlayers < ActiveRecord::Migration[8.1]
  def change
    add_column :players, :prestige_level, :integer, null: false, default: 0
    add_column :players, :won, :boolean, null: false, default: false
  end
end
