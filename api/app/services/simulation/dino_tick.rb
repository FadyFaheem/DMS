module Simulation
  # Advances a single dinosaur's stats from its last tick to `now` using
  # compute-on-read: elapsed real time is converted to game-days and applied
  # one day at a time. No background workers required.
  class DinoTick
    STARVING_AT = 80.0
    READINESS_PER_DAY = 8.0
    # ponytail: cap idle catch-up (~10 game-years); add a scheduled job if a
    # game ever needs to simulate longer absences precisely.
    MAX_CATCHUP_DAYS = 3650
    # Happiness a heat-tolerant dino gains from a volcanic habitat's warmth.
    HEAT_HAPPINESS = 8.0
    # Happiness a herbivore loses sharing open grassland with a carnivore.
    PREDATION_HAPPINESS = -6.0

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
      @active_diseases = @dino.diseases.active.to_a
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
      # Hunger is governed by Simulation::Consumption; DinoTick only reads it.
      base_happiness = HealthFormula.happiness(happiness_modifier: env[:happiness_modifier], **env[:conditions])
      @dino.happiness = clamp(base_happiness * env[:happiness_multiplier] + env[:terrain_happiness])
      @dino.reproduction_readiness = readiness_after
      maybe_contract_disease(env)
      delta = HealthFormula.daily_health_delta(
        age_months: @dino.age_months(@now),
        diet_quality: effective_diet_quality,
        disease_delta: disease_delta,
        temperature_delta: temperature_delta(env),
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
        happiness_multiplier: habitat ? habitat_effect_multiplier(habitat) : 1.0,
        terrain: habitat&.terrain,
        crowded: habitat&.crowded? || false,
        temperature: habitat&.effective_temperature,
        terrain_happiness: habitat ? terrain_happiness(habitat) : 0.0,
        conditions: {
          matches_terrain: habitat.present? && @dino.preferred_terrain == habitat.terrain,
          overcrowded: habitat&.overcrowded? || false,
          structure: @dino.social_structure,
          with_group: living > 1
        }
      }
    end

    def temperature_delta(env)
      HealthFormula.temperature_delta(
        temperature: env[:temperature], min: @dino.temperature_min, max: @dino.temperature_max
      )
    end

    # Terrain "special features" that nudge happiness: volcanic warmth pleases
    # heat-tolerant dinos, while open grassland unsettles herbivores that share
    # it with a carnivore.
    def terrain_happiness(habitat)
      case habitat.terrain_feature
      when :heat then heat_tolerant?(habitat) ? HEAT_HAPPINESS : 0.0
      when :predation then predation_happiness(habitat)
      else 0.0
      end
    end

    def heat_tolerant?(habitat)
      temp = habitat.effective_temperature
      @dino.temperature_max.present? && temp.present? && @dino.temperature_max >= temp
    end

    def predation_happiness(habitat)
      return 0.0 unless @dino.legacy_category == "herbivore"

      # ponytail: one query per grassland herbivore; fine for small parks.
      carnivore = habitat.dinosaurs.alive.where(diet_primary: "meat").where.not(id: @dino.id).exists?
      carnivore ? PREDATION_HAPPINESS : 0.0
    end

    # Product of any active habitat-scoped event multipliers (e.g. a heat spike
    # makes the habitat less pleasant). 1.0 when the habitat is unaffected.
    # ponytail: one query per dino; fine for small parks, batch if parks grow.
    def habitat_effect_multiplier(habitat)
      habitat.active_effects.active(@now).pluck(:multiplier).inject(1.0, :*)
    end

    # Rule-based onset: crowding (>80% capacity) drives wetland scale rot,
    # volcanic heat stress, and parasites in already-weak dinos. Quarantine
    # exempts a dino. (Malnutrition is contracted by Simulation::Consumption.)
    def maybe_contract_disease(env)
      return if @dino.quarantined || !env[:crowded]

      contract("scale_rot") if env[:terrain] == "wetland" && @dino.legacy_category == "herbivore"
      contract("heat_stress") if env[:terrain] == "volcanic"
      contract("parasites") if @dino.health < 30
    end

    def contract(kind)
      return if @active_diseases.any? { |d| d.kind == kind }

      @active_diseases << @dino.diseases.create!(kind: kind, started_at: @now)
      Event.log(@dino.player, "disease", "#{@dino.name} contracted #{DiseaseCatalog.find(kind).name}", now: @now)
    end

    def disease_delta
      @active_diseases.sum { |d| DiseaseCatalog.find(d.kind)&.daily_health || 0.0 }
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
