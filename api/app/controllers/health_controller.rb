# Liveness/health endpoint consumed by the frontend and cloudflared.
class HealthController < ApplicationController
  def show
    render json: { status: "healthy", service: "project-api" }
  end
end
