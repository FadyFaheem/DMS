# Plain serialization for the game API. Datetimes are emitted as UTC ISO-8601
# with a trailing Z so the frontend can parse them consistently.
module GameSerializer
  module_function

  def player(player)
    dinos = player.dinosaurs.order(:id).to_a
    living_by_habitat = dinos.select(&:alive).group_by(&:habitat_id).transform_values(&:size)

    {
      id: player.id,
      player_code: player.player_code,
      display_name: player.display_name,
      currency: player.currency,
      food: { plants: player.food_plants, meat: player.food_meat, fish: player.food_fish },
      habitats: player.habitats.order(:id).map { |h| habitat(h, living_by_habitat[h.id] || 0) },
      dinosaurs: dinos.map { |d| dinosaur(d) },
      created_at: iso(player.created_at),
      updated_at: iso(player.updated_at)
    }
  end

  def habitat(habitat, living_count)
    {
      id: habitat.id,
      name: habitat.name,
      terrain: habitat.terrain,
      capacity: habitat.capacity,
      happiness_modifier: habitat.happiness_modifier,
      living_count: living_count
    }
  end

  def dinosaur(dino)
    {
      id: dino.id,
      name: dino.name,
      species: dino.species,
      period: dino.period,
      gender: dino.gender,
      color: dino.color,
      size_lbs: dino.size_lbs,
      generation: dino.generation,
      habitat_id: dino.habitat_id,
      diet_primary: dino.diet_primary,
      diet_secondary: dino.diet_secondary,
      preferred_terrain: dino.preferred_terrain,
      social_structure: dino.social_structure,
      health: dino.health.round(1),
      hunger: dino.hunger.round(1),
      happiness: dino.happiness.round(1),
      reproduction_readiness: dino.reproduction_readiness.round(1),
      status: dino.status,
      alive: dino.alive,
      mutations: dino.mutation_traits,
      parent_a_id: dino.parent_a_id,
      parent_b_id: dino.parent_b_id,
      born_at: iso(dino.born_at),
      created_at: iso(dino.created_at),
      updated_at: iso(dino.updated_at)
    }
  end

  def iso(time)
    time&.utc&.iso8601
  end
end
