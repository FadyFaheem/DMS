# Seeds a new player's starting park: one forest habitat plus the starter dinos
# (two herbivores and one small carnivore).
module Park
  class Seeder
    STARTER_HABITAT = {
      name: "Whispering Forest",
      terrain: "forest",
      capacity: 6,
      happiness_modifier: 10
    }.freeze

    def initialize(player)
      @player = player
    end

    def seed_starter!(now: Time.current)
      habitat = @player.habitats.create!(STARTER_HABITAT)
      Species.starters.each do |species|
        @player.dinosaurs.create!(
          DinoFactory.attributes_for(species, player: @player, habitat:, now:)
        )
      end
      habitat
    end
  end
end
