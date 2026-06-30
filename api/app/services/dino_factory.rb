# Builds attribute hashes for new dinosaurs from a Species entry.
module DinoFactory
  COLORS = %w[emerald amber slate crimson teal ochre violet sand].freeze

  module_function

  def attributes_for(species, player:, habitat:, now: Time.current, generation: 1)
    {
      player: player,
      habitat: habitat,
      species: species.key,
      period: species.period,
      name: "#{species.name} ##{rand(100..999)}",
      gender: Dinosaur::GENDERS.sample,
      color: COLORS.sample,
      size_lbs: species.base_size_lbs,
      born_at: now,
      generation: generation,
      diet_primary: species.diet_primary,
      diet_secondary: species.diet_secondary,
      preferred_terrain: species.preferred_terrain,
      social_structure: species.social_structure,
      health: 100.0,
      hunger: 20.0,
      happiness: 70.0,
      reproduction_readiness: 0.0,
      stats_updated_at: now,
      mutation_traits: [],
      alive: true
    }
  end
end
