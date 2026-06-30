module Simulation
  # Compute-on-read food production: each building accrues
  # base_output_per_day * level * elapsed-game-days into its matching food store.
  # Only whole game-days are paid out, and exactly those days are added back to
  # last_collected_at so sub-day remainders carry to the next read (no silent loss).
  #
  # Phase 3B adds two pressures: active production/environmental effects scale a
  # building's output by their multiplier, and prey-limited farms (hunting
  # grounds / fishing ponds) can only harvest what their prey pool holds. The
  # pool depletes as it is hunted and regrows each game-day; an emptied pool
  # (overhunting) crashes output until it recovers.
  class FoodCollection
    def self.call(player, now: Time.current)
      new(player, now).call
    end

    def initialize(player, now)
      @player = player
      @now = now
    end

    def call
      gains = Hash.new(0)
      @player.food_productions.find_each do |building|
        column, amount = accrue(building)
        gains[column] += amount if amount.positive?
      end
      apply(gains)
      gains
    end

    private

    def accrue(building)
      spec = FoodProductionCatalog.find(building.kind)
      return [ nil, 0 ] unless spec

      since = building.last_collected_at || building.created_at
      days = GameClock.game_days_between(since, @now).floor
      return [ spec.food_column, 0 ] if days <= 0

      per_day = spec.base_output_per_day * building.level
      raw = building.prey? ? harvest_prey(building, spec, per_day, days) : per_day * days
      output = (raw * effect_multiplier(building)).floor

      building.update!(
        prey_population: building.prey_population,
        last_collected_at: since + GameClock.real_seconds_for_game_days(days)
      )
      [ spec.food_column, output ]
    end

    # Harvest-first, then regrow, capped at the pool's capacity. Mutates the
    # building's in-memory prey_population (persisted by the caller).
    def harvest_prey(building, spec, per_day, days)
      pop = building.prey_population
      cap = building.prey_capacity
      total = 0
      days.times do
        caught = [ per_day, pop ].min
        pop -= caught
        pop = [ pop + spec.prey_regrow_per_day, cap ].min
        total += caught
      end
      building.prey_population = pop
      total
    end

    # Product of any active food-production-scoped effect multipliers (pest,
    # algae, drought, flood). 1.0 when the farm is unaffected.
    def effect_multiplier(building)
      building.active_effects.active(@now).pluck(:multiplier).inject(1.0, :*)
    end

    def apply(gains)
      return if gains.empty?

      attrs = gains.each_with_object({}) do |(column, amount), acc|
        acc[column] = @player.public_send(column) + amount
      end
      @player.update!(attrs)
    end
  end
end
