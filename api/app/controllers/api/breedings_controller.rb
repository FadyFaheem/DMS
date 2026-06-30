module Api
  class BreedingsController < BaseController
    INCUBATION_GAME_DAYS = 2
    # A built hatchery shortens incubation to this many game-days.
    HATCHERY_INCUBATION_GAME_DAYS = 1

    rescue_from ActiveRecord::RecordNotFound do
      render json: { error: "Dinosaur or breeding not found" }, status: :not_found
    end

    # GET /api/breedings
    def index
      render json: current_player.breedings.order(created_at: :desc).map { |b| breeding_json(b) }
    end

    # GET /api/breedings/preview?parent_a_id=&parent_b_id= -- probabilistic
    # offspring preview (species/traits/quality/cost) with no side effects.
    def preview
      parent_a = current_player.dinosaurs.find(params[:parent_a_id])
      parent_b = current_player.dinosaurs.find(params[:parent_b_id])
      render json: Reproduction::Prediction.call(parent_a, parent_b, current_player)
    end

    # POST /api/breedings { parent_a_id, parent_b_id }
    def create
      parent_a = current_player.dinosaurs.find(params[:parent_a_id])
      parent_b = current_player.dinosaurs.find(params[:parent_b_id])
      Simulation::DinoTick.call(parent_a)
      Simulation::DinoTick.call(parent_b)

      reason = Reproduction::Compatibility.reason(parent_a, parent_b)
      return render json: { error: reason }, status: :unprocessable_entity if reason
      return render json: { error: "Not enough currency" }, status: :unprocessable_entity if current_player.currency < Economy::BREEDING_COST

      trait, trait_error = requested_trait
      return render json: { error: trait_error }, status: :unprocessable_entity if trait_error

      breeding = start_breeding(parent_a, parent_b, trait)
      render json: breeding_json(breeding), status: :created
    end

    # POST /api/breedings/:id/claim
    def claim
      breeding = current_player.breedings.find(params[:id])
      return render json: { error: "This breeding was already claimed" }, status: :unprocessable_entity unless breeding.status == "incubating"
      return render json: { error: "Still incubating" }, status: :unprocessable_entity unless breeding.ready?

      offspring = Reproduction::Hatch.call(breeding)
      render json: GameSerializer.dinosaur(offspring), status: :created
    end

    private

    # Resolve an optional requested offspring trait. Returns [trait, error]:
    # selecting a trait requires the genetic engineering lab and a valid mutation.
    def requested_trait
      trait = params[:requested_trait].presence
      return [ nil, nil ] if trait.nil?

      unless current_player.researches.exists?(tech_key: "genetic_engineering_lab")
        return [ nil, "Requires genetic_engineering_lab" ]
      end
      return [ nil, "Unknown trait" ] unless Reproduction::Genetics::MUTATIONS.include?(trait)

      [ trait, nil ]
    end

    def start_breeding(parent_a, parent_b, requested_trait)
      current_player.transaction do
        current_player.update!(currency: current_player.currency - Economy::BREEDING_COST)
        current_player.breedings.create!(
          parent_a: parent_a,
          parent_b: parent_b,
          hatches_at: Time.current + GameClock.real_seconds_for_game_days(incubation_game_days),
          status: "incubating",
          requested_trait: requested_trait
        )
      end
    end

    def incubation_game_days
      current_player.structure?("hatchery") ? HATCHERY_INCUBATION_GAME_DAYS : INCUBATION_GAME_DAYS
    end

    def breeding_json(breeding)
      {
        id: breeding.id,
        status: breeding.status,
        parent_a_id: breeding.parent_a_id,
        parent_b_id: breeding.parent_b_id,
        offspring_id: breeding.offspring_id,
        requested_trait: breeding.requested_trait,
        hatches_at: breeding.hatches_at.utc.iso8601,
        ready: breeding.ready?,
        created_at: breeding.created_at.utc.iso8601
      }
    end
  end
end
