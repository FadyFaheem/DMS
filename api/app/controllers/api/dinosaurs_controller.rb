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

    # POST /api/dinosaurs/:id/treat -- cure active diseases (needs a vet lab)
    def treat
      dino = current_player.dinosaurs.find(params[:id])
      unless current_player.structure?("vet_lab")
        return render json: { error: "Build a veterinary lab first" }, status: :unprocessable_entity
      end

      active = dino.diseases.active.to_a
      return render json: { error: "No active illness to treat" }, status: :unprocessable_entity if active.empty?

      cost = Economy.treatment_cost(active.size)
      return render json: { error: "Not enough currency" }, status: :unprocessable_entity if current_player.currency < cost

      now = Time.current
      current_player.transaction do
        current_player.update!(currency: current_player.currency - cost)
        active.each { |disease| disease.update!(cured_at: now) }
        dino.update!(health_history: dino.health_history + [ treatment_record(active, now) ])
        names = active.map { |d| DiseaseCatalog.find(d.kind).name }.join(", ")
        Event.log(current_player, "cure", "#{dino.name} was treated for #{names}", now: now)
      end

      render json: GameSerializer.dinosaur(dino.reload)
    end

    # POST /api/dinosaurs/:id/quarantine -- toggle quarantine
    def quarantine
      dino = current_player.dinosaurs.find(params[:id])
      dino.update!(quarantined: !dino.quarantined)
      render json: GameSerializer.dinosaur(dino.reload)
    end

    private

    def treatment_record(active, now)
      { "at" => now.utc.iso8601, "action" => "treated", "diseases" => active.map(&:kind) }
    end
  end
end
