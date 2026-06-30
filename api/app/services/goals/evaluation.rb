module Goals
  # Compute-on-read goal/achievement evaluation. `call` records any newly
  # reached goals (granting their one-off reward and flipping the win flag),
  # while `snapshot` reports current progress without side effects for the
  # serializer. Recording is idempotent: a goal already in goal_completions is
  # never re-granted, so repeated reads in the same day are safe.
  class Evaluation
    def self.call(player, now: Time.current) = new(player, now).grant!

    def self.snapshot(player, now: Time.current) = new(player, now).snapshot

    def initialize(player, now)
      @player = player
      @now = now
    end

    def grant!
      GoalCatalog.all.each do |goal|
        next if completed.include?(goal.key)
        next unless current_value(goal.metric) >= goal.threshold

        complete!(goal)
      end
      @player
    end

    def snapshot
      GoalCatalog.all.map do |goal|
        {
          key: goal.key,
          name: goal.name,
          description: goal.description,
          metric: goal.metric,
          threshold: goal.threshold,
          reward: goal.reward,
          win: goal.win,
          current: current_value(goal.metric),
          completed: completed.include?(goal.key)
        }
      end
    end

    private

    def complete!(goal)
      @player.goal_completions.create!(goal_key: goal.key, completed_at: @now)
      @player.update!(currency: @player.currency + goal.reward) if goal.reward.positive?
      @player.update!(won: true) if goal.win
      completed << goal.key
      Event.log(@player, "goal", "Achievement unlocked: #{goal.name}", now: @now)
    end

    def completed
      @completed ||= @player.goal_completions.pluck(:goal_key).to_set
    end

    def current_value(metric)
      case metric
      when :population      then living.size
      when :avg_health      then living.size >= GoalCatalog::THRIVING_MIN_POPULATION ? avg_health.floor : 0
      when :self_sustaining then self_sustaining? ? 1 : 0
      when :perfect_iv      then perfect_iv? ? 1 : 0
      when :all_species     then unlocked_species_count
      when :park_legend     then park_legend? ? 1 : 0
      else 0
      end
    end

    def living
      @living ||= @player.dinosaurs.alive.to_a
    end

    def avg_health
      return 0.0 if living.empty?

      living.sum(&:health) / living.size
    end

    # A park is self-sustaining once it has run SELF_SUSTAIN_DAYS game-days with
    # a healthy population that nobody has hand-fed in that window.
    def self_sustaining?
      return false if living.size < GoalCatalog::SUSTAIN_MIN_POPULATION || avg_health < 50
      return false if GameClock.game_days_between(@player.created_at, @now) < GoalCatalog::SELF_SUSTAIN_DAYS

      cutoff = @now - GameClock.real_seconds_for_game_days(GoalCatalog::SELF_SUSTAIN_DAYS)
      living.none? { |dino| dino.last_fed_at && dino.last_fed_at > cutoff }
    end

    def perfect_iv?
      @player.dinosaurs.where("generation >= 2").where("genetics_quality >= ?", GoalCatalog::PERFECT_IV).exists?
    end

    def unlocked_species_count
      (Species.starters.map(&:key) | @player.species_unlocks.pluck(:species_key)).size
    end

    def park_legend?
      living.size >= 15 && unlocked_species_count >= Species.keys.size && avg_health >= 80
    end
  end
end
