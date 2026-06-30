# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_06_30_010300) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "breedings", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "hatches_at", null: false
    t.bigint "offspring_id"
    t.bigint "parent_a_id", null: false
    t.bigint "parent_b_id", null: false
    t.bigint "player_id", null: false
    t.string "status", default: "incubating", null: false
    t.datetime "updated_at", null: false
    t.index ["offspring_id"], name: "index_breedings_on_offspring_id"
    t.index ["parent_a_id"], name: "index_breedings_on_parent_a_id"
    t.index ["parent_b_id"], name: "index_breedings_on_parent_b_id"
    t.index ["player_id"], name: "index_breedings_on_player_id"
  end

  create_table "dinosaurs", force: :cascade do |t|
    t.boolean "alive", default: true, null: false
    t.datetime "born_at", null: false
    t.string "color"
    t.datetime "created_at", null: false
    t.string "diet_primary", null: false
    t.string "diet_secondary"
    t.string "gender", null: false
    t.integer "generation", default: 1, null: false
    t.bigint "habitat_id"
    t.float "happiness", default: 70.0, null: false
    t.float "health", default: 100.0, null: false
    t.float "hunger", default: 0.0, null: false
    t.string "last_diet_quality"
    t.datetime "last_fed_at"
    t.jsonb "mutation_traits", default: [], null: false
    t.string "name", null: false
    t.bigint "parent_a_id"
    t.bigint "parent_b_id"
    t.string "period"
    t.bigint "player_id", null: false
    t.string "preferred_terrain"
    t.float "reproduction_readiness", default: 0.0, null: false
    t.integer "size_lbs", default: 0, null: false
    t.string "social_structure", default: "herd", null: false
    t.string "species", null: false
    t.datetime "stats_updated_at", null: false
    t.datetime "updated_at", null: false
    t.index ["habitat_id"], name: "index_dinosaurs_on_habitat_id"
    t.index ["parent_a_id"], name: "index_dinosaurs_on_parent_a_id"
    t.index ["parent_b_id"], name: "index_dinosaurs_on_parent_b_id"
    t.index ["player_id"], name: "index_dinosaurs_on_player_id"
  end

  create_table "events", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "kind", null: false
    t.string "message", null: false
    t.bigint "player_id", null: false
    t.datetime "updated_at", null: false
    t.index ["player_id", "created_at"], name: "index_events_on_player_id_and_created_at"
    t.index ["player_id"], name: "index_events_on_player_id"
  end

  create_table "food_productions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "kind", null: false
    t.datetime "last_collected_at"
    t.integer "level", default: 1, null: false
    t.bigint "player_id", null: false
    t.datetime "updated_at", null: false
    t.index ["player_id", "kind"], name: "index_food_productions_on_player_id_and_kind"
    t.index ["player_id"], name: "index_food_productions_on_player_id"
  end

  create_table "habitats", force: :cascade do |t|
    t.integer "capacity", default: 6, null: false
    t.datetime "created_at", null: false
    t.integer "happiness_modifier", default: 0, null: false
    t.integer "level", default: 1, null: false
    t.string "name", null: false
    t.bigint "player_id", null: false
    t.string "terrain", null: false
    t.datetime "updated_at", null: false
    t.index ["player_id"], name: "index_habitats_on_player_id"
  end

  create_table "players", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "currency", default: 10000, null: false
    t.string "display_name", default: "New Keeper", null: false
    t.integer "food_fish", default: 50, null: false
    t.integer "food_meat", default: 100, null: false
    t.integer "food_plants", default: 100, null: false
    t.datetime "last_income_at"
    t.string "player_code", null: false
    t.datetime "updated_at", null: false
    t.index ["player_code"], name: "index_players_on_player_code", unique: true
  end

  create_table "researches", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "player_id", null: false
    t.string "tech_key", null: false
    t.datetime "updated_at", null: false
    t.index ["player_id", "tech_key"], name: "index_researches_on_player_id_and_tech_key", unique: true
    t.index ["player_id"], name: "index_researches_on_player_id"
  end

  add_foreign_key "breedings", "dinosaurs", column: "offspring_id"
  add_foreign_key "breedings", "dinosaurs", column: "parent_a_id"
  add_foreign_key "breedings", "dinosaurs", column: "parent_b_id"
  add_foreign_key "breedings", "players"
  add_foreign_key "dinosaurs", "dinosaurs", column: "parent_a_id"
  add_foreign_key "dinosaurs", "dinosaurs", column: "parent_b_id"
  add_foreign_key "dinosaurs", "habitats"
  add_foreign_key "dinosaurs", "players"
  add_foreign_key "events", "players"
  add_foreign_key "food_productions", "players"
  add_foreign_key "habitats", "players"
  add_foreign_key "researches", "players"
end
