// Boot and the one loop: input is read every frame, the kitchen advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is there.
// The game moves between four screens: title, play, paused and shift over.
//
// ?seed=N fixes the ticket order. ?shot=start|play|serve|end (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createKitchen, EVENT_BURNT, EVENT_OVER, EVENT_READY, EVENT_SERVE, EVENT_WRONG } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_SERVE, ACTION_TRASH, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createSfx } from './audio.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const kitchen = createKitchen(createRandom(seed));
// Debug handle for play-testing (read-only state inspection from the console).
window.__kitchen = kitchen;
const renderer = createRenderer(canvas);
const sfx = createSfx();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best total then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, kitchen);
  let painted = 0;
  function paint() {
    renderer.draw(kitchen.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each serve.
  function announce(message) {
    status.textContent = message;
  }

  function startShift() {
    kitchen.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Shift started. Cook every ticket before patience runs out.');
  }

  function endShift() {
    screen = SCREEN_OVER;
    if (kitchen.state.coins > best) {
      best = kitchen.state.coins;
      saveBest(best);
    }
    sfx.setSizzle(false);
    sfx.over();
    announce(`Shift over. You earned $${kitchen.state.coins}. Best $${best}.`);
  }

  function playEvent(events) {
    if (events & EVENT_SERVE) sfx.serve();
    else if (events & EVENT_WRONG) sfx.wrong();
    if (events & EVENT_READY) sfx.ready();
    if (events & EVENT_BURNT) sfx.burn();
    if (events & EVENT_OVER) endShift();
  }

  function applyClicks() {
    const clicks = input.takeClicks();
    // A click anywhere on the title or shift-over screen opens a new shift, even when it
    // lands on a bin or the grill: those are game actions, not a start button.
    if (clicks.length > 0 && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startShift();
      return;
    }
    for (const action of clicks) {
      if (screen !== SCREEN_PLAY) continue;
      sfx.unlock();
      if (action.kind === 'bin') {
        const events = kitchen.addBin(['bun', 'patty', 'lettuce', 'tomato', 'cheese', 'onion'][action.index]);
        if (events) sfx.add();
        playEvent(events);
      } else if (action.kind === 'grill') {
        const events = kitchen.grillClick(action.index);
        if (events) sfx.add();
        playEvent(events);
      }
    }
  }

  function handleFlags() {
    const flags = input.takeFlags();
    if (!flags) return;
    sfx.unlock();
    if (flags & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startShift();
    else if (flags & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      sfx.setSizzle(false);
      announce('Paused.');
    } else if (flags & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Cooking again.');
    } else if (flags & ACTION_SERVE && screen === SCREEN_PLAY) {
      playEvent(kitchen.serveClick());
    } else if (flags & ACTION_TRASH && screen === SCREEN_PLAY) {
      kitchen.trashClick();
      sfx.click();
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      kitchen.step(STEP);
      return;
    }
    const events = kitchen.step(STEP);
    sfx.setSizzle(kitchen.state.grill.some((slot) => slot.mode === 'cooking'));
    playEvent(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleFlags();
    applyClicks();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(kitchen.state, screen, best);
  }

  // Leaving the tab pauses a running shift rather than letting tickets expire unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      sfx.setSizzle(false);
      announce('Paused.');
    }
  });

  announce('Sizzle and Serve. Press Space or click to open the kitchen.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
