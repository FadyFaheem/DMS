# Plain serialization for the game API. Datetimes are emitted as UTC ISO-8601
# with a trailing Z so the frontend can parse them consistently.
module GameSerializer
  module_function

  def player(player)
    dinos = player.dinosaurs.includes(:diseases).order(:id).to_a
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
      species: species(player),
      food_productions: food_productions(player),
      structures: structures(player),
      attractions: attractions(player),
      active_effects: active_effects(player),
      goals: goals(player),
      prestige: prestige(player),
      events: events(player),
      created_at: iso(player.created_at),
      updated_at: iso(player.updated_at)
    }
  end

  # Goals/achievements with live progress (current vs threshold) and a completed
  # flag, plus a headline completed/total count for the nav.
  def goals(player)
    {
      completed: player.goal_completions.count,
      total: GoalCatalog.all.size,
      catalog: Goals::Evaluation.snapshot(player)
    }
  end

  # Prestige / New Game+ state: current level, the resulting income multiplier,
  # whether the win condition is met, and whether prestige is available.
  def prestige(player)
    {
      level: player.prestige_level,
      multiplier: player.income_multiplier.round(2),
      won: player.won,
      can_prestige: player.won
    }
  end

  # Currently-active environmental/production events, with their target ids so
  # the client can badge the affected habitat or farm.
  def active_effects(player, now = Time.current)
    player.active_effects.active(now).order(:id).map do |effect|
      spec = effect.spec
      {
        id: effect.id,
        kind: effect.kind,
        name: spec&.name,
        scope: spec&.scope,
        multiplier: effect.multiplier,
        habitat_id: effect.habitat_id,
        food_production_id: effect.food_production_id,
        expires_at: iso(effect.expires_at)
      }
    end
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

  # Species catalog with per-player flags: `unlocked` (a starter or previously
  # acquired) and `owned_count` (living specimens). Acquisition gates
  # (acquire_cost / required_tech / requires_population) are surfaced so the
  # client can render lock state, mirroring the research tree.
  def species(player)
    unlocked_keys = player.species_unlocks.pluck(:species_key)
    owned = player.dinosaurs.alive.group_by(&:species).transform_values(&:size)
    {
      periods: Species::PERIODS,
      catalog: Species.all.map do |s|
        {
          key: s.key,
          name: s.name,
          period: s.period,
          diet_primary: s.diet_primary,
          diet_secondary: s.diet_secondary,
          preferred_terrain: s.preferred_terrain,
          social_structure: s.social_structure,
          base_size_lbs: s.base_size_lbs,
          rarity: s.rarity,
          starter: s.starter,
          acquire_cost: s.acquire_cost,
          required_tech: s.required_tech,
          requires_population: s.requires_population,
          unlocked: s.starter || unlocked_keys.include?(s.key),
          owned_count: owned[s.key] || 0
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
      critical: living.count { |d| d.health < 25 },
      sick: living.count { |d| d.diseases.any? { |x| x.cured_at.nil? } }
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

  # Buildable facilities (vet lab now; more in later milestones) with built and
  # unlocked flags.
  def structures(player)
    unlocked = player.researches.pluck(:tech_key)
    built = player.structures.pluck(:kind)
    {
      built: player.structures.order(:id).map do |s|
        { id: s.id, kind: s.kind, name: StructureCatalog.find(s.kind)&.name, level: s.level }
      end,
      catalog: StructureCatalog.all.map do |spec|
        {
          kind: spec.kind,
          name: spec.name,
          cost: spec.cost,
          required_tech: spec.required_tech,
          unlocked: unlocked.include?(spec.required_tech),
          built: built.include?(spec.kind)
        }
      end
    }
  end

  # Theme-park attractions: the player's built attractions (with current
  # income/day) plus the catalog of buildable kinds, gated by the `attractions`
  # research.
  def attractions(player)
    unlocked = player.researches.pluck(:tech_key)
    {
      built: player.attractions.order(:id).map do |a|
        spec = AttractionCatalog.find(a.kind)
        {
          id: a.id,
          kind: a.kind,
          name: spec&.name,
          level: a.level,
          income_per_day: spec ? spec.income_per_day * a.level : 0,
          last_collected_at: iso(a.last_collected_at)
        }
      end,
      catalog: AttractionCatalog.all.map do |spec|
        {
          kind: spec.kind,
          name: spec.name,
          income_per_day: spec.income_per_day,
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
      prey: building.prey?,
      prey_population: building.prey_population,
      prey_capacity: building.prey_capacity,
      last_collected_at: iso(building.last_collected_at)
    }
  end

  def habitat(habitat, living_count)
    feature = TerrainCatalog.find(habitat.terrain)
    {
      id: habitat.id,
      name: habitat.name,
      terrain: habitat.terrain,
      capacity: habitat.capacity,
      level: habitat.level,
      happiness_modifier: habitat.happiness_modifier,
      living_count: living_count,
      temperature: habitat.effective_temperature,
      humidity: habitat.effective_humidity,
      food_stockpile: habitat.food_stockpile,
      feature: feature&.feature,
      feature_label: feature&.feature_label
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
      genetics_quality: dino.genetics_quality,
      temperature_min: dino.temperature_min,
      temperature_max: dino.temperature_max,
      diet_restrictions: dino.diet_restrictions,
      diseases: dino.diseases.select { |d| d.cured_at.nil? }.map(&:kind),
      quarantined: dino.quarantined,
      health_history: dino.health_history,
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
