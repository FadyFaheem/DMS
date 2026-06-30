class CreateHabitats < ActiveRecord::Migration[8.1]
  def change
    create_table :habitats do |t|
      t.references :player, null: false, foreign_key: true
      t.string :name, null: false
      t.string :terrain, null: false
      t.integer :capacity, null: false, default: 6
      t.integer :happiness_modifier, null: false, default: 0

      t.timestamps
    end
  end
end
