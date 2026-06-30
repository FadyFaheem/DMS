class AddEnvironmentToHabitats < ActiveRecord::Migration[8.1]
  def up
    add_column :habitats, :temperature, :integer
    add_column :habitats, :humidity, :integer
    add_column :habitats, :food_stockpile, :integer, null: false, default: 0

    # Backfill existing habitats with their terrain's default climate so the
    # temperature-match health term has data to work with on the first read.
    Habitat.reset_column_information
    TerrainCatalog.all.each do |terrain|
      Habitat.where(terrain: terrain.terrain, temperature: nil)
             .update_all(temperature: terrain.temperature, humidity: terrain.humidity)
    end
  end

  def down
    remove_column :habitats, :food_stockpile
    remove_column :habitats, :humidity
    remove_column :habitats, :temperature
  end
end
