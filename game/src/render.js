// Drawing only: the kitchen's state and the current screen in, pixels out. The 1280x720 stage
// is scaled to fit the window and centred, the margin filled with the wall colour. Everything is
// drawn with canvas shapes and text — no image files, no network — so the game looks the same
// offline as it does in the screenshots.

import { FIELD, FONT, INGREDIENTS, LAYOUT, PALETTE, PLATE_MAX, binRect, dishById, ingredientById } from './config.js';
import { matchingTicket } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function clockText(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${rest < 10 ? '0' : ''}${rest}`;
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align = 'left', bold = false) {
    const key = `${size}${bold ? 'b' : ''}`;
    if (!fonts.has(key)) fonts.set(key, `${bold ? '700 ' : ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  /** One ingredient drawn big: a dome, slab, leaf, disc, melt or rings, by its shape. */
  function drawIngredient(id, x, y, width, height) {
    const item = ingredientById(id);
    if (!item) return;
    const cx = x + width / 2;
    const cy = y + height / 2;
    context.fillStyle = item.color;
    context.strokeStyle = item.dark;
    context.lineWidth = 3;
    if (item.shape === 'dome') {
      context.beginPath();
      context.moveTo(x + 6, y + height - 6);
      context.quadraticCurveTo(cx, y - height * 0.35, x + width - 6, y + height - 6);
      context.closePath();
      context.fill();
      context.stroke();
      context.fillStyle = 'rgba(255,255,255,0.55)';
      context.beginPath();
      context.arc(cx - width * 0.18, cy - height * 0.18, 4, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.arc(cx + width * 0.14, cy - height * 0.05, 3, 0, Math.PI * 2);
      context.fill();
    } else if (item.shape === 'slab') {
      roundRect(context, x + 4, cy - height * 0.26, width - 8, height * 0.52, 10);
      context.fill();
      context.stroke();
      context.strokeStyle = 'rgba(0,0,0,0.25)';
      context.beginPath();
      context.moveTo(x + 14, cy);
      context.lineTo(x + width - 14, cy);
      context.stroke();
    } else if (item.shape === 'leaf') {
      context.beginPath();
      for (let wave = 0; wave < 3; wave += 1) {
        const wx = x + 8 + wave * ((width - 16) / 3);
        context.arc(wx + (width - 16) / 6, cy, (width - 16) / 6, Math.PI, 0);
      }
      context.lineTo(x + width - 6, cy + height * 0.22);
      context.lineTo(x + 6, cy + height * 0.22);
      context.closePath();
      context.fill();
      context.stroke();
    } else if (item.shape === 'disc') {
      context.beginPath();
      context.ellipse(cx, cy, width * 0.42, height * 0.34, 0, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.fillStyle = 'rgba(255,255,255,0.35)';
      context.beginPath();
      context.ellipse(cx - width * 0.14, cy - height * 0.1, width * 0.16, height * 0.1, 0, 0, Math.PI * 2);
      context.fill();
    } else if (item.shape === 'melt') {
      context.beginPath();
      context.moveTo(x + 6, y + 6);
      context.lineTo(x + width - 6, y + 6);
      context.lineTo(x + width - 14, y + height - 8);
      context.quadraticCurveTo(cx, y + height + 6, x + 18, y + height - 10);
      context.closePath();
      context.fill();
      context.stroke();
    } else {
      for (let ring = 3; ring >= 1; ring -= 1) {
        context.beginPath();
        context.arc(cx, cy, (width * 0.42 * ring) / 3, 0, Math.PI * 2);
        context.fillStyle = ring === 2 ? '#efe6f7' : item.color;
        context.fill();
        context.strokeStyle = item.dark;
        context.stroke();
      }
    }
  }

  function drawWallAndCounter() {
    context.fillStyle = PALETTE.wall;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.wallTile;
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 16; col += 1) {
        if ((row + col) % 2 === 0) context.fillRect(col * 80 + (row % 2) * 40, 58 + row * 22, 78, 20);
      }
    }
    // A rail of hanging utensils on the free wall right of the plate.
    context.strokeStyle = '#5d3a1a';
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(1180, 84);
    context.lineTo(1252, 84);
    context.stroke();
    // Ladle: a stick with a bowl. Spatula: a stick with a flat head. Whisk: looped wires.
    context.beginPath();
    context.moveTo(1196, 84);
    context.lineTo(1196, 122);
    context.stroke();
    context.beginPath();
    context.arc(1196, 134, 12, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(1218, 84);
    context.lineTo(1218, 118);
    context.stroke();
    context.fillStyle = '#8a8f98';
    roundRect(context, 1210, 118, 16, 26, 4);
    context.fill();
    context.strokeStyle = '#5d3a1a';
    context.beginPath();
    context.moveTo(1240, 84);
    context.lineTo(1240, 116);
    context.stroke();
    context.beginPath();
    context.ellipse(1240, 132, 8, 16, 0, 0, Math.PI * 2);
    context.stroke();
    // Wooden counter the bins sit on, with cupboards, clean plates and a herb pot below.
    context.fillStyle = PALETTE.counter;
    context.fillRect(0, 460, FIELD.width, 208);
    context.fillStyle = PALETTE.counterTop;
    context.fillRect(0, 460, FIELD.width, 18);
    context.strokeStyle = 'rgba(0,0,0,0.25)';
    context.lineWidth = 3;
    for (let door = 0; door < 4; door += 1) {
      const dx = 40 + door * 300;
      context.strokeRect(dx, 500, 260, 140);
      context.fillStyle = '#5d3a1a';
      context.beginPath();
      context.arc(dx + 232, 570, 7, 0, Math.PI * 2);
      context.fill();
    }
    // Stack of clean plates, left of the cupboards.
    for (let plate = 0; plate < 4; plate += 1) {
      context.fillStyle = PALETTE.plate;
      context.beginPath();
      context.ellipse(1140, 632 - plate * 7, 52, 9, 0, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#c9c2b2';
      context.lineWidth = 2;
      context.stroke();
    }
    // Potted herb on the counter front, right side.
    context.fillStyle = '#b0552f';
    roundRect(context, 1220, 600, 36, 40, 6);
    context.fill();
    context.fillStyle = '#5da83c';
    context.beginPath();
    context.arc(1238, 592, 14, 0, Math.PI * 2);
    context.arc(1226, 584, 10, 0, Math.PI * 2);
    context.arc(1250, 584, 10, 0, Math.PI * 2);
    context.fill();
  }

  function drawHud(state, best) {
    const hud = LAYOUT.hud;
    context.fillStyle = PALETTE.hud;
    context.fillRect(hud.x, hud.y, hud.width, hud.height);
    text('SIZZLE & SERVE', 20, 38, 26, PALETTE.hudText, 'left', true);
    context.fillStyle = PALETTE.gold;
    context.beginPath();
    context.arc(268, 29, 13, 0, Math.PI * 2);
    context.fill();
    text('$', 268, 34, 18, '#7a5a00', 'center', true);
    text(`$${state.coins}`, 288, 38, 26, '#ffffff', 'left', true);
    text(`Best $${best}`, 380, 36, 17, PALETTE.hudText, 'left');
    // Shift timer: big clock in the middle with a draining bar beneath it.
    const fraction = state.timeLeft / 150;
    text(clockText(state.timeLeft), 640, 34, 30, state.timeLeft <= 20 ? '#ff8a7a' : '#ffffff', 'center', true);
    context.fillStyle = 'rgba(255,255,255,0.25)';
    roundRect(context, 540, 44, 200, 8, 4);
    context.fill();
    context.fillStyle = fraction > 0.5 ? PALETTE.green : fraction > 0.25 ? PALETTE.gold : PALETTE.red;
    roundRect(context, 540, 44, Math.max(8, 200 * fraction), 8, 4);
    context.fill();
    text(`Served ${state.served}`, 1000, 36, 20, '#ffffff', 'left', true);
    text(`Day 1  •  Level ${state.level}`, 1130, 36, 18, PALETTE.hudText, 'left');
    if (state.combo >= 2) {
      context.fillStyle = '#ff9a3c';
      roundRect(context, 1000, 40, 96, 16, 8);
      context.fill();
      text(`COMBO x${state.combo}`, 1048, 52, 12, '#ffffff', 'center', true);
    }
  }

  function drawFace(x, y, radius, fraction) {
    context.fillStyle = '#ffd9a8';
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#2b2118';
    context.beginPath();
    context.arc(x - radius * 0.35, y - radius * 0.15, 2.5, 0, Math.PI * 2);
    context.arc(x + radius * 0.35, y - radius * 0.15, 2.5, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#2b2118';
    context.lineWidth = 2.5;
    context.beginPath();
    if (fraction > 0.5) context.arc(x, y + radius * 0.1, radius * 0.45, 0.15 * Math.PI, 0.85 * Math.PI);
    else if (fraction > 0.25) context.arc(x, y + radius * 0.45, radius * 0.3, 1.15 * Math.PI, 1.85 * Math.PI);
    else context.arc(x, y + radius * 0.75, radius * 0.35, 1.15 * Math.PI, 1.85 * Math.PI);
    context.stroke();
  }

  function drawBoard(state) {
    const board = LAYOUT.board;
    context.fillStyle = PALETTE.boardFrame;
    roundRect(context, board.x - 6, board.y - 6, board.width + 12, board.height + 12, 12);
    context.fill();
    context.fillStyle = PALETTE.board;
    roundRect(context, board.x, board.y, board.width, board.height, 8);
    context.fill();
    text('ORDER BOARD', board.x + board.width / 2, board.y + 30, 22, '#ffe9b8', 'center', true);
    if (state.orders.length === 0) {
      text('No tickets —', board.x + board.width / 2, board.y + 120, 18, '#cfe3d2', 'center');
      text('a breather!', board.x + board.width / 2, board.y + 146, 18, '#cfe3d2', 'center');
    }
    state.orders.forEach((order, index) => {
      const dish = dishById(order.dish);
      const y = board.y + 44 + index * 94;
      const fraction = Math.max(0, order.patience / order.maxPatience);
      context.fillStyle = PALETTE.ticket;
      roundRect(context, board.x + 10, y, board.width - 20, 84, 8);
      context.fill();
      context.strokeStyle = PALETTE.ticketEdge;
      context.lineWidth = 2;
      context.stroke();
      drawFace(board.x + 38, y + 26, 16, fraction);
      text(`#${order.id}  ${dish.name}`, board.x + 62, y + 24, 18, PALETTE.text, 'left', true);
      text(`$${dish.price}`, board.x + board.width - 22, y + 24, 18, '#2e7d32', 'right', true);
      dish.recipe.forEach((id, chip) => {
        const item = ingredientById(id);
        const chipX = board.x + 62 + (chip % 2) * 108;
        const chipY = y + 40 + Math.floor(chip / 2) * 16;
        context.fillStyle = item.color;
        context.beginPath();
        context.arc(chipX + 7, chipY, 7, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = item.dark;
        context.lineWidth = 2;
        context.stroke();
        text(item.name, chipX + 17, chipY + 4, 11, PALETTE.muted, 'left');
      });
      context.fillStyle = 'rgba(0,0,0,0.15)';
      roundRect(context, board.x + 14, y + 70, board.width - 28, 10, 5);
      context.fill();
      context.fillStyle = fraction > 0.5 ? PALETTE.green : fraction > 0.25 ? '#e8a13c' : PALETTE.red;
      roundRect(context, board.x + 14, y + 70, Math.max(10, (board.width - 28) * fraction), 10, 5);
      context.fill();
    });
  }

  function drawGrill(state) {
    const grill = LAYOUT.grill;
    context.fillStyle = PALETTE.steelDark;
    roundRect(context, grill.x, grill.y, grill.width, grill.height, 12);
    context.fill();
    context.fillStyle = PALETTE.steel;
    roundRect(context, grill.x + 8, grill.y + 8, grill.width - 16, grill.height - 16, 8);
    context.fill();
    text('GRILL', grill.x + 18, grill.y + 30, 18, '#3a3f47', 'left', true);
    text('click a patty bin to start one', grill.x + grill.width - 14, grill.y + 28, 13, '#5d636e', 'right');
    const slots = [LAYOUT.grillSlotA, LAYOUT.grillSlotB];
    state.grill.forEach((slot, index) => {
      const box = slots[index];
      context.fillStyle = '#2b2f36';
      roundRect(context, box.x, box.y, box.width, box.height, 10);
      context.fill();
      context.strokeStyle = '#565d68';
      context.lineWidth = 3;
      for (let line = 1; line < 5; line += 1) {
        context.beginPath();
        context.moveTo(box.x + 10, box.y + (line * box.height) / 5);
        context.lineTo(box.x + box.width - 10, box.y + (line * box.height) / 5);
        context.stroke();
      }
      if (slot.mode === 'empty') {
        text('empty', box.x + box.width / 2, box.y + box.height / 2 + 6, 16, '#8b93a3', 'center');
        return;
      }
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2 - 6;
      if (slot.mode === 'burnt') {
        context.fillStyle = '#17130f';
        context.beginPath();
        context.arc(cx, cy, 34, 0, Math.PI * 2);
        context.fill();
        text('BURNT!', cx, box.y + box.height - 14, 16, '#ff8a7a', 'center', true);
        text('click to bin it', cx, box.y + box.height - 2, 11, '#c9cdd4', 'center');
        return;
      }
      // Flames licking the bottom corners while a patty cooks; the label sits at the top.
      if (slot.mode === 'cooking') {
        context.fillStyle = PALETTE.flame;
        for (const fx of [box.x + 22, box.x + box.width - 22]) {
          context.beginPath();
          context.arc(fx, box.y + box.height - 14, 8, 0, Math.PI * 2);
          context.fill();
        }
        text('sizzling…', cx, box.y + box.height - 8, 13, '#e8e0d0', 'center');
      }
      const cooked = Math.min(1, slot.progress / 6);
      context.fillStyle = slot.mode === 'done' ? '#6b3a1f' : cooked > 0.5 ? '#7d4a26' : '#c96f5a';
      context.beginPath();
      context.arc(cx, cy, 34, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#3a2415';
      context.lineWidth = 3;
      context.stroke();
      context.strokeStyle = slot.mode === 'done' ? PALETTE.green : '#ffe9b8';
      context.lineWidth = 6;
      context.beginPath();
      context.arc(cx, cy, 42, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cooked);
      context.stroke();
      if (slot.mode === 'done') {
        text('READY!', cx, box.y + box.height - 14, 16, '#8fe388', 'center', true);
        text('click to plate it', cx, box.y + box.height - 2, 11, '#c9cdd4', 'center');
      }
    });
    // Steam puffs rising off the grill.
    for (const puff of state.puffs) {
      context.fillStyle = `rgba(255,255,255,${Math.max(0, puff.life * 0.5)})`;
      context.beginPath();
      context.arc(puff.x, puff.y, puff.size, 0, Math.PI * 2);
      context.fill();
    }
  }

  /** One plate layer: the same ingredient drawn as a flat strip that fits its 15px slot. */
  function drawPlateLayer(id, x, y, width, height) {
    const item = ingredientById(id);
    if (!item) return;
    const cx = x + width / 2;
    context.fillStyle = item.color;
    context.strokeStyle = item.dark;
    context.lineWidth = 2;
    if (id === 'bun') {
      context.beginPath();
      context.moveTo(x + 4, y + height);
      context.quadraticCurveTo(cx, y - height * 0.9, x + width - 4, y + height);
      context.closePath();
      context.fill();
      context.stroke();
    } else if (id === 'lettuce') {
      context.beginPath();
      for (let wave = 0; wave < 6; wave += 1) {
        const wx = x + 4 + wave * ((width - 8) / 6);
        context.arc(wx + (width - 8) / 12, y + height / 2, (width - 8) / 12, Math.PI, 0);
      }
      context.lineTo(x + width - 4, y + height);
      context.lineTo(x + 4, y + height);
      context.closePath();
      context.fill();
      context.stroke();
    } else if (id === 'cheese') {
      context.beginPath();
      context.moveTo(x + 4, y + 2);
      context.lineTo(x + width - 4, y + 2);
      context.lineTo(x + width - 12, y + height);
      context.quadraticCurveTo(cx, y + height + 5, x + 14, y + height);
      context.closePath();
      context.fill();
      context.stroke();
    } else if (id === 'onion') {
      for (let ring = 0; ring < 4; ring += 1) {
        context.strokeStyle = ring % 2 === 0 ? item.color : '#efe6f7';
        context.lineWidth = 3;
        context.beginPath();
        context.arc(cx - 60 + ring * 40, y + height / 2, 7, 0, Math.PI * 2);
        context.stroke();
      }
    } else {
      roundRect(context, x + 4, y + 1, width - 8, height - 2, 6);
      context.fill();
      context.stroke();
    }
  }

  function drawPlate(state) {
    const box = LAYOUT.plate;
    context.fillStyle = PALETTE.cream;
    roundRect(context, box.x, box.y, box.width, box.height, 12);
    context.fill();
    context.strokeStyle = '#d9c9a3';
    context.lineWidth = 2;
    context.stroke();
    text('YOUR PLATE', box.x + 18, box.y + 30, 18, PALETTE.text, 'left', true);
    const ready = matchingTicket(state.plate, state.orders) !== -1;
    text(ready ? 'READY TO SERVE!' : `${state.plate.length}/${PLATE_MAX} layers`, box.x + box.width - 16, box.y + 30, 15, ready ? '#2e7d32' : PALETTE.muted, 'right', true);
    const plateY = box.y + 168;
    context.fillStyle = PALETTE.plate;
    context.beginPath();
    context.ellipse(box.x + box.width / 2, plateY, 118, 20, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#c9c2b2';
    context.lineWidth = 2;
    context.stroke();
    if (state.plate.length === 0) {
      text('Build a dish from the bins below', box.x + box.width / 2, plateY - 44, 15, PALETTE.muted, 'center');
    }
    // Stack the layers bottom-up as flat strips that fit the plate, so the dish grows
    // as ingredients land on it and every layer stays readable.
    const layerHeight = 15;
    state.plate.forEach((id, index) => {
      const layerY = plateY - 14 - (index + 1) * layerHeight;
      const layerX = box.x + box.width / 2 - 92;
      drawPlateLayer(id, layerX, layerY, 184, layerHeight);
    });
    // SERVE button, glowing when the plate completes a ticket.
    const serve = LAYOUT.serve;
    const pulse = ready ? 0.75 + 0.25 * Math.sin(Date.now() / 180) : 1;
    context.fillStyle = ready ? `rgba(46,125,50,${pulse})` : '#9aa0a8';
    roundRect(context, serve.x, serve.y, serve.width, serve.height, 12);
    context.fill();
    text('SERVE', serve.x + serve.width / 2, serve.y + 26, 22, '#ffffff', 'center', true);
    text('SPACE', serve.x + serve.width / 2, serve.y + 48, 12, '#e8f5e9', 'center');
    const trash = LAYOUT.trash;
    context.fillStyle = '#b0552f';
    roundRect(context, trash.x, trash.y, trash.width, trash.height, 12);
    context.fill();
    text('CLEAR PLATE', trash.x + trash.width / 2, trash.y + 22, 15, '#ffffff', 'center', true);
    text('BKSP', trash.x + trash.width / 2, trash.y + 42, 11, '#ffd9c9', 'center');
    for (const item of state.floats) {
      context.fillStyle = item.color;
      text(item.text, item.x, item.y - (1.4 - item.life) * 40, 26, item.color, 'center', true);
    }
  }

  function drawBins(state) {
    const bins = LAYOUT.bins;
    text('INGREDIENTS — click a bin (or press its key)', bins.x, bins.y - 8, 17, PALETTE.text, 'left', true);
    text('Patty goes to the grill first!', bins.x + bins.width, bins.y - 8, 15, '#7a4a26', 'right');
    for (let index = 0; index < 6; index += 1) {
      const item = INGREDIENTS[index] ?? null;
      const box = binRect(index);
      const ingredient = ingredientById(item.id);
      context.fillStyle = '#fff8e6';
      roundRect(context, box.x, box.y, box.width, box.height, 12);
      context.fill();
      context.strokeStyle = '#d9c9a3';
      context.lineWidth = 2;
      context.stroke();
      drawIngredient(ingredient.id, box.x + 28, box.y + 18, box.width - 56, 62);
      text(ingredient.name, box.x + box.width / 2, box.y + 112, 19, PALETTE.text, 'center', true);
      text(`key ${ingredient.key}`, box.x + box.width / 2, box.y + 136, 14, PALETTE.muted, 'center');
      if (ingredient.id === 'patty') {
        context.fillStyle = '#ff9a3c';
        roundRect(context, box.x + 34, box.y + 144, box.width - 68, 18, 9);
        context.fill();
        text('→ GRILL', box.x + box.width / 2, box.y + 158, 12, '#ffffff', 'center', true);
      }
    }
  }

  function drawHelp(state) {
    const help = LAYOUT.help;
    context.fillStyle = '#3a2415';
    context.fillRect(help.x, help.y, help.width, help.height);
    if (state.messageT > 0 && state.message) {
      text(state.message, FIELD.width / 2, help.y + 33, 19, '#ffe9b8', 'center', true);
    } else {
      text('Click bins to build • patty cooks on the grill • SPACE serves the plate • BKSP clears • P pauses', FIELD.width / 2, help.y + 33, 17, '#e8dcc8', 'center');
    }
  }

  function drawPanel(title, lines, prompt, accent) {
    const width = 640;
    const height = 150 + lines.length * 34;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(30,18,8,0.55)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = '#fff8e6';
    roundRect(context, x, y, width, height, 16);
    context.fill();
    context.strokeStyle = PALETTE.boardFrame;
    context.lineWidth = 4;
    context.stroke();
    text(title, FIELD.width / 2, y + 66, 44, accent, 'center', true);
    lines.forEach((line, index) => {
      text(line, FIELD.width / 2, y + 112 + index * 34, 20, PALETTE.text, 'center');
    });
    text(prompt, FIELD.width / 2, y + height - 30, 20, '#b0552f', 'center', true);
  }

  /** Paint one frame: the kitchen, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.wall;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawWallAndCounter();
    drawBoard(state);
    drawGrill(state);
    drawPlate(state);
    drawBins(state);
    drawHud(state, best);
    drawHelp(state);
    if (screen === SCREEN_TITLE) {
      drawPanel(
        'SIZZLE & SERVE',
        [
          'Rush Hour Kitchen — cook every ticket before patience runs out!',
          'Click ingredient bins to build dishes. Patties must grill first.',
          'Serve the plate that matches a ticket. Fast serves earn tips.',
          `Best shift so far: $${best}`,
        ],
        'Press SPACE or click to open the kitchen',
        '#b0552f',
      );
    } else if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The grill is holding. The tickets can wait.'], 'Press P to get cooking again', PALETTE.text);
    } else if (screen === SCREEN_OVER) {
      const rating = state.served >= 10 ? 'HEAD CHEF!' : state.served >= 7 ? 'SOUS CHEF!' : state.served >= 4 ? 'LINE COOK!' : 'KEEP PRACTISING!';
      drawPanel(
        'SHIFT OVER!',
        [
          `${rating}  You earned $${state.coins} in one shift.`,
          `Dishes served: ${state.served}  •  Walk-outs: ${state.missed}  •  Best combo: x${state.bestCombo}`,
          `Best shift so far: $${Math.max(best, state.coins)}`,
        ],
        'Press SPACE or click to cook another shift',
        '#2e7d32',
      );
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, drawIngredient };
}
