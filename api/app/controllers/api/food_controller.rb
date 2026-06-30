module Api
  class FoodController < BaseController
    # POST /api/food { type, quantity }
    def create
      FoodPurchase.call(current_player, type: params[:type], quantity: params[:quantity])
      render json: GameSerializer.player(current_player.reload), status: :created
    rescue FoodPurchase::InsufficientFunds
      render json: { error: "Not enough currency" }, status: :unprocessable_entity
    rescue ArgumentError => e
      render json: { error: e.message }, status: :unprocessable_entity
    end
  end
end
