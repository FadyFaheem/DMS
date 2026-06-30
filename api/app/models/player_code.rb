# Generates a readable, low-security login code, e.g. "AB3K-7QPX-MN24-RT9F".
# The code is the player's only credential (a bearer token). Ambiguous
# characters (0/O/1/I/L) are excluded so it's easy to read and type.
module PlayerCode
  CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789".chars.freeze
  GROUPS = 4
  GROUP_SIZE = 4

  module_function

  def generate
    Array.new(GROUPS) { Array.new(GROUP_SIZE) { CHARS.sample }.join }.join("-")
  end

  # Generate a code guaranteed unique among existing players.
  def generate_unique
    loop do
      code = generate
      break code unless Player.exists?(player_code: code)
    end
  end
end
