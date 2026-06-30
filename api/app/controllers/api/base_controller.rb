module Api
  class BaseController < ApplicationController
    include PlayerAuthentication
  end
end
