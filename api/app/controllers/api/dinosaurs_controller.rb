module Api
  class DinosaursController < BaseController
    rescue_from ActiveRecord::RecordNotFound do
      render json: { error: "Dinosaur not found" }, status: :not_found
    end

    # GET /api/dinosaurs/:id
    def show
      dino = current_player.dinosaurs.find(params[:id])
      Simulation::DinoTick.call(dino)
      render json: GameSerializer.dinosaur(dino.reload)
    end

    # POST /api/dinosaurs/:id/feed { diet }
    def feed
      dino = current_player.dinosaurs.alive.find(params[:id])
      Simulation::DinoTick.call(dino)
      Feeding.call(dino, diet: params[:diet])
      render json: GameSerializer.dinosaur(dino.reload)
    rescue Feeding::InsufficientFood
      render json: { error: "Not enough food of that type" }, status: :unprocessable_entity
    rescue ArgumentError => e
      render json: { error: e.message }, status: :unprocessable_entity
    end

    # POST /api/dinosaurs/:id/move { habitat_id }
    def move
      dino = current_player.dinosaurs.find(params[:id])
      habitat = current_player.habitats.find(params[:habitat_id])
      dino.update!(habitat:)
      render json: GameSerializer.dinosaur(dino.reload)
    end
  end
end
