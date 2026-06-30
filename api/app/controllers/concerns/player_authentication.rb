# Resolves the current player from a bearer "player code". Low-security by
# design (it's a game): the code is the only credential.
module PlayerAuthentication
  extend ActiveSupport::Concern

  included do
    before_action :require_player
  end

  private

  def require_player
    @current_player = Player.find_by(player_code: bearer_code)
    return if @current_player

    render json: { error: "Invalid or missing player code" }, status: :unauthorized
  end

  def bearer_code
    header = request.headers["Authorization"].to_s
    return nil unless header.start_with?("Bearer ")

    header.delete_prefix("Bearer ").strip.presence
  end

  attr_reader :current_player
end
