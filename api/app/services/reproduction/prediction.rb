# Probabilistic preview of what a pairing would produce, without side effects.
# Powers the breeding modal's trait/cost preview (Phase 3D). Mirrors the rules
# Hatch applies (species 50/50 from each parent, mutation odds boosted by
# research, genetics quality from parent average) so the preview matches reality.
module Reproduction
  module Prediction
    module_function

    def call(parent_a, parent_b, player)
      reason = Compatibility.reason(parent_a, parent_b)
      {
        compatible: reason.nil?,
        reason: reason,
        cost: Economy::BREEDING_COST,
        expected_generation: [ parent_a.generation, parent_b.generation ].max + 1,
        species_options: species_options(parent_a, parent_b),
        diet_options: [ parent_a.diet_primary, parent_b.diet_primary ].uniq,
        mutation_chance: mutation_chance(player),
        possible_traits: Genetics::MUTATIONS,
        genetics_quality: quality_range(parent_a, parent_b)
      }
    end

    # Each parent's species is equally likely; identical species collapse to one
    # option at 100%.
    def species_options(parent_a, parent_b)
      [ parent_a.species, parent_b.species ].tally.map do |key, count|
        { key: key, name: Species.find(key)&.name, chance: (count / 2.0).round(2) }
      end
    end

    def mutation_chance(player)
      if player.researches.exists?(tech_key: "mutation_rate_boost")
        Genetics::BOOSTED_MUTATION_CHANCE
      else
        Genetics::MUTATION_CHANCE
      end
    end

    # Best/worst/expected offspring IV: the parents' average, give or take the
    # random variation, with the best mutation bonus available at the top end.
    def quality_range(parent_a, parent_b)
      base = (parent_a.genetics_quality.to_i + parent_b.genetics_quality.to_i) / 2.0
      best_bonus = Genetics::QUALITY_BONUS.values.max
      {
        min: (base - Genetics::QUALITY_VARIATION).round.clamp(0, 100),
        expected: base.round.clamp(0, 100),
        max: (base + Genetics::QUALITY_VARIATION + best_bonus).round.clamp(0, 100)
      }
    end
  end
end
