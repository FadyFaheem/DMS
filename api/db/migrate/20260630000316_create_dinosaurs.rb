class CreateDinosaurs < ActiveRecord::Migration[8.1]
  def change
    create_table :dinosaurs do |t|
      t.references :player, null: false, foreign_key: true
      t.references :habitat, null: true, foreign_key: true
      t.string :species, null: false
      t.string :period
      t.string :name, null: false
      t.string :gender, null: false
      t.string :color
      t.integer :size_lbs, null: false, default: 0
      t.datetime :born_at, null: false
      t.integer :generation, null: false, default: 1
      t.string :diet_primary, null: false
      t.string :diet_secondary
      t.string :preferred_terrain
      t.string :social_structure, null: false, default: "herd"
      t.float :health, null: false, default: 100.0
      t.float :hunger, null: false, default: 0.0
      t.float :happiness, null: false, default: 70.0
      t.float :reproduction_readiness, null: false, default: 0.0
      t.string :last_diet_quality
      t.datetime :last_fed_at
      t.datetime :stats_updated_at, null: false
      t.references :parent_a, null: true
      t.references :parent_b, null: true
      t.jsonb :mutation_traits, null: false, default: []
      t.boolean :alive, null: false, default: true

      t.timestamps
    end

    # Self-referential lineage (added after the table exists).
    add_foreign_key :dinosaurs, :dinosaurs, column: :parent_a_id
    add_foreign_key :dinosaurs, :dinosaurs, column: :parent_b_id
  end
end
