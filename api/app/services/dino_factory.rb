# Builds attribute hashes for new dinosaurs from a Species entry.
module DinoFactory
  COLORS = %w[emerald amber slate crimson teal ochre violet sand].freeze
  # How far above/below its terrain's climate a dino stays comfortable.
  TEMPERATURE_TOLERANCE = 8
  # Starter genetics quality (IV) by species rarity; rarer stock breeds better.
  STARTER_QUALITY = { common: 48, uncommon: 58, rare: 70 }.freeze

  module_function

  def attributes_for(species, player:, habitat:, now: Time.current, generation: 1)
    min_temp, max_temp = temperature_range(species)
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
      genetics_quality: starter_quality(species),
      temperature_min: min_temp,
      temperature_max: max_temp,
      diet_restrictions: [],
      alive: true
    }
  end

  # Comfortable climate band for a species, centred on its preferred terrain's
  # temperature. Used for both starters and bred offspring.
  def temperature_range(species)
    base = TerrainCatalog.find(species.preferred_terrain)&.temperature || 22
    [ base - TEMPERATURE_TOLERANCE, base + TEMPERATURE_TOLERANCE ]
  end

  def starter_quality(species)
    STARTER_QUALITY.fetch(species.rarity, 50) + rand(0..6)
  end
end
