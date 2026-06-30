class AddHealthHistoryToDinosaurs < ActiveRecord::Migration[8.1]
  def change
    add_column :dinosaurs, :health_history, :jsonb, null: false, default: []
  end
end
