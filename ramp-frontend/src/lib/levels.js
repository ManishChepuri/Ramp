// Single source of truth for the XP level system: thresholds, display names,
// signature accent colours, and the one-line meaning shown at level-up.
// Everything (sidebar tint, mascot stage, level-up card, XP toast) reads from here.

export const LEVELS = [
  { key: 'visitor',    name: 'Visitor',    xp: 0,    accent: '#8d8d93', blurb: 'Just arrived. Reading the map.' },
  { key: 'tourist',    name: 'Tourist',    xp: 100,  accent: '#08bdba', blurb: 'Getting oriented. Following the trail.' },
  { key: 'resident',   name: 'Resident',   xp: 250,  accent: '#4589ff', blurb: 'You live here now. Know the main streets.' },
  { key: 'local',      name: 'Local',      xp: 500,  accent: '#a56eff', blurb: 'Trusted. You give directions.' },
  { key: 'maintainer', name: 'Maintainer', xp: 1000, accent: '#f1c21b', blurb: 'You own a block. People ask you.' },
]

export const LEVEL_NAMES = LEVELS.map(l => l.name)
export const XP_PER_LEVEL = LEVELS.map(l => l.xp)

/** Index (0–4) of the highest level whose threshold `xp` has reached. */
export function levelIndexForXp(xp) {
  let idx = 0
  for (let i = 0; i < LEVELS.length; i += 1) {
    if (xp >= LEVELS[i].xp) idx = i
  }
  return idx
}

export function levelForXp(xp) {
  return LEVELS[levelIndexForXp(xp)]
}

/** hex + alpha -> rgba() string, so components can tint without CSS color-mix. */
export function hexA(hex, alpha) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}
