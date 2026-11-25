// A tiny seeded random source (mulberry32): the same seed deals the same tickets, which is
// what makes the screenshot scenes repeatable from one run to the next.

export function createRandom(seed) {
  let state = seed | 0;
  return function random() {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one entry of `list` using the seeded source. */
export function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}
