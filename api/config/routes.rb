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

    resources :dinosaurs, only: [ :show ] do
      member do
        post :feed
        post :move
      end
    end

    resources :habitats, only: [ :index, :create ]

    resources :researches, only: [ :index, :create ]

    resource :food, only: [ :create ], controller: "food"

    resources :breedings, only: [ :index, :create ] do
      post :claim, on: :member
    end
  end
end
