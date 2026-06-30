class CreatePlayers < ActiveRecord::Migration[8.1]
  def change
    create_table :players do |t|
      t.string :player_code, null: false
      t.string :display_name, null: false, default: "New Keeper"
      t.integer :currency, null: false, default: 10_000
      t.integer :food_plants, null: false, default: 100
      t.integer :food_meat, null: false, default: 100
      t.integer :food_fish, null: false, default: 50
      t.datetime :last_income_at

      t.timestamps
    end

    add_index :players, :player_code, unique: true
  end
end
