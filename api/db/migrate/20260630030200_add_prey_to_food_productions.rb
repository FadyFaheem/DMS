class AddPreyToFoodProductions < ActiveRecord::Migration[8.1]
  def up
    add_column :food_productions, :prey_population, :integer, null: false, default: 0
    add_column :food_productions, :prey_capacity, :integer, null: false, default: 0

    # Backfill existing hunting grounds / fishing ponds to a full prey pool so
    # they don't read as "overhunted" the first time they tick after this change.
    FoodProduction.reset_column_information
    FoodProductionCatalog.all.each do |spec|
      next unless spec.prey_capacity.positive?

      FoodProduction.where(kind: spec.kind)
                    .update_all(prey_capacity: spec.prey_capacity, prey_population: spec.prey_capacity)
    end
  end

  def down
    remove_column :food_productions, :prey_capacity
    remove_column :food_productions, :prey_population
  end
end
