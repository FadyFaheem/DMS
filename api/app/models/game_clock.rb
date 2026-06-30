# Converts real elapsed time into game time. The scale is configurable so the
# game can run at a relaxed pace in production and be accelerated in tests.
module GameClock
  DAYS_PER_MONTH = 30.0
  # Fixed reference point for an absolute, stable game-day index (used to seed
  # deterministic per-day event rolls). Never change this or seeds shift.
  EPOCH = Time.utc(2000, 1, 1).freeze

  module_function

  def real_minutes_per_game_day
    ENV.fetch("GAME_DAY_REAL_MINUTES", "60").to_f
  end

  def game_days_between(from, to)
    return 0.0 if from.nil? || to.nil?

    (to - from) / (real_minutes_per_game_day * 60)
  end

  def age_months(born_at, now = Time.current)
    game_days_between(born_at, now) / DAYS_PER_MONTH
  end

  def real_seconds_for_game_days(days)
    days * real_minutes_per_game_day * 60
  end

  # Absolute whole-game-day index for a moment in time, counted from EPOCH. The
  # same calendar game-day always maps to the same integer, so seeding an RNG
  # with it yields a stable per-day roll under compute-on-read.
  def absolute_game_day(time)
    game_days_between(EPOCH, time).floor
  end
end
