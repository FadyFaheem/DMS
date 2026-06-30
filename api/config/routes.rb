Rails.application.routes.draw do
  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Application health endpoint consumed by the frontend and cloudflared.
  get "health" => "health#show"

  namespace :api do
    resources :players, only: [ :create ] do
      get :me, on: :collection
    end
  end
end
