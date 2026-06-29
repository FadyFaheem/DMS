require "test_helper"

class HealthControllerTest < ActionDispatch::IntegrationTest
  test "GET /health returns healthy status" do
    get "/health"
    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "healthy", body["status"]
    assert_equal "project-api", body["service"]
  end
end
