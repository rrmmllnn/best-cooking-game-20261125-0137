// Keyboard and pointer input. Clicks are hit-tested against the kitchen's layout rectangles and
// queued as one-shot actions, and keys map to the same actions, so the loop can apply each press
// exactly once per frame and a press between two frames is never lost or counted twice.

import { INGREDIENTS, LAYOUT, binRect } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_SERVE = 4;
export const ACTION_TRASH = 8;

/** A queued click or key action: { kind: 'bin'|'grill'|'serve'|'trash', index } */
export function createInput(canvas) {
  let actions = [];
  let queued = 0;

  function inRect(x, y, box) {
    return x >= box.x && x < box.x + box.width && y >= box.y && y < box.y + box.height;
  }

  function stagePoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    // The renderer letterboxes the 1280x720 stage inside the canvas: undo that mapping.
    const scale = Math.min(rect.width / 1280, rect.height / 720);
    const offsetX = (rect.width - 1280 * scale) / 2;
    const offsetY = (rect.height - 720 * scale) / 2;
    return { x: (clientX - rect.left - offsetX) / scale, y: (clientY - rect.top - offsetY) / scale };
  }

  function clickAt(clientX, clientY) {
    const point = stagePoint(clientX, clientY);
    for (let index = 0; index < INGREDIENTS.length; index += 1) {
      if (inRect(point.x, point.y, binRect(index))) {
        actions.push({ kind: 'bin', index });
        return;
      }
    }
    if (inRect(point.x, point.y, LAYOUT.grillSlotA)) actions.push({ kind: 'grill', index: 0 });
    else if (inRect(point.x, point.y, LAYOUT.grillSlotB)) actions.push({ kind: 'grill', index: 1 });
    else if (inRect(point.x, point.y, LAYOUT.serve)) queued |= ACTION_SERVE;
    else if (inRect(point.x, point.y, LAYOUT.trash)) queued |= ACTION_TRASH;
    else queued |= ACTION_CONFIRM;
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const digit = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'].indexOf(event.code);
    if (digit !== -1) {
      actions.push({ kind: 'bin', index: digit });
    } else if (event.code === 'Space' || event.code === 'Enter') {
      // Space both starts a shift and, mid-shift, serves the plate.
      queued |= ACTION_CONFIRM | ACTION_SERVE;
    } else if (event.code === 'KeyS') {
      queued |= ACTION_SERVE;
    } else if (event.code === 'Backspace' || event.code === 'Delete') {
      queued |= ACTION_TRASH;
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      queued |= ACTION_PAUSE;
    } else {
      return;
    }
    event.preventDefault();
  });
  window.addEventListener('blur', () => {
    actions = [];
  });
  canvas.addEventListener('pointerdown', (event) => {
    clickAt(event.clientX, event.clientY);
  });

  return {
    /** The queued click actions since the last call, in the order they arrived. */
    takeClicks() {
      const taken = actions;
      actions = [];
      return taken;
    },
    /** The one-shot key/button flags since the last call. */
    takeFlags() {
      const taken = queued;
      queued = 0;
      return taken;
    },
  };
}
