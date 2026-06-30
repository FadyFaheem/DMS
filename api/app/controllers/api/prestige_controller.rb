module Api
  class PrestigeController < BaseController
    # POST /api/prestige -- reset the park for New Game+, keeping a permanent
    # income bonus. Ticks first so a just-met win condition is recognised.
    def create
      Simulation::ParkTick.call(current_player)
      Prestige::Reset.call(current_player.reload)
      render json: GameSerializer.player(current_player.reload), status: :created
    rescue Prestige::Reset::Error => e
      render json: { error: e.message }, status: :unprocessable_entity
    end
  end
end
