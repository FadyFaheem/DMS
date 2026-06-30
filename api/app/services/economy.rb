# Currency rules: passive park income (compute-on-read) plus action costs.
module Economy
  INCOME_PER_DINO_PER_DAY = 25
  BREEDING_COST = 800
  FOOD_COST_PER_UNIT = 2
  HABITAT_COST = {
    "forest" => 5_000,
    "grassland" => 4_000,
    "wetland" => 6_000,
    "volcanic" => 8_000,
    "aquatic" => 7_000
  }.freeze
  DEFAULT_HABITAT_COST = 5_000
  FOOD_PRODUCTION_UPGRADE_BASE = 1_500
  HABITAT_UPGRADE_BASE = 2_000
  HABITAT_CAPACITY_STEP = 3

  module_function

  # Cost to raise a food-production building from `level` to `level + 1`.
  def food_production_upgrade_cost(level)
    FOOD_PRODUCTION_UPGRADE_BASE * level
  end

  # Cost to raise a habitat from `level` to `level + 1`.
  def habitat_upgrade_cost(level)
    HABITAT_UPGRADE_BASE * level
  end

  def passive_income(player, now: Time.current)
    since = player.last_income_at || player.created_at
    days = GameClock.game_days_between(since, now).floor
    return 0 if days <= 0

    living = player.dinosaurs.alive.count
    amount = days * living * INCOME_PER_DINO_PER_DAY
    player.update!(currency: player.currency + amount, last_income_at: now)
    amount
  end

  def habitat_cost(terrain)
    HABITAT_COST.fetch(terrain, DEFAULT_HABITAT_COST)
  end
end
