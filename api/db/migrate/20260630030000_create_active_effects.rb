class CreateActiveEffects < ActiveRecord::Migration[8.1]
  def change
    create_table :active_effects do |t|
      t.references :player, null: false, foreign_key: true
      t.references :habitat, null: true, foreign_key: true
      t.references :food_production, null: true, foreign_key: true
      t.string :kind, null: false
      t.float :multiplier, null: false, default: 1.0
      t.datetime :expires_at, null: false

      t.timestamps
    end

    add_index :active_effects, [ :player_id, :expires_at ]
  end
end
