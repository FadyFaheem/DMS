class AddLevelToHabitats < ActiveRecord::Migration[8.1]
  def change
    add_column :habitats, :level, :integer, null: false, default: 1
  end
end
