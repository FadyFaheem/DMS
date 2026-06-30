class CreateDiseases < ActiveRecord::Migration[8.1]
  def change
    create_table :diseases do |t|
      t.references :dinosaur, null: false, foreign_key: true
      t.string :kind, null: false
      t.datetime :started_at, null: false
      t.datetime :cured_at

      t.timestamps
    end

    add_index :diseases, [ :dinosaur_id, :cured_at ]
  end
end
