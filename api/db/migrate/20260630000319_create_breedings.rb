class CreateBreedings < ActiveRecord::Migration[8.1]
  def change
    create_table :breedings do |t|
      t.references :player, null: false, foreign_key: true
      t.references :parent_a, null: false
      t.references :parent_b, null: false
      t.references :offspring, null: true
      t.datetime :hatches_at, null: false
      t.string :status, null: false, default: "incubating"

      t.timestamps
    end

    add_foreign_key :breedings, :dinosaurs, column: :parent_a_id
    add_foreign_key :breedings, :dinosaurs, column: :parent_b_id
    add_foreign_key :breedings, :dinosaurs, column: :offspring_id
  end
end
