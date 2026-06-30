class CreateResearches < ActiveRecord::Migration[8.1]
  def change
    create_table :researches do |t|
      t.references :player, null: false, foreign_key: true
      t.string :tech_key, null: false

      t.timestamps
    end

    add_index :researches, [ :player_id, :tech_key ], unique: true
  end
end
