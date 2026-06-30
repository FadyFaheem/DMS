# Prestige / New Game+ (Phase 3D): wipe a player's park back to a fresh start
# while keeping a permanent bonus. Each prestige raises prestige_level (which
# drives Player#income_multiplier), so subsequent runs earn more. Guarded by the
# win condition and run in a transaction; it is an explicit action (not
# compute-on-read), so re-running simply fails until the player wins again.
module Prestige
  class Reset
    class Error < StandardError; end

    STARTING_CURRENCY = 10_000
    STARTING_FOOD = { food_plants: 100, food_meat: 100, food_fish: 50 }.freeze

    def self.call(player, now: Time.current) = new(player, now).call

    def initialize(player, now)
      @player = player
      @now = now
    end

    def call
      raise Error, "Reach the win condition before prestiging" unless @player.won

      @player.transaction do
        wipe!
        @player.update!(
          prestige_level: @player.prestige_level + 1,
          won: false,
          currency: STARTING_CURRENCY,
          last_income_at: @now,
          last_consumed_at: @now,
          last_event_roll_at: @now,
          **STARTING_FOOD
        )
        Park::Seeder.new(@player).seed_starter!(now: @now)
        Event.log(@player, "event", "Prestiged to level #{@player.prestige_level} -- a new era begins", now: @now)
      end
      @player
    end

    private

    # Delete child records in FK-safe order (breedings + diseases reference
    # dinosaurs; dinos self-reference via parentage; active effects reference
    # habitats/farms). delete_all is fine -- we want no callbacks here.
    def wipe!
      @player.breedings.delete_all
      Disease.where(dinosaur_id: @player.dinosaurs.select(:id)).delete_all
      @player.dinosaurs.update_all(parent_a_id: nil, parent_b_id: nil)
      @player.dinosaurs.delete_all
      @player.active_effects.delete_all
      @player.attractions.delete_all
      @player.food_productions.delete_all
      @player.structures.delete_all
      @player.researches.delete_all
      @player.species_unlocks.delete_all
      @player.goal_completions.delete_all
      @player.habitats.delete_all
      @player.events.delete_all
    end
  end
end
