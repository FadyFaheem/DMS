module Api
  class PlayersController < BaseController
    skip_before_action :require_player, only: :create

    # POST /api/players -- create a player and seed their starter park.
    def create
      player = Player.create!(
        player_code: PlayerCode.generate_unique,
        display_name: params[:display_name].to_s.strip.presence || "New Keeper"
      )
      Park::Seeder.new(player).seed_starter!
      render json: GameSerializer.player(player.reload), status: :created
    end

    # GET /api/players/me -- current player with ticked habitats and dinos.
    def me
      render json: GameSerializer.player(current_player)
    end
  end
end
