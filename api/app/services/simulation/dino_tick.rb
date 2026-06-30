module Simulation
  # Advances a single dinosaur's stats from its last tick to `now` using
  # compute-on-read: elapsed real time is converted to game-days and applied
  # one day at a time. No background workers required.
  class DinoTick
    HUNGER_PER_DAY = 12.0
    STARVING_AT = 80.0
    READINESS_PER_DAY = 8.0
    # ponytail: cap idle catch-up (~10 game-years); add a scheduled job if a
    # game ever needs to simulate longer absences precisely.
    MAX_CATCHUP_DAYS = 3650

    def self.call(dino, now: Time.current)
      new(dino, now:).call
    end

    def initialize(dino, now: Time.current)
      @dino = dino
      @now = now
    end

    def call
      return @dino unless @dino.alive

      days = GameClock.game_days_between(@dino.stats_updated_at, @now).floor
      return @dino if days <= 0

      env = environment
      [ days, MAX_CATCHUP_DAYS ].min.times do
        break unless @dino.alive

        advance_day(env)
      end

      @dino.stats_updated_at = @now
      @dino.save! if @dino.changed?
      @dino
    end

    private

    def advance_day(env)
      @dino.hunger = clamp(@dino.hunger + HUNGER_PER_DAY)
      @dino.happiness = clamp(HealthFormula.happiness(happiness_modifier: env[:happiness_modifier], **env[:conditions]))
      @dino.reproduction_readiness = readiness_after
      delta = HealthFormula.daily_health_delta(
        age_months: @dino.age_months(@now),
        diet_quality: effective_diet_quality,
        **env[:conditions]
      )
      @dino.health = clamp(@dino.health + delta)
      kill! if @dino.health <= 0
    end

    def environment
      habitat = @dino.habitat
      living = habitat ? habitat.living_count : 0
      {
        happiness_modifier: habitat&.happiness_modifier.to_i,
        conditions: {
          matches_terrain: habitat.present? && @dino.preferred_terrain == habitat.terrain,
          overcrowded: habitat&.overcrowded? || false,
          structure: @dino.social_structure,
          with_group: living > 1
        }
      }
    end

    def effective_diet_quality
      return "wrong" if starving?

      @dino.last_diet_quality || "acceptable"
    end

    def starving?
      @dino.hunger >= STARVING_AT
    end

    def readiness_after
      gain = @dino.happiness >= 50 && !starving? ? READINESS_PER_DAY : 0.0
      clamp(@dino.reproduction_readiness + gain)
    end

    def kill!
      @dino.alive = false
      @dino.health = 0.0
      Event.log(@dino.player, "death", "#{@dino.name} died", now: @now)
    end

    def clamp(value)
      value.clamp(0.0, 100.0)
    end
  end
end
