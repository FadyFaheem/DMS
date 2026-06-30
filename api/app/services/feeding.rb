# Feeds a dinosaur: consumes a player's food, resets hunger, and records the
# diet quality (preferred/acceptable/wrong) that drives the health simulation.
class Feeding
  class InsufficientFood < StandardError; end

  UNITS_PER_FEED = 10

  def self.call(dino, diet:, now: Time.current)
    new(dino, diet, now).call
  end

  def initialize(dino, diet, now)
    @dino = dino
    @diet = diet.to_s
    @now = now
    @player = dino.player
  end

  def call
    raise ArgumentError, "Unknown food type: #{@diet}" unless column
    raise ArgumentError, "#{@dino.name} is allergic to #{@diet}" if allergic?
    raise InsufficientFood unless @player.public_send(column) >= UNITS_PER_FEED

    @player.decrement!(column, UNITS_PER_FEED)
    @dino.update!(hunger: 0.0, last_diet_quality: quality, last_fed_at: @now)
    @dino
  end

  private

  def column
    Player::FOOD_COLUMN[@diet]
  end

  def allergic?
    Array(@dino.diet_restrictions).include?(@diet)
  end

  def quality
    return "preferred" if @diet == @dino.diet_primary
    return "acceptable" if @diet == @dino.diet_secondary

    "wrong"
  end
end
