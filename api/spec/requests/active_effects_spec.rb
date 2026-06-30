require "rails_helper"

RSpec.describe "Active effects in the player payload", type: :request do
  let(:player) { Player.create!(player_code: PlayerCode.generate, display_name: "K") }
  let(:headers) { { "Authorization" => "Bearer #{player.player_code}" } }

  it "exposes active effects with their target ids and scope" do
    habitat = player.habitats.create!(name: "Field", terrain: "grassland", capacity: 6)
    player.active_effects.create!(
      kind: "heat_spike", multiplier: 0.5, habitat: habitat, expires_at: 2.hours.from_now
    )
    # Skip rolling new events during this read so we assert on a known effect.
    player.update!(last_event_roll_at: Time.current)

    get "/api/players/me", headers: headers

    expect(response).to have_http_status(:ok)
    effects = JSON.parse(response.body)["active_effects"]
    heat = effects.find { |e| e["kind"] == "heat_spike" }
    expect(heat).to be_present
    expect(heat["habitat_id"]).to eq(habitat.id)
    expect(heat["scope"]).to eq("habitat")
  end
end
