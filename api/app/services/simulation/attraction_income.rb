module Simulation
  # Compute-on-read passive income: each built attraction earns
  # income_per_day * level for every whole elapsed game-day, credited to the
  # player's currency. Only whole game-days are paid, and exactly those days are
  # added back to last_collected_at so sub-day remainders carry over (mirrors
  # FoodCollection's watermark, no silent loss).
  class AttractionIncome
    def self.call(player, now: Time.current)
      new(player, now).call
    end

    def initialize(player, now)
      @player = player
      @now = now
    end

    def call
      total = 0
      @player.attractions.find_each { |attraction| total += accrue(attraction) }
      @player.update!(currency: @player.currency + total) if total.positive?
      total
    end

    private

    def accrue(attraction)
      spec = AttractionCatalog.find(attraction.kind)
      return 0 unless spec

      since = attraction.last_collected_at || attraction.created_at
      days = GameClock.game_days_between(since, @now).floor
      return 0 if days <= 0

      attraction.update!(last_collected_at: since + GameClock.real_seconds_for_game_days(days))
      (spec.income_per_day * attraction.level * days * @player.income_multiplier).floor
    end
  end
end
