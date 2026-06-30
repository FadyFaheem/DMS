module Simulation
  # Compute-on-read entry point: advances every living dino and applies passive
  # income before the player's state is read.
  class ParkTick
    def self.call(player, now: Time.current)
      # Order matters: events fire first (so today's effects throttle today's
      # production), then farms produce, then dinos eat, then health/stats settle.
      Events.call(player, now:)
      FoodCollection.call(player, now:)
      Consumption.call(player, now:)
      player.dinosaurs.alive.find_each { |dino| DinoTick.call(dino, now:) }
      Economy.passive_income(player, now:)
      player
    end
  end
end
