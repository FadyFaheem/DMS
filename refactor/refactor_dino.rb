# frozen_string_literal: true

# Runnable demo for the refactored dino management code.
#
# The original crammed three concerns into this one file: the logic, a printed
# demo, and an RSpec stub. They now live in focused files:
#
#   * dino_management.rb       - the implementation (pure, no side effects)
#   * dino_management_spec.rb  - the RSpec suite (the stub, filled in)
#   * refactor_dino.rb         - this file: a thin script that prints the demo
#
# Run it with:  ruby refactor/refactor_dino.rb
require_relative "dino_management"

SAMPLE_DINOS = [
  { "name" => "DinoA", "category" => "herbivore", "period" => "Cretaceous", "diet" => "plants", "age" => 100 },
  { "name" => "DinoB", "category" => "carnivore", "period" => "Jurassic", "diet" => "meat", "age" => 80 },
].freeze

pp DinoManagement.analyze(SAMPLE_DINOS)
