module Simulation
  # Compute-on-read daily feeding: each living dino eats a size-based ration from
  # its primary-diet food store once per game-day. Days the park could feed a dino
  # reduce its hunger; days it ran short raise hunger and mark the diet "wrong"
  # (which DinoTick turns into health loss). Owns hunger; DinoTick no longer
  # raises it, and manual Feeding remains an instant top-up.
  class Consumption
    # One food unit/day per this many pounds of body mass (min one unit).
    # ponytail: linear in size only; refine with activity/metabolism per species later.
    RATION_DIVISOR = 2000.0
    MIN_RATION = 1
    SATIATION_PER_DAY = 20.0
    HUNGER_PER_DAY = 12.0
    MALNUTRITION_DAYS = 3
    MAX_CATCHUP_DAYS = 3650
    # Diets that can graze a habitat's local plant stockpile before drawing from
    # the player's global stores.
    GRAZERS = %w[plants insects].freeze
    # Extra plant food burned per game-day for each dino a habitat holds over its
    # capacity. ponytail: abstracted overgrazing against the global plant store;
    # per-habitat stockpiles (and diet-aware grazing) arrive in 3D.
    OVERPOP_PLANT_DRAIN_PER_DINO = 4

    def self.call(player, now: Time.current)
      new(player, now).call
    end

    def initialize(player, now)
      @player = player
      @now = now
    end

    def call
      since = @player.last_consumed_at || @player.created_at
      days = GameClock.game_days_between(since, @now).floor
      return { days: 0, short: 0 } if days <= 0

      days = [ days, MAX_CATCHUP_DAYS ].min
      dinos = @player.dinosaurs.alive.to_a
      stores = current_stores
      habitats = @player.habitats.index_by(&:id)
      overgraze = overpopulation_plant_drain
      unfed = Hash.new(0)
      last_day_fed = {}

      days.times do
        feed_one_day(dinos, stores, habitats, unfed, last_day_fed)
        stores[:food_plants] = [ stores[:food_plants] - overgraze, 0 ].max
      end

      persist_stores(stores, since, days)
      persist_stockpiles(habitats)
      dinos.each { |dino| apply_effects(dino, days, unfed[dino.id], last_day_fed[dino.id]) }
      { days: days, short: unfed.values.count(&:positive?) }
    end

    private

    def feed_one_day(dinos, stores, habitats, unfed, last_day_fed)
      dinos.each do |dino|
        ration = ration_for(dino)
        column = Player::FOOD_COLUMN[dino.diet_primary]
        if graze_stockpile(dino, ration, habitats)
          last_day_fed[dino.id] = true
        elsif column && stores[column] >= ration
          stores[column] -= ration
          last_day_fed[dino.id] = true
        else
          unfed[dino.id] += 1
          last_day_fed[dino.id] = false
        end
      end
    end

    # Herbivores graze a habitat's local plant stockpile first; only when the
    # stockpile can't cover the full ration do they fall back to global stores.
    # Returns true when the ration was satisfied from the stockpile.
    def graze_stockpile(dino, ration, habitats)
      return false unless GRAZERS.include?(dino.diet_primary)

      habitat = habitats[dino.habitat_id]
      return false unless habitat && habitat.food_stockpile >= ration

      habitat.food_stockpile -= ration
      true
    end

    def ration_for(dino)
      [ (dino.size_lbs / RATION_DIVISOR).ceil, MIN_RATION ].max
    end

    def current_stores
      { food_plants: @player.food_plants, food_meat: @player.food_meat, food_fish: @player.food_fish }
    end

    # Overcrowded habitats overgraze: each dino over a habitat's capacity burns
    # extra plant food per game-day, so unchecked overpopulation starves the park.
    def overpopulation_plant_drain
      over = @player.habitats.sum { |habitat| [ habitat.living_count - habitat.capacity, 0 ].max }
      over * OVERPOP_PLANT_DRAIN_PER_DINO
    end

    def persist_stores(stores, since, days)
      @player.update!(
        food_plants: stores[:food_plants],
        food_meat: stores[:food_meat],
        food_fish: stores[:food_fish],
        last_consumed_at: since + GameClock.real_seconds_for_game_days(days)
      )
    end

    def persist_stockpiles(habitats)
      habitats.each_value { |habitat| habitat.save! if habitat.changed? }
    end

    def apply_effects(dino, days, unfed_days, fed_last_day)
      fed_days = days - unfed_days
      hunger = dino.hunger + (unfed_days * HUNGER_PER_DAY) - (fed_days * SATIATION_PER_DAY)
      dino.hunger = hunger.clamp(0.0, 100.0)
      dino.last_diet_quality = fed_last_day ? "preferred" : "wrong"
      dino.save! if dino.changed?
      update_malnutrition(dino, unfed_days, fed_last_day)
    end

    # Prolonged starvation inflicts malnutrition; feeding the dino again clears it
    # (other diseases require the veterinary lab).
    def update_malnutrition(dino, unfed_days, fed_last_day)
      active = dino.diseases.active.find_by(kind: "malnutrition")
      if unfed_days >= MALNUTRITION_DAYS && active.nil?
        dino.diseases.create!(kind: "malnutrition", started_at: @now)
      elsif fed_last_day && active
        active.update!(cured_at: @now)
      end
    end
  end
end
