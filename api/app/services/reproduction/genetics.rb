# Pure-ish genetics helpers (RNG injected for deterministic tests).
module Reproduction
  module Genetics
    MUTATIONS = %w[shiny giant dwarf].freeze
    MUTATION_CHANCE = 0.08
    # Odds when the player has researched mutation_rate_boost (wired in Hatch).
    BOOSTED_MUTATION_CHANCE = 0.30
    DIET_INHERIT_CHANCE = 0.8
    GIANT_FACTOR = 1.2
    DWARF_FACTOR = 0.8
    # Genetics-quality (IV, 0-100) bonus a mutation adds on top of the parents'
    # average; stacking good genes across generations is how a park reaches the
    # "perfect IV" (>= 95) achievement.
    QUALITY_BONUS = { "shiny" => 12, "giant" => 6, "dwarf" => 4 }.freeze
    QUALITY_VARIATION = 4
    # Per-hatch odds of a brand-new food allergy appearing in the offspring.
    ALLERGY_CHANCE = 0.05

    module_function

    # Offspring genetics quality: the parents' average, nudged by a small random
    # variation and any mutation bonuses, clamped to 0-100.
    def genetics_quality(quality_a, quality_b, mutations, rng = Random.new)
      base = (quality_a.to_i + quality_b.to_i) / 2.0
      bonus = mutations.sum { |m| QUALITY_BONUS.fetch(m, 0) }
      variation = rng.rand(-QUALITY_VARIATION..QUALITY_VARIATION)
      (base + bonus + variation).round.clamp(0, 100)
    end

    # Food allergies are heritable (union of both parents) plus a rare new one;
    # a dino is never allergic to its own primary diet.
    def inherit_restrictions(parent_a, parent_b, primary_diet, rng = Random.new, chance: ALLERGY_CHANCE)
      inherited = Array(parent_a.diet_restrictions) | Array(parent_b.diet_restrictions)
      inherited << (Dinosaur::DIETS - [ primary_diet ]).sample(random: rng) if rng.rand < chance
      inherited.uniq - [ primary_diet ]
    end

    def roll_mutations(rng = Random.new, chance: MUTATION_CHANCE)
      return [] if rng.rand >= chance

      [ MUTATIONS.sample(random: rng) ]
    end

    def size_with_mutations(base_size, mutations)
      size = base_size
      size = (size * GIANT_FACTOR).round if mutations.include?("giant")
      size = (size * DWARF_FACTOR).round if mutations.include?("dwarf")
      size
    end

    def inherit_diet(parent_a, parent_b, rng = Random.new)
      if rng.rand < DIET_INHERIT_CHANCE
        [ parent_a.diet_primary, parent_b.diet_primary ].sample(random: rng)
      else
        Dinosaur::DIETS.sample(random: rng) # rare new-diet mutation
      end
    end

    def inherit_color(parent_a, parent_b, mutations, rng = Random.new)
      return "iridescent" if mutations.include?("shiny")

      [ parent_a.color, parent_b.color ].compact.sample(random: rng) || DinoFactory::COLORS.sample(random: rng)
    end
  end
end
