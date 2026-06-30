module Api
  class ResearchesController < BaseController
    # GET /api/researches
    def index
      render json: GameSerializer.research(current_player)
    end

    # POST /api/researches { tech_key }
    def create
      tech = ResearchCatalog.find(params[:tech_key])
      return render json: { error: "Unknown technology" }, status: :unprocessable_entity unless tech

      error = unlock_error(tech)
      return render json: { error: error }, status: :unprocessable_entity if error

      current_player.transaction do
        current_player.update!(currency: current_player.currency - tech.cost)
        current_player.researches.create!(tech_key: tech.key)
        Event.log(current_player, "research", "Researched #{tech.name}")
      end

      render json: GameSerializer.research(current_player), status: :created
    end

    private

    # Returns a human-readable reason the tech can't be unlocked, or nil if it can.
    def unlock_error(tech)
      unlocked = current_player.researches.pluck(:tech_key)
      return "Already researched" if unlocked.include?(tech.key)

      missing = tech.prerequisites - unlocked
      return "Requires #{missing.join(', ')}" if missing.any?

      population = current_player.dinosaurs.alive.count
      if tech.requires_population.positive? && population < tech.requires_population
        return "Requires #{tech.requires_population} living dinosaurs"
      end

      "Not enough currency" if current_player.currency < tech.cost
    end
  end
end
