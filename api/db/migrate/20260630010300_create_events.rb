class CreateEvents < ActiveRecord::Migration[8.1]
  def change
    create_table :events do |t|
      t.references :player, null: false, foreign_key: true
      t.string :kind, null: false
      t.string :message, null: false

      t.timestamps
    end

    add_index :events, [ :player_id, :created_at ]
  end
end
