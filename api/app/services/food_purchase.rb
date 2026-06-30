# Buys food units of a given type, debiting the player's currency.
class FoodPurchase
  class InsufficientFunds < StandardError; end

  BUYABLE = { "plants" => :food_plants, "meat" => :food_meat, "fish" => :food_fish }.freeze

  def self.call(player, type:, quantity:)
    new(player, type, quantity).call
  end

  def initialize(player, type, quantity)
    @player = player
    @type = type.to_s
    @quantity = quantity.to_i
  end

  def call
    column = BUYABLE[@type]
    raise ArgumentError, "Unknown food type: #{@type}" unless column
    raise ArgumentError, "Quantity must be positive" unless @quantity.positive?

    cost = @quantity * Economy::FOOD_COST_PER_UNIT
    raise InsufficientFunds if @player.currency < cost

    @player.update!(
      currency: @player.currency - cost,
      column => @player.public_send(column) + @quantity
    )
    @player
  end
end
