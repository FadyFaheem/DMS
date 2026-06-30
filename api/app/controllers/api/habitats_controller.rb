module Api
  class HabitatsController < BaseController
    BUILDABLE_TERRAINS = %w[forest grassland wetland volcanic aquatic].freeze
    DEFAULT_CAPACITY = {
      "forest" => 6, "grassland" => 8, "wetland" => 5, "volcanic" => 4, "aquatic" => 3
    }.freeze

    # GET /api/habitats
    def index
      render json: current_player.habitats.order(:id).map { |h| GameSerializer.habitat(h, h.living_count) }
    end

    # POST /api/habitats { terrain, name }
    def create
      terrain = params[:terrain].to_s
      return render json: { error: "Unknown terrain" }, status: :unprocessable_entity unless BUILDABLE_TERRAINS.include?(terrain)

      cost = Economy.habitat_cost(terrain)
      return render json: { error: "Not enough currency" }, status: :unprocessable_entity if current_player.currency < cost

      habitat = build_habitat(terrain, cost)
      render json: GameSerializer.habitat(habitat, 0), status: :created
    end

    private

    def build_habitat(terrain, cost)
      current_player.transaction do
        current_player.update!(currency: current_player.currency - cost)
        current_player.habitats.create!(
          name: params[:name].to_s.strip.presence || "#{terrain.capitalize} Habitat",
          terrain: terrain,
          capacity: DEFAULT_CAPACITY.fetch(terrain, 6),
          happiness_modifier: 5
        )
      end
    end
  end
end
