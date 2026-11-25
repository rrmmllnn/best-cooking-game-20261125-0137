// The screenshot scenes behind ?shot=start|play|serve|end. Each one sets the kitchen up with
// the game's own rules — real tickets, a real patty on the grill, real layers on the plate — and
// steps the world forward a fixed number of steps, so the frame is what a short game really
// looks like and the same seed always gives the same frame.

import { STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 4;
const PLAY_SECONDS = 24;

/**
 * Set `kitchen` to the named scene (start, play, serve or end; any other name is start) and
 * return the screen to draw over it and the best shift total to show.
 */
export function stageShot(name, kitchen) {
  kitchen.reset();
  const state = kitchen.state;

  if (name === 'play' || name === 'serve' || name === 'end') {
    // A busy mid-shift kitchen: two tickets waiting, a third arriving, coins already earned.
    state.orders = [];
    kitchen.spawnOrder('classic');
    kitchen.spawnOrder('deluxe');
    kitchen.spawnOrder('garden');
    state.orders[0].patience = 34;
    state.orders[0].maxPatience = 46;
    state.orders[1].patience = 22;
    state.orders[1].maxPatience = 46;
    state.orders[2].patience = 40;
    state.orders[2].maxPatience = 46;
    state.coins = 24;
    state.served = 2;
    state.combo = 2;
    state.bestCombo = 3;
    state.timeLeft = 96;
    state.elapsed = 54;
    state.level = 2;
    // A patty halfway through its grill time, and a burger mid-assembly on the plate.
    // (No long step afterwards: stepping would cook the patty past done and burn it.)
    kitchen.addBin('patty');
    kitchen.state.grill[0].progress = 3.4;
    kitchen.addBin('bun');
    kitchen.addBin('lettuce');
    if (name === 'serve') {
      // Finish the Classic Burger so the plate is ready and the SERVE button glows.
      kitchen.state.grill[0].mode = 'done';
      kitchen.state.grill[0].progress = 6.2;
      kitchen.grillClick(0);
      kitchen.addBin('tomato');
      state.coins = 31;
      state.timeLeft = 88;
      kitchen.say('Classic Burger complete — serve it while it is hot!');
    }
    if (name === 'end') {
      state.coins = 86;
      state.served = 7;
      state.missed = 1;
      state.combo = 0;
      state.bestCombo = 4;
      state.timeLeft = 0;
      state.orders = [];
      state.plate = [];
      state.grill = [
        { mode: 'empty', progress: 0 },
        { mode: 'empty', progress: 0 },
      ];
      kitchen.say('Shift complete — seven dishes served. What a rush!');
      return { screen: SCREEN_OVER, best: 86 };
    }
    return { screen: SCREEN_PLAY, best: 86 };
  }

  for (let index = 0; index < START_SECONDS / STEP; index += 1) kitchen.step(STEP);
  return { screen: SCREEN_TITLE, best: 86 };
}
