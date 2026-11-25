// Sizzle & Serve: every tuning number, dish, ingredient and screen rectangle in one place.
// The kitchen is a fixed 1280x720 logical stage; the renderer scales it to the window, so no
// rule below depends on the size of the screen it is played on.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Length of one dinner shift, in seconds. When it hits zero the shift ends. */
export const SHIFT_SECONDS = 150;

/** How long a patty takes on the grill to be perfectly cooked, and when it burns. */
export const GRILL = { cookSeconds: 6, burnSeconds: 13, slots: 2 };

/** A plate holds at most this many layers before it is full. */
export const PLATE_MAX = 6;

/** Where the best shift total is kept between visits (this browser only). */
export const BEST_KEY = 'sizzle-and-serve.best-coins';

export const INGREDIENTS = [
  { id: 'bun', name: 'Bun', key: '1', color: '#e9b872', dark: '#b97f35', shape: 'dome' },
  { id: 'patty', name: 'Patty', key: '2', color: '#8a4f2c', dark: '#5d3016', shape: 'slab' },
  { id: 'lettuce', name: 'Lettuce', key: '3', color: '#79c94f', dark: '#3f8f2a', shape: 'leaf' },
  { id: 'tomato', name: 'Tomato', key: '4', color: '#e8442e', dark: '#a11f12', shape: 'disc' },
  { id: 'cheese', name: 'Cheese', key: '5', color: '#f7c948', dark: '#c8931a', shape: 'melt' },
  { id: 'onion', name: 'Onion', key: '6', color: '#c9a6dd', dark: '#7d5a9e', shape: 'rings' },
];

export function ingredientById(id) {
  for (const item of INGREDIENTS) if (item.id === id) return item;
  return null;
}

/** The menu: four dishes, each a multiset of ingredients and a base price in coins. */
export const DISHES = [
  { id: 'classic', name: 'Classic Burger', recipe: ['bun', 'patty', 'lettuce', 'tomato'], price: 10 },
  { id: 'deluxe', name: 'Cheese Deluxe', recipe: ['bun', 'patty', 'cheese', 'onion'], price: 12 },
  { id: 'garden', name: 'Garden Stack', recipe: ['lettuce', 'tomato', 'cheese', 'onion'], price: 8 },
  { id: 'double', name: 'Double Stack', recipe: ['bun', 'patty', 'patty', 'cheese'], price: 15 },
];

export function dishById(id) {
  for (const dish of DISHES) if (dish.id === id) return dish;
  return null;
}

/** Seconds a ticket waits before the customer storms out; shorter as the shift heats up. */
export const PATIENCE = { start: 46, min: 28, perLevel: -6 };

/** Seconds between new tickets arriving; the kitchen gets busier as the shift goes on. */
export const SPAWN = { start: 15, min: 8, perLevel: -2.5 };

/** A level lasts this many seconds of the shift; levels speed tickets and grill demand. */
export const LEVEL_SECONDS = 50;

/** Tip for a fast serve: up to this many extra coins when patience is still full. */
export const TIP_MAX = 6;

export const PALETTE = {
  wall: '#f3e3c2',
  wallTile: '#e8d3a8',
  shelf: '#7a4a26',
  counter: '#a9713f',
  counterTop: '#c98d54',
  steel: '#b9c0c9',
  steelDark: '#7d8590',
  board: '#2e4d3a',
  boardFrame: '#6b4423',
  ticket: '#fff8e6',
  ticketEdge: '#e0cfa5',
  text: '#2b2118',
  cream: '#fff6e3',
  muted: '#8a7a63',
  hud: '#3a2415',
  hudText: '#ffe9b8',
  gold: '#f7c948',
  green: '#5da83c',
  red: '#d63c2a',
  plate: '#f4f1ea',
  flame: '#ff9a3c',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/**
 * Every clickable rectangle on the stage, computed once from FIELD. The renderer draws these
 * exact boxes and the input layer hit-tests them, so what you see is what you can click.
 */
export const LAYOUT = {
  hud: { x: 0, y: 0, width: 1280, height: 58 },
  board: { x: 16, y: 70, width: 276, height: 332 },
  grill: { x: 316, y: 70, width: 372, height: 200 },
  grillSlotA: { x: 340, y: 118, width: 150, height: 128 },
  grillSlotB: { x: 514, y: 118, width: 150, height: 128 },
  plate: { x: 712, y: 70, width: 300, height: 200 },
  serve: { x: 1036, y: 118, width: 116, height: 62 },
  trash: { x: 1036, y: 192, width: 116, height: 54 },
  bins: { x: 316, y: 296, width: 948, height: 164 },
  binWidth: 150,
  binGap: 8,
  help: { x: 0, y: 668, width: 1280, height: 52 },
};

/** The rectangle of ingredient bin `index` (0-based) along the counter. */
export function binRect(index) {
  return {
    x: LAYOUT.bins.x + index * (LAYOUT.binWidth + LAYOUT.binGap),
    y: LAYOUT.bins.y,
    width: LAYOUT.binWidth,
    height: LAYOUT.bins.height,
  };
}
