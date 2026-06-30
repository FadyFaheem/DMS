# Produces an offspring dinosaur for a ready breeding, applying inheritance and
# rare mutations, then marks the breeding claimed.
module Reproduction
  class Hatch
    def self.call(breeding, rng: Random.new, now: Time.current)
      new(breeding, rng, now).call
    end

    def initialize(breeding, rng, now)
      @breeding = breeding
      @parent_a = breeding.parent_a
      @parent_b = breeding.parent_b
      @rng = rng
      @now = now
    end

    def call
      entry = Species.find(@rng.rand < 0.5 ? @parent_a.species : @parent_b.species)
      mutations = mutations_for

      offspring = @breeding.player.dinosaurs.create!(offspring_attributes(entry, mutations))
      @breeding.update!(status: "claimed", offspring: offspring)
      Event.log(@breeding.player, "birth", "#{offspring.name} hatched", now: @now)
      offspring
    end

    private

    # A breeding started with a requested_trait (via the genetic engineering lab)
    # guarantees that mutation; otherwise roll, boosted if the player researched
    # mutation_rate_boost.
    def mutations_for
      return [ @breeding.requested_trait ] if @breeding.requested_trait.present?

      Genetics.roll_mutations(@rng, chance: mutation_chance)
    end

    def mutation_chance
      if @breeding.player.researches.exists?(tech_key: "mutation_rate_boost")
        Genetics::BOOSTED_MUTATION_CHANCE
      else
        Genetics::MUTATION_CHANCE
      end
    end

    def offspring_attributes(entry, mutations)
      diet = Genetics.inherit_diet(@parent_a, @parent_b, @rng)
      min_temp, max_temp = DinoFactory.temperature_range(entry)
      {
        habitat: @parent_a.habitat || @parent_b.habitat,
        species: entry.key,
        period: entry.period,
        name: "#{entry.name} ##{100 + @rng.rand(900)}",
        gender: @rng.rand < 0.5 ? "male" : "female",
        color: Genetics.inherit_color(@parent_a, @parent_b, mutations, @rng),
        size_lbs: Genetics.size_with_mutations(average_size, mutations),
        born_at: @now,
        generation: [ @parent_a.generation, @parent_b.generation ].max + 1,
        diet_primary: diet,
        diet_secondary: entry.diet_secondary,
        preferred_terrain: entry.preferred_terrain,
        social_structure: entry.social_structure,
        health: 100.0,
        hunger: 10.0,
        happiness: mutations.include?("shiny") ? 75.0 : 70.0,
        reproduction_readiness: 0.0,
        stats_updated_at: @now,
        mutation_traits: mutations,
        genetics_quality: Genetics.genetics_quality(@parent_a.genetics_quality, @parent_b.genetics_quality, mutations, @rng),
        temperature_min: min_temp,
        temperature_max: max_temp,
        diet_restrictions: Genetics.inherit_restrictions(@parent_a, @parent_b, diet, @rng),
        parent_a: @parent_a,
        parent_b: @parent_b,
        alive: true
      }
    end

    def average_size
      ((@parent_a.size_lbs + @parent_b.size_lbs) / 2.0).round
    end
  end
end
