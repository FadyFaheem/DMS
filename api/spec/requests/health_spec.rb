require "rails_helper"

RSpec.describe "Health", type: :request do
  describe "GET /health" do
    it "returns a healthy status payload" do
      get "/health"

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["status"]).to eq("healthy")
      expect(body["service"]).to eq("project-api")
    end
  end
end
