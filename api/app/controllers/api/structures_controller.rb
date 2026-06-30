module Api
  class StructuresController < BaseController
    # GET /api/structures
    def index
      render json: GameSerializer.structures(current_player)
    end

    # POST /api/structures { kind }
    def create
      spec = StructureCatalog.find(params[:kind])
      return render json: { error: "Unknown structure" }, status: :unprocessable_entity unless spec
      unless current_player.researches.exists?(tech_key: spec.required_tech)
        return render json: { error: "Requires #{spec.required_tech}" }, status: :unprocessable_entity
      end
      if current_player.structures.exists?(kind: spec.kind)
        return render json: { error: "Already built" }, status: :unprocessable_entity
      end
      if current_player.currency < spec.cost
        return render json: { error: "Not enough currency" }, status: :unprocessable_entity
      end

      current_player.transaction do
        current_player.update!(currency: current_player.currency - spec.cost)
        current_player.structures.create!(kind: spec.kind)
        Event.log(current_player, "build", "Built #{spec.name}")
      end

      render json: GameSerializer.structures(current_player), status: :created
    end
  end
end
