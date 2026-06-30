require "rails_helper"

RSpec.describe Simulation::Events do
  # Default scale: 60 real minutes == 1 game-day, so 6 real hours == 6 game-days.
  let(:player) { Player.create!(player_code: PlayerCode.generate, display_name: "K") }
  let(:now) { Time.current }

  before do
    player.habitats.create!(name: "Field", terrain: "grassland", capacity: 6)
    player.food_productions.create!(kind: "plant_farm", last_collected_at: now)
    player.food_productions.create!(kind: "fishing_pond", last_collected_at: now)
  end

  def snapshot
    player.active_effects.order(:id).map { |e| [ e.kind, e.habitat_id, e.food_production_id, e.expires_at.to_i ] }
  end

  it "rolls deterministically: the same player + game-days reproduce the same effects" do
    stub_const("EventEffectCatalog::DAILY_CHANCE", 1.0)
    player.update!(last_event_roll_at: now - 6.hours)
    described_class.call(player, now: now)
    first = snapshot
    expect(first).not_to be_empty

    player.active_effects.delete_all
    player.update!(last_event_roll_at: now - 6.hours)
    described_class.call(player, now: now)

    expect(snapshot).to eq(first)
  end

  it "does not re-roll on repeated reads within the same game-day (idempotent)" do
    stub_const("EventEffectCatalog::DAILY_CHANCE", 1.0)
    player.update!(last_event_roll_at: now - 6.hours)
    described_class.call(player, now: now)
    effects = player.active_effects.count
    log = player.events.count

    described_class.call(player, now: now)

    expect(player.active_effects.count).to eq(effects)
    expect(player.events.count).to eq(log)
  end

  it "advances the roll watermark by whole game-days" do
    player.update!(last_event_roll_at: now - 3.hours)
    described_class.call(player, now: now)
    expect(player.reload.last_event_roll_at).to be_within(1.second).of(now)
  end

  it "sweeps expired effects and logs that they subsided" do
    effect = player.active_effects.create!(
      kind: "drought", multiplier: 0.4,
      food_production: player.food_productions.first, expires_at: now - 1.hour
    )
    player.update!(last_event_roll_at: now)

    expect { described_class.call(player, now: now) }
      .to change { ActiveEffect.exists?(effect.id) }.from(true).to(false)
    expect(player.events.where(kind: "event").last.message).to match(/subsided/)
  end

  it "leaves unexpired effects in place" do
    effect = player.active_effects.create!(
      kind: "heat_spike", multiplier: 0.5,
      habitat: player.habitats.first, expires_at: now + 2.hours
    )
    player.update!(last_event_roll_at: now)

    described_class.call(player, now: now)

    expect(ActiveEffect.exists?(effect.id)).to be(true)
  end
end
