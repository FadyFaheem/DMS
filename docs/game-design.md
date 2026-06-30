# Game Design

> The design bible. Every system, every formula, every number that decides whether a dinosaur thrives or dies.

[← Architecture](architecture.md) &middot; [Handbook](README.md) &middot; Next: [Backend →](backend.md)

All of this lives in [`api/app/services`](../api/app/services) and [`api/app/models`](../api/app/models). The simulation advances on read — see [Architecture → Compute-on-read](architecture.md#compute-on-read) — so every "per day" below means *per game-day*, applied in a catch-up loop whenever the park is read.

## Contents

- [Game time](#game-time)
- [Anatomy of a dinosaur](#anatomy-of-a-dinosaur)
- [Health](#health)
- [Hunger & feeding](#hunger--feeding)
- [Happiness](#happiness)
- [Climate & temperature](#climate--temperature)
- [Social structure](#social-structure)
- [Disease & treatment](#disease--treatment)
- [Habitats & terrain](#habitats--terrain)
- [Breeding & genetics](#breeding--genetics)
- [The economy](#the-economy)
- [Research tree](#research-tree)
- [Food production](#food-production)
- [Structures](#structures)
- [Attractions](#attractions)
- [Events & weather](#events--weather)
- [Goals](#goals)
- [Prestige & winning](#prestige--winning)
- [Species catalog](#species-catalog)

---

## Game time

Real time is converted to game time by a single module, [`GameClock`](../api/app/models/game_clock.rb).

| Constant | Value | Meaning |
|----------|-------|---------|
| `GAME_DAY_REAL_MINUTES` | `60` (env-configurable) | Real minutes in one game-day. Default: **1 hour = 1 day**. |
| `DAYS_PER_MONTH` | `30` | Game-days in a game-month (drives aging). |
| `EPOCH` | `2000-01-01 UTC` | Fixed anchor for deterministic event seeds — never change it. |

```
game_days_between(from, to) = (to - from seconds) / (GAME_DAY_REAL_MINUTES × 60)
age_months(born_at, now)    = game_days_between(born_at, now) / 30
```

Set `GAME_DAY_REAL_MINUTES` low (e.g. `1`) to accelerate the whole simulation for testing.

## Anatomy of a dinosaur

Each dinosaur ([`Dinosaur`](../api/app/models/dinosaur.rb)) carries four live stats, all clamped to **0–100**:

| Stat | Starts at | Driven by | Read in the UI as |
|------|-----------|-----------|-------------------|
| **health** | 100 | The daily health delta (below). Hits 0 → the dino dies. | The floating health bar; its colour. |
| **hunger** | varies | [Consumption](#hunger--feeding). High hunger = effectively a wrong diet. | "Hunger". |
| **happiness** | 70 | [Happiness](#happiness) model. | "Happiness". |
| **reproduction_readiness** | 0 | +8/game-day when happiness ≥ 50 and not starving. | A maturity meter. |

Fixed traits: `species`, `period`, `gender`, `color`, `size_lbs`, `diet_primary`/`diet_secondary`, `preferred_terrain`, `social_structure`, `temperature_min`/`max`, `generation`, `genetics_quality`, `mutation_traits`, and any `diet_restrictions` (allergies).

### Status bands

`Dinosaur#status` maps health to a label (and the bar colour):

| Health | Status |
|--------|--------|
| 75–100 | **Thriving** |
| 50–74 | **Stable** |
| 25–49 | **Struggling** |
| 0–24 | **Critical** |
| (dead) | **Dead** |

## Health

The heart of the simulation. Each game-day, every living dino's health changes by an **additive delta** ([`Simulation::HealthFormula`](../api/app/services/simulation/health_formula.rb), applied by [`DinoTick`](../api/app/services/simulation/dino_tick.rb)):

```
daily_health_delta =
    diet            (preferred +1.5 | acceptable 0 | wrong −6.0)
  + terrain         (matches preferred +0.5 | mismatch −0.25)
  + crowding        (over capacity −2.0 | otherwise 0)
  + social          (see Social structure)
  + age             (−(age_months / 12) × 0.2)
  + disease         (sum of each active disease's daily penalty)
  + temperature     (in comfort band +0.5 | else −0.2 per °C outside)
  − 0.5             (BASE_DECAY — entropy; everything trends down)
```

The takeaways:

- **Diet is the biggest lever.** A wrong diet (or hunger ≥ 80) is −6.0/day and will kill a dino fast. The right diet is +1.5/day.
- **Everything decays.** With `BASE_DECAY = −0.5`, a perfectly-fed, perfectly-housed dino still needs its other bonuses to stay positive. Neglect compounds.
- **Age is gentle but permanent.** Older dinos lose a little more each day.
- When health reaches **0**, `DinoTick` flips `alive = false` and logs a death event. Dead is dead.

## Hunger & feeding

Hunger is owned by [`Simulation::Consumption`](../api/app/services/simulation/consumption.rb), which runs once per park read. Two ways a dino eats:

### Automatic daily rations

Every game-day, each living dino tries to eat a **size-based ration** from the food store matching its primary diet:

```
ration = max(ceil(size_lbs / 2000), 1)   # food units per game-day
```

A 16,000-lb T. rex eats 8 meat/day; a 35-lb Velociraptor eats 1. Then:

| Outcome that day | Effect |
|------------------|--------|
| Fed | hunger −20, diet quality "preferred" |
| Not fed (store empty) | hunger +12, diet quality "wrong" |
| Unfed ≥ 3 days straight | contracts **malnutrition**; feeding clears it |

Diets map to stores so that **insects forage from the plant store**: `plants`/`insects` → plant food, `meat` → meat, `fish` → fish.

**Grazing:** herbivores (`plants`/`insects` eaters) first graze their habitat's local **food_stockpile** (filled via the "stock" action) before drawing on your global stores.

**Overgrazing:** every dino a habitat holds *over capacity* burns an extra **4 plant food/game-day**, so unchecked overpopulation quietly starves the whole park.

### Manual feeding

Feeding a dino by hand ([`Feeding`](../api/app/services/feeding.rb)) is an instant top-up: it spends **10 food units**, sets **hunger to 0**, and records the diet quality:

| You feed its... | Diet quality |
|-----------------|--------------|
| Primary diet | preferred |
| Secondary diet | acceptable |
| Anything else | wrong |

A dino is **never fed a diet it's allergic to** (`diet_restrictions`) — that request is rejected.

## Happiness

Happiness is recomputed each game-day, then nudged by terrain and active events ([`HealthFormula.happiness`](../api/app/services/simulation/health_formula.rb) + [`DinoTick`](../api/app/services/simulation/dino_tick.rb)):

```
base       = 60 + habitat.happiness_modifier
           + 10  if in preferred terrain
           − 15  if overcrowded
           + social happiness (see below)

happiness  = clamp( base × habitat_event_multiplier + terrain_happiness , 0..100 )
```

- `habitat_event_multiplier` is the product of any active habitat events (e.g. a **heat spike** of 0.5 cuts happiness in half).
- `terrain_happiness` rewards niche fits: a heat-tolerant dino on **volcanic** terrain gains **+8**; a herbivore sharing **grassland** with a carnivore loses **−6**.

Happiness ≥ 50 (and not starving) is what lets `reproduction_readiness` climb.

## Climate & temperature

Each terrain has a temperature; each dino has a comfortable band (`temperature_min`–`max`, set to ±8 °C around its preferred terrain's climate at birth).

```
temperature_delta =
   +0.5                       if temperature is within [min, max]
   −0.2 × °C_outside_band     otherwise
```

Housing a cold-loving forest dweller in a 34 °C volcanic pit is a slow, steady health drain — and, while crowded, a route to **heat stress**.

## Social structure

Every species is `solitary`, `pair`, or `herd`. "With group" simply means the habitat holds more than one living dino. Social fit affects **both** health and happiness each day:

| Structure | With others (health / happiness) | Alone (health / happiness) |
|-----------|:--------------------------------:|:--------------------------:|
| **herd** | +0.5 / +10 | −2.0 / −20 |
| **pair** | +0.3 / +8 | −1.0 / −10 |
| **solitary** | −0.5 / −5 | +0.25 / +5 |

Herd animals are miserable in isolation; solitary animals resent company. Housing matters as much as feeding.

## Disease & treatment

Diseases ([`DiseaseCatalog`](../api/app/models/disease_catalog.rb)) apply a daily health penalty until cured:

| Disease | Daily health | How it starts |
|---------|:------------:|---------------|
| Scale Rot | −5.0 | Crowded **wetland** habitat, herbivores |
| Heat Stress | −4.0 | Crowded **volcanic** habitat |
| Parasites | −3.0 | Crowded habitat, dino already below 30 health |
| Malnutrition | −2.0 | Unfed 3+ game-days straight |

Onset happens in `DinoTick` only when a habitat is **crowded** (> 80% of capacity) and the dino isn't **quarantined**. So your two levers are:

- **Quarantine** a sick or at-risk dino (toggle) to exempt it from new onsets.
- **Treat** it — but treating non-malnutrition diseases requires a **Veterinary Lab** and costs **600 currency per active disease**. Malnutrition clears for free just by feeding the dino again.

> A note for the curious: parasites are flagged "contagious" in the catalog, but there is no spread logic in the simulation yet — onset is purely rule-based.

## Habitats & terrain

A [`Habitat`](../api/app/models/habitat.rb) has a `terrain`, a `capacity`, a `level`, a `happiness_modifier`, and a local plant `food_stockpile`. Terrain ([`TerrainCatalog`](../api/app/models/terrain_catalog.rb)) sets the default climate and a special "feature":

| Terrain | Temp | Humidity | Feature | Build cost | Default capacity |
|---------|:----:|:--------:|---------|:----------:|:----------------:|
| Forest | 18 °C | 60% | Shade (cooling) | 5,000 | 6 |
| Grassland | 24 °C | 40% | Predation (herbivores fear carnivores) | 4,000 | 8 |
| Wetland | 22 °C | 85% | Disease risk | 6,000 | 5 |
| Volcanic | 34 °C | 20% | Heat (delights heat-lovers) | 8,000 | 4 |
| Aquatic | 20 °C | 95% | Humid (suits aquatic species) | 7,000 | 3 |

Three crowding thresholds matter:

| Term | Definition | Consequence |
|------|------------|-------------|
| At capacity | living ≥ capacity | Can't add more without an upgrade |
| **Crowded** | living > 80% of capacity | Disease can start |
| **Overcrowded** | living > capacity | −2.0 health/day **and** overgrazing |

**Upgrading** a habitat (needs the `habitat_expansion` research) costs `2,000 × current level` and adds **+3 capacity** per level.

## Breeding & genetics

### Compatibility

Before an egg can be made, the API checks the pairing ([`Reproduction::Compatibility`](../api/app/services/reproduction/compatibility.rb)). Both dinos must be:

1. **Alive**,
2. **Opposite genders**,
3. **At least 60 health** each, and
4. **Species-adjacent** — either the *same species*, or sharing *both* the same primary diet *and* the same era.

> `reproduction_readiness` is shown as a maturity meter and powers a `breeding_ready?` helper, but the live breeding gate the API enforces is the four rules above.

### Incubation

Starting a breeding costs **800 currency** and creates an egg that hatches after:

- **2 game-days** normally, or
- **1 game-day** if you've built a **Hatchery**.

When ready, you **claim** it to hatch the offspring.

### Inheritance & mutations

Hatching ([`Reproduction::Hatch`](../api/app/services/reproduction/hatch.rb) + [`Genetics`](../api/app/services/reproduction/genetics.rb)) rolls the offspring:

| Trait | Rule |
|-------|------|
| Species | 50/50 from either parent |
| Gender | 50/50 |
| Size | average of parents, then ×1.2 (giant) or ×0.8 (dwarf) if mutated |
| Diet | 80% inherits a parent's primary diet; 20% a random new diet |
| Color | a parent's colour, or `iridescent` if **shiny** |
| Allergies | union of both parents' allergies, +5% chance of a brand-new one (never to its own diet) |
| Generation | max(parents) + 1 |

**Mutations** (`shiny`, `giant`, `dwarf`) roll at **8%** per hatch — or **30%** with the `mutation_rate_boost` research. With the **Genetic Engineering Lab**, you can *request* a specific mutation and guarantee it.

**Genetic quality** (the "IV", 0–100) is what you stack across generations:

```
genetics_quality = clamp( round( (parentA_iv + parentB_iv) / 2
                                  + mutation_bonus            # shiny +12, giant +6, dwarf +4
                                  + random(−4..+4) ) , 0, 100 )
```

Breeding two high-IV, mutated parents is how you climb toward the **Perfect Genes** goal (a gen-2+ dino with IV ≥ 95).

## The economy

All currency rules live in [`Economy`](../api/app/services/economy.rb).

### Income (passive, on read)

```
passive_income = floor( game_days × living_dinos × 25 × income_multiplier )
```

Every living dinosaur earns **25/game-day**. Attractions add more (see below). The `income_multiplier` is **1.0 + 0.1 × prestige_level** — your permanent New Game+ bonus.

### Costs

| Action | Cost |
|--------|------|
| Buy food | 2 currency / unit |
| Start a breeding | 800 |
| Build habitat | 4,000–8,000 by terrain (see table above) |
| Upgrade habitat | 2,000 × current level (+3 capacity) |
| Upgrade food farm | 1,500 × current level |
| Upgrade attraction | 4,000 × current level |
| Treat diseases | 600 × active diseases |
| Research (with Research Station) | listed cost × 0.8 |

Starter parks begin with **10,000 currency**, **100 plants**, **100 meat**, **50 fish**.

## Research tree

Research ([`ResearchCatalog`](../api/app/models/research_catalog.rb)) is pay-to-unlock — no timers. Each tech may need prerequisite techs and/or a minimum living population.

| Tech | Cost | Requires | Unlocks |
|------|:----:|----------|---------|
| Genetic Trait Viewing | 1,200 | — | trait viewing, **Hatchery** |
| Plant Farming | 1,500 | — | Plant Farm |
| Hunting Grounds | 2,000 | — | Hunting Ground |
| Fishing Ponds | 2,000 | — | Fishing Pond |
| Veterinary Science | 2,500 | — | **Vet Lab** |
| Habitat Expansion | 3,000 | 5 dinos | habitat upgrades, **Research Station** |
| Advanced Farming | 4,000 | Plant Farming | farm upgrades |
| Piscivore Husbandry | 4,000 | Fishing Ponds | Pteranodon & Spinosaurus |
| Mutation Rate Boost | 4,500 | Genetic Trait Viewing | 30% mutation odds |
| Theme-Park Attractions | 5,000 | 6 dinos | attractions |
| Environmental Control | 6,000 | Habitat Expansion | halves event severity |
| Genetic Engineering Lab | 9,000 | Trait Viewing + Mutation Boost | request specific mutations |

## Food production

Farms ([`FoodProductionCatalog`](../api/app/models/food_production_catalog.rb)) produce food on read ([`Simulation::FoodCollection`](../api/app/services/simulation/food_collection.rb)):

```
output = floor( base_output_per_day × level × game_days × event_multiplier )
```

| Farm | Produces | Output/day | Build cost | Requires | Prey pool |
|------|----------|:----------:|:----------:|----------|:---------:|
| Plant Farm | plants | 50 | 2,500 | Plant Farming | — |
| Hunting Ground | meat | 40 | 3,000 | Hunting Grounds | 240 cap, +45/day |
| Fishing Pond | fish | 35 | 3,000 | Fishing Ponds | 210 cap, +40/day |

**Prey pools:** meat and fish farms harvest from a finite population that regrows each day up to its cap — over-harvest and they thin out until they recover. Plant farms have no such limit.

## Structures

One-off facilities ([`StructureCatalog`](../api/app/models/structure_catalog.rb)):

| Structure | Cost | Requires | Effect |
|-----------|:----:|----------|--------|
| Veterinary Lab | 8,000 | Veterinary Science | Enables treating diseases |
| Hatchery | 9,000 | Genetic Trait Viewing | Incubation 2 days → 1 day |
| Research Station | 10,000 | Habitat Expansion | 20% off all research |

## Attractions

Theme-park attractions ([`AttractionCatalog`](../api/app/models/attraction_catalog.rb)) earn currency passively, scaled by level and your prestige multiplier ([`Simulation::AttractionIncome`](../api/app/services/simulation/attraction_income.rb)):

```
attraction_income = floor( income_per_day × level × game_days × income_multiplier )
```

| Attraction | Income/day | Build cost |
|------------|:----------:|:----------:|
| Dino Carousel | 60 | 5,000 |
| Fossil Museum | 120 | 9,000 |
| Gift Shop | 200 | 14,000 |

All require the **Theme-Park Attractions** research.

## Events & weather

Each game-day, [`Simulation::Events`](../api/app/services/simulation/events.rb) rolls a **20% chance** of a random event ([`EventEffectCatalog`](../api/app/models/event_effect_catalog.rb)). The roll is **deterministic** — seeded from the player id and the absolute game-day — so the same idle gap always yields the same weather.

| Event | Hits | Multiplier | Days | Weight |
|-------|------|:----------:|:----:|:------:|
| Drought | plant farms + hunting grounds | ×0.4 | 3 | 3 |
| Pest Outbreak | plant farms | ×0.5 | 3 | 3 |
| Flood | plant farms | ×0.3 | 2 | 2 |
| Algal Bloom | fishing ponds | ×0.4 | 3 | 2 |
| Heat Spike | all habitats (happiness) | ×0.5 | 2 | 2 |

The **Environmental Control** research softens every effect by halving the gap to 1.0 (e.g. a drought's ×0.4 becomes ×0.7). Active effects are surfaced in the API payload and badged on the affected habitat or farm in the 3D world.

## Goals

Goals ([`GoalCatalog`](../api/app/models/goal_catalog.rb), evaluated by [`Goals::Evaluation`](../api/app/services/goals/evaluation.rb)) award a one-time currency bonus the moment they're met:

| Goal | Requirement | Reward |
|------|-------------|:------:|
| Growing Park | 10 living dinosaurs | 2,000 |
| Thriving Park | avg health ≥ 90 (with ≥ 5 dinos) | 2,500 |
| Self-Sustaining | ≥ 3 dinos, avg health ≥ 50, park ≥ 7 days old, no hand-feeding for 7 days | 3,000 |
| Perfect Genes | a gen-2+ dino with genetic quality ≥ 95 | 4,000 |
| Master Breeder | all 14 species unlocked | 5,000 |
| **Park Legend** | the win condition (below) | 10,000 |

## Prestige & winning

### The win condition

**Park Legend** is the summit. You "win" the moment your park has:

- **15+** living dinosaurs,
- **all 14** species unlocked, and
- **average health ≥ 80**.

Meeting it sets `won = true`, awards 10,000 currency, and unlocks Prestige.

### Prestige (New Game+)

Prestige ([`Prestige::Reset`](../api/app/services/prestige/reset.rb)) wipes the park — dinosaurs, habitats, breedings, research, buildings, everything — and re-seeds a fresh starter park, but with one permanent reward:

```
income_multiplier = 1.0 + 0.1 × prestige_level
```

Each prestige adds a permanent **+10%** to all income (passive *and* attractions). Prestige 3 means every dino and attraction earns 1.3× forever. The loop is the game: become a legend, reset, and become one again — faster, richer, each time.

## Species catalog

The full roster ([`Species`](../api/app/models/species.rb)). "Adjacency" for breeding means same species, or same primary diet **and** era.

| Species | Era | Diet (primary/secondary) | Terrain | Social | Size (lbs) | Rarity | Acquire cost | Gate |
|---------|-----|--------------------------|---------|--------|:----------:|--------|:------------:|------|
| Coelophysis | Triassic | meat | forest | solitary | 60 | common | 1,500 | — |
| Plateosaurus | Triassic | plants | forest | herd | 4,000 | common | 1,500 | — |
| Herrerasaurus | Triassic | meat / insects | grassland | pair | 500 | uncommon | 3,500 | — |
| Stegosaurus ★ | Jurassic | plants | forest | herd | 11,000 | common | 1,500 | starter |
| Brachiosaurus | Jurassic | plants | grassland | herd | 62,000 | uncommon | 3,500 | — |
| Dilophosaurus | Jurassic | meat / fish | forest | pair | 900 | uncommon | 3,500 | — |
| Allosaurus | Jurassic | meat / insects | grassland | pair | 4,000 | rare | 7,000 | — |
| Triceratops ★ | Cretaceous | plants / insects | grassland | herd | 13,000 | common | 1,500 | starter |
| Velociraptor ★ | Cretaceous | meat / insects | grassland | pair | 35 | common | 1,500 | starter |
| Parasaurolophus | Cretaceous | plants / insects | wetland | herd | 5,000 | common | 1,500 | — |
| Ankylosaurus | Cretaceous | plants | forest | solitary | 16,000 | uncommon | 3,500 | — |
| Tyrannosaurus | Cretaceous | meat | grassland | solitary | 16,000 | rare | 7,000 | needs 8 dinos |
| Pteranodon | Cretaceous | fish | aquatic | pair | 50 | uncommon | 3,500 | Piscivore Husbandry |
| Spinosaurus | Cretaceous | fish / meat | aquatic | solitary | 16,000 | rare | 7,000 | Piscivore Husbandry |

Acquiring a non-starter ([`SpeciesAcquisition`](../api/app/services/species_acquisition.rb)) checks its research gate, population milestone, and your currency, then spawns a specimen and records the unlock permanently (so it counts toward Master Breeder even if that specimen later dies).

---

Next: how this is organized in code — **[Backend](backend.md)**.
