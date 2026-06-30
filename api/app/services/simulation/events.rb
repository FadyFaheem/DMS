module Simulation
  # Compute-on-read environmental & production events. Once per elapsed game-day
  # we roll a seeded RNG (deterministic: a given player + game-day always rolls
  # the same outcome) and may spawn a time-limited ActiveEffect that throttles a
  # farm's output or a habitat's comfort. The roll watermark (last_event_roll_at)
  # advances by whole game-days like FoodCollection, so repeated reads inside one
  # game-day never re-roll. Expired effects are swept on every read.
  class Events
    MAX_CATCHUP_DAYS = 3650

    def self.call(player, now: Time.current)
      new(player, now).call
    end

    def initialize(player, now)
      @player = player
      @now = now
    end

    def call
      sweep_expired
      since = @player.last_event_roll_at || @player.created_at
      days = GameClock.game_days_between(since, @now).floor
      return @player if days <= 0

      days = [ days, MAX_CATCHUP_DAYS ].min
      @farms = @player.food_productions.order(:id).to_a
      @habitats = @player.habitats.order(:id).to_a
      days.times { |i| roll_day(since + GameClock.real_seconds_for_game_days(i + 1)) }
      @player.update!(last_event_roll_at: since + GameClock.real_seconds_for_game_days(days))
      @player
    end

    private

    def sweep_expired
      expired = @player.active_effects.where(expires_at: ...@now).to_a
      return if expired.empty?

      expired.each { |effect| Event.log(@player, "event", "#{effect.name} subsided", now: @now) }
      @player.active_effects.where(id: expired.map(&:id)).delete_all
    end

    # One deterministic roll for a single game-day, seeded by player + day index.
    def roll_day(day_end)
      rng = Random.new(@player.id ^ GameClock.absolute_game_day(day_end))
      return unless rng.rand < EventEffectCatalog::DAILY_CHANCE

      spec = EventEffectCatalog.weighted_sample(rng)
      target = pick_target(spec, rng)
      return if target.nil? || duplicate?(spec, target)

      spawn(spec, target, day_end)
    end

    def pick_target(spec, rng)
      candidates =
        case spec.scope
        when :food_production then @farms.select { |f| spec.targets.include?(f.kind) }
        when :habitat         then @habitats.select { |h| spec.targets.include?(h.terrain) }
        end
      return nil if candidates.blank?

      candidates[rng.rand(candidates.size)]
    end

    # Don't stack a second effect of the same kind on a target it already afflicts.
    def duplicate?(spec, target)
      key = spec.scope == :food_production ? { food_production_id: target.id } : { habitat_id: target.id }
      @player.active_effects.active(@now).exists?(kind: spec.kind, **key)
    end

    def spawn(spec, target, day_end)
      expires_at = day_end + GameClock.real_seconds_for_game_days(spec.duration_days)
      # ponytail: only surface events still ongoing at read time. Events that began
      # AND ended inside a long idle gap are skipped rather than logged as already
      # over (normal reads happen every <=1 game-day, so nothing real is missed).
      return if expires_at <= @now

      attrs = { kind: spec.kind, multiplier: spec.multiplier, expires_at: expires_at }
      attrs[spec.scope == :food_production ? :food_production : :habitat] = target
      @player.active_effects.create!(attrs)
      Event.log(@player, "event", "#{spec.name} struck #{target_label(target)}", now: day_end)
    end

    def target_label(target)
      case target
      when Habitat then target.name
      when FoodProduction then FoodProductionCatalog.find(target.kind)&.name || target.kind
      end
    end
  end
end
