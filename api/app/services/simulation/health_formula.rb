module Simulation
  # Pure per-day health and happiness model. Grounded in the design spec's
  # factors (age, diet, habitat match, crowding, social structure) but expressed
  # as additive daily deltas so neglect erodes health while good care restores it.
  module HealthFormula
    DIET_DELTA = { "preferred" => 1.5, "acceptable" => 0.0, "wrong" => -6.0 }.freeze
    BASE_DECAY = 0.5

    module_function

    def daily_health_delta(age_months:, diet_quality:, matches_terrain:, overcrowded:, structure:, with_group:, disease_delta: 0.0)
      DIET_DELTA.fetch(diet_quality, 0.0) +
        terrain_delta(matches_terrain) +
        crowding_delta(overcrowded) +
        social_delta(structure, with_group) +
        age_delta(age_months) +
        disease_delta -
        BASE_DECAY
    end

    def happiness(happiness_modifier:, matches_terrain:, overcrowded:, structure:, with_group:)
      base = 60.0 + happiness_modifier
      base += 10.0 if matches_terrain
      base -= 15.0 if overcrowded
      base + social_happiness(structure, with_group)
    end

    def terrain_delta(matches)
      matches ? 0.5 : -0.25
    end

    def crowding_delta(overcrowded)
      overcrowded ? -2.0 : 0.0
    end

    def age_delta(age_months)
      -(age_months / 12.0) * 0.2
    end

    def social_delta(structure, with_group)
      case structure
      when "herd" then with_group ? 0.5 : -2.0
      when "pair" then with_group ? 0.3 : -1.0
      when "solitary" then with_group ? -0.5 : 0.25
      else 0.0
      end
    end

    def social_happiness(structure, with_group)
      case structure
      when "herd" then with_group ? 10.0 : -20.0
      when "pair" then with_group ? 8.0 : -10.0
      when "solitary" then with_group ? -5.0 : 5.0
      else 0.0
      end
    end
  end
end
