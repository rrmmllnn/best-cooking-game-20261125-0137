// The kitchen's rules and state, with no drawing and no browser in it: tickets on the order
// board, patties on the grill, layers on the plate, coins, combo, patience and the shift timer.
// step() advances one fixed step and returns what happened as bit flags, so the caller can play
// a sound or announce it without the world knowing about screens or speakers.

import {
  DISHES,
  GRILL,
  LEVEL_SECONDS,
  PATIENCE,
  PLATE_MAX,
  SHIFT_SECONDS,
  SPAWN,
  dishById,
} from './config.js';
import { pick } from './random.js';

export const EVENT_SERVE = 1;
export const EVENT_WRONG = 2;
export const EVENT_EXPIRED = 4;
export const EVENT_OVER = 8;
export const EVENT_READY = 16;
export const EVENT_BURNT = 32;
export const EVENT_ADD = 64;

let nextTicket = 1;

function patienceFor(level) {
  return Math.max(PATIENCE.min, PATIENCE.start + PATIENCE.perLevel * (level - 1));
}

function spawnEvery(level) {
  return Math.max(SPAWN.min, SPAWN.start + SPAWN.perLevel * (level - 1));
}

/** Do two ingredient lists hold the same items, ignoring order? */
export function sameRecipe(a, b) {
  if (a.length !== b.length) return false;
  const rest = [...b];
  for (const item of a) {
    const at = rest.indexOf(item);
    if (at === -1) return false;
    rest.splice(at, 1);
  }
  return true;
}

/** Which open ticket (if any) does this plate complete? Returns its index, or -1. */
export function matchingTicket(plate, orders) {
  for (let index = 0; index < orders.length; index += 1) {
    if (sameRecipe(plate, dishById(orders[index].dish).recipe)) return index;
  }
  return -1;
}

export function createKitchen(random) {
  const state = {
    timeLeft: SHIFT_SECONDS,
    elapsed: 0,
    level: 1,
    coins: 0,
    served: 0,
    missed: 0,
    combo: 0,
    bestCombo: 0,
    orders: [],
    grill: [
      { mode: 'empty', progress: 0 },
      { mode: 'empty', progress: 0 },
    ],
    plate: [],
    spawnTimer: 4,
    message: '',
    messageT: 0,
    floats: [],
    puffs: [],
  };

  function say(text) {
    state.message = text;
    state.messageT = 3;
  }

  function float(text, x, y, color) {
    state.floats.push({ text, x, y, color, life: 1.4 });
  }

  function spawnOrder(forcedDish) {
    if (state.orders.length >= 3) return false;
    const dish = forcedDish ?? pick(random, DISHES).id;
    const patience = patienceFor(state.level);
    state.orders.push({ id: nextTicket, dish, patience, maxPatience: patience });
    nextTicket += 1;
    return true;
  }

  function reset() {
    state.timeLeft = SHIFT_SECONDS;
    state.elapsed = 0;
    state.level = 1;
    state.coins = 0;
    state.served = 0;
    state.missed = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.orders = [];
    state.grill = [
      { mode: 'empty', progress: 0 },
      { mode: 'empty', progress: 0 },
    ];
    state.plate = [];
    state.spawnTimer = 4;
    state.message = '';
    state.messageT = 0;
    state.floats = [];
    state.puffs = [];
    spawnOrder();
    spawnOrder();
  }

  /** Click an ingredient bin: a patty goes to the grill, everything else onto the plate. */
  function addBin(id) {
    if (state.timeLeft <= 0) return 0;
    if (id === 'patty') {
      const slot = state.grill.find((item) => item.mode === 'empty');
      if (!slot) {
        say('Both grill spots are busy!');
        return EVENT_WRONG;
      }
      slot.mode = 'cooking';
      slot.progress = 0;
      say('Patty on the grill — watch it sizzle!');
      return EVENT_ADD;
    }
    if (state.plate.length >= PLATE_MAX) {
      say('The plate is full — serve it or clear it!');
      return EVENT_WRONG;
    }
    state.plate.push(id);
    return EVENT_ADD;
  }

  /** Click a grill slot: take a cooked patty to the plate, or bin a burnt one. */
  function grillClick(slotIndex) {
    const slot = state.grill[slotIndex];
    if (!slot || slot.mode === 'empty') return 0;
    if (slot.mode === 'burnt') {
      slot.mode = 'empty';
      slot.progress = 0;
      say('Burnt patty binned. Fresh one next time!');
      return EVENT_ADD;
    }
    if (slot.mode === 'cooking') {
      say('Still sizzling — wait for the golden ring!');
      return 0;
    }
    if (state.plate.length >= PLATE_MAX) {
      say('The plate is full — serve it or clear it!');
      return EVENT_WRONG;
    }
    state.plate.push('patty');
    slot.mode = 'empty';
    slot.progress = 0;
    return EVENT_ADD;
  }

  /** Serve the plate if it completes an open ticket; otherwise it stays put. */
  function serveClick() {
    if (state.plate.length === 0) {
      say('The plate is empty — build a dish first!');
      return 0;
    }
    const at = matchingTicket(state.plate, state.orders);
    if (at === -1) {
      say('No ticket wants this plate — check the order board!');
      return EVENT_WRONG;
    }
    const order = state.orders[at];
    const dish = dishById(order.dish);
    const tip = Math.round((order.patience / order.maxPatience) * 6);
    const comboBonus = Math.min(state.combo, 5);
    const earned = dish.price + tip + comboBonus;
    state.coins += earned;
    state.served += 1;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.orders.splice(at, 1);
    state.plate = [];
    float(`+$${earned}`, 860, 150, '#2e7d32');
    say(`${dish.name} served! +$${earned}${state.combo > 1 ? ` — combo x${state.combo}!` : ''}`);
    return EVENT_SERVE;
  }

  /** Tip the whole plate into the bin and start the dish again. */
  function trashClick() {
    if (state.plate.length === 0) return 0;
    state.plate = [];
    say('Plate cleared — fresh start!');
    return EVENT_ADD;
  }

  /** One fixed step: timer, levels, tickets, grill, patience, particles. */
  function step(dt) {
    let events = 0;
    if (state.timeLeft <= 0) return events;
    state.elapsed += dt;
    state.timeLeft = Math.max(0, state.timeLeft - dt);
    state.level = Math.min(3, 1 + Math.floor(state.elapsed / LEVEL_SECONDS));
    if (state.messageT > 0) state.messageT -= dt;

    for (const item of state.floats) item.life -= dt;
    state.floats = state.floats.filter((item) => item.life > 0);
    for (const puff of state.puffs) {
      puff.y -= 26 * dt;
      puff.life -= dt;
    }
    state.puffs = state.puffs.filter((item) => item.life > 0);

    if (state.orders.length < 3) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnOrder();
        state.spawnTimer = spawnEvery(state.level);
      }
    }

    for (const slot of state.grill) {
      if (slot.mode === 'cooking') {
        slot.progress += dt;
        if (Math.random() < dt * 6) {
          state.puffs.push({ x: 415 + Math.random() * 220, y: 150, life: 0.9, size: 5 + Math.random() * 7 });
        }
        if (slot.progress >= GRILL.cookSeconds && slot.progress - dt < GRILL.cookSeconds) {
          slot.mode = 'done';
          events |= EVENT_READY;
        }
      } else if (slot.mode === 'done') {
        slot.progress += dt;
        if (slot.progress >= GRILL.burnSeconds) {
          slot.mode = 'burnt';
          events |= EVENT_BURNT;
          say('A patty burnt on the grill!');
        }
      }
    }

    for (let index = state.orders.length - 1; index >= 0; index -= 1) {
      const order = state.orders[index];
      order.patience -= dt;
      if (order.patience <= 0) {
        state.orders.splice(index, 1);
        state.missed += 1;
        state.combo = 0;
        events |= EVENT_EXPIRED;
        say('A customer stormed out — too slow!');
      }
    }

    if (state.timeLeft <= 0) {
      events |= EVENT_OVER;
      for (const slot of state.grill) {
        slot.mode = 'empty';
        slot.progress = 0;
      }
    }
    return events;
  }

  reset();
  return {
    state,
    reset,
    step,
    spawnOrder,
    addBin,
    grillClick,
    serveClick,
    trashClick,
    say,
  };
}
