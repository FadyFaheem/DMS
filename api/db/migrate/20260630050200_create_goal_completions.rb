class CreateGoalCompletions < ActiveRecord::Migration[8.1]
  def change
    create_table :goal_completions do |t|
      t.references :player, null: false, foreign_key: true
      t.string :goal_key, null: false
      t.datetime :completed_at, null: false

      t.timestamps
    end

    add_index :goal_completions, [ :player_id, :goal_key ], unique: true
  end
end
