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

    # POST /api/habitats/:id/upgrade
    def upgrade
      habitat = current_player.habitats.find_by(id: params[:id])
      return render json: { error: "Habitat not found" }, status: :not_found unless habitat
      unless current_player.researches.exists?(tech_key: "habitat_expansion")
        return render json: { error: "Requires habitat_expansion" }, status: :unprocessable_entity
      end

      cost = Economy.habitat_upgrade_cost(habitat.level)
      if current_player.currency < cost
        return render json: { error: "Not enough currency" }, status: :unprocessable_entity
      end

      current_player.transaction do
        current_player.update!(currency: current_player.currency - cost)
        habitat.update!(level: habitat.level + 1, capacity: habitat.capacity + Economy::HABITAT_CAPACITY_STEP)
        Event.log(current_player, "upgrade", "Upgraded #{habitat.name} to level #{habitat.level}")
      end

      render json: GameSerializer.habitat(habitat, habitat.living_count)
    end

    private

    def build_habitat(terrain, cost)
      current_player.transaction do
        current_player.update!(currency: current_player.currency - cost)
        habitat = current_player.habitats.create!(
          name: params[:name].to_s.strip.presence || "#{terrain.capitalize} Habitat",
          terrain: terrain,
          capacity: DEFAULT_CAPACITY.fetch(terrain, 6),
          happiness_modifier: 5
        )
        Event.log(current_player, "build", "Built #{habitat.name}")
        habitat
      end
    end
  end
end
