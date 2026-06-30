module Api
  class FoodProductionsController < BaseController
    # GET /api/food_productions
    def index
      render json: GameSerializer.food_productions(current_player)
    end

    # POST /api/food_productions { kind }
    def create
      spec = FoodProductionCatalog.find(params[:kind])
      return render json: { error: "Unknown building" }, status: :unprocessable_entity unless spec
      unless unlocked?(spec.required_tech)
        return render json: { error: "Requires #{spec.required_tech}" }, status: :unprocessable_entity
      end
      if current_player.currency < spec.build_cost
        return render json: { error: "Not enough currency" }, status: :unprocessable_entity
      end

      current_player.transaction do
        current_player.update!(currency: current_player.currency - spec.build_cost)
        current_player.food_productions.create!(kind: spec.kind, last_collected_at: Time.current)
        Event.log(current_player, "build", "Built #{spec.name}")
      end

      render json: GameSerializer.food_productions(current_player), status: :created
    end

    # POST /api/food_productions/:id/upgrade
    def upgrade
      building = current_player.food_productions.find_by(id: params[:id])
      return render json: { error: "Building not found" }, status: :not_found unless building
      unless unlocked?("advanced_farming")
        return render json: { error: "Requires advanced_farming" }, status: :unprocessable_entity
      end

      cost = Economy.food_production_upgrade_cost(building.level)
      if current_player.currency < cost
        return render json: { error: "Not enough currency" }, status: :unprocessable_entity
      end

      spec = FoodProductionCatalog.find(building.kind)
      current_player.transaction do
        # Settle output earned at the current level before raising it.
        Simulation::FoodCollection.call(current_player)
        current_player.update!(currency: current_player.currency - cost)
        building.reload
        building.update!(level: building.level + 1)
        Event.log(current_player, "upgrade", "Upgraded #{spec.name} to level #{building.level}")
      end

      render json: GameSerializer.food_productions(current_player)
    end

    private

    def unlocked?(tech_key)
      current_player.researches.exists?(tech_key: tech_key)
    end
  end
end
