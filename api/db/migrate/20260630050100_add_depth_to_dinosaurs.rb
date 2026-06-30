class AddDepthToDinosaurs < ActiveRecord::Migration[8.1]
  def change
    add_column :dinosaurs, :genetics_quality, :integer, null: false, default: 50
    add_column :dinosaurs, :temperature_min, :integer
    add_column :dinosaurs, :temperature_max, :integer
    add_column :dinosaurs, :diet_restrictions, :jsonb, null: false, default: []
  end
end
