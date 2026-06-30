# Plain serialization for the game API. Datetimes are emitted as UTC ISO-8601
# with a trailing Z so the frontend can parse them consistently.
module GameSerializer
  module_function

  def player(player)
    dinos = player.dinosaurs.order(:id).to_a
    living = dinos.select(&:alive)
    living_by_habitat = living.group_by(&:habitat_id).transform_values(&:size)

    {
      id: player.id,
      player_code: player.player_code,
      display_name: player.display_name,
      currency: player.currency,
      food: { plants: player.food_plants, meat: player.food_meat, fish: player.food_fish },
      habitats: player.habitats.order(:id).map { |h| habitat(h, living_by_habitat[h.id] || 0) },
      dinosaurs: dinos.map { |d| dinosaur(d) },
      summary: summary(living),
      research: research(player),
      food_productions: food_productions(player),
      events: events(player),
      created_at: iso(player.created_at),
      updated_at: iso(player.updated_at)
    }
  end

  # Most recent park activity (births, deaths, research, builds, upgrades).
  def events(player, limit = 20)
    player.events.recent(limit).map do |event|
      { id: event.id, kind: event.kind, message: event.message, created_at: iso(event.created_at) }
    end
  end

  # Research tree: every tech in the catalog with an `unlocked` flag, plus the
  # flat list of unlocked keys for quick client-side gating.
  def research(player)
    unlocked = player.researches.pluck(:tech_key)
    {
      unlocked: unlocked,
      catalog: ResearchCatalog.all.map do |tech|
        {
          key: tech.key,
          name: tech.name,
          description: tech.description,
          cost: tech.cost,
          prerequisites: tech.prerequisites,
          requires_population: tech.requires_population,
          unlocks: tech.unlocks,
          unlocked: unlocked.include?(tech.key)
        }
      end
    }
  end

  # Dashboard summary; population-by-category is produced by DinoReport.
  def summary(living, now = Time.current)
    rows = living.map do |d|
      { "category" => d.legacy_category, "diet" => d.diet_primary, "age" => d.age_months(now) }
    end

    {
      population: living.size,
      by_category: DinoReport.call(rows)[:summary],
      avg_health: living.empty? ? 0.0 : (living.sum(&:health) / living.size).round(1),
      critical: living.count { |d| d.health < 25 }
    }
  end

  # Food-production buildings: the player's built farms plus the catalog of
  # buildable kinds with an `unlocked` flag derived from researched tech.
  def food_productions(player)
    unlocked = player.researches.pluck(:tech_key)
    {
      buildings: player.food_productions.order(:id).map { |b| food_production(b) },
      catalog: FoodProductionCatalog.all.map do |spec|
        {
          kind: spec.kind,
          name: spec.name,
          food_column: spec.food_column,
          base_output_per_day: spec.base_output_per_day,
          build_cost: spec.build_cost,
          required_tech: spec.required_tech,
          unlocked: unlocked.include?(spec.required_tech)
        }
      end
    }
  end

  def food_production(building)
    spec = FoodProductionCatalog.find(building.kind)
    {
      id: building.id,
      kind: building.kind,
      name: spec&.name,
      level: building.level,
      food_column: spec&.food_column,
      output_per_day: spec ? spec.base_output_per_day * building.level : 0,
      last_collected_at: iso(building.last_collected_at)
    }
  end

  def habitat(habitat, living_count)
    {
      id: habitat.id,
      name: habitat.name,
      terrain: habitat.terrain,
      capacity: habitat.capacity,
      level: habitat.level,
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
