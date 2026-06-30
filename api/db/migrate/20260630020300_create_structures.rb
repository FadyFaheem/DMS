class CreateStructures < ActiveRecord::Migration[8.1]
  def change
    create_table :structures do |t|
      t.references :player, null: false, foreign_key: true
      t.string :kind, null: false
      t.integer :level, null: false, default: 1

      t.timestamps
    end

    add_index :structures, [ :player_id, :kind ], unique: true
  end
end
