// Bob — the level mascot. Five fixed character illustrations (level 1 = bare-
// headed, 2–5 add the hard hat and tools). The art is untouched; the only thing
// added here is motion: a gentle idle float on every level, plus a subtle
// work/hammer-swing lean on levels 2–5 (the ones holding a tool).

import bob1 from '../assets/bob/bob-1.png'
import bob2 from '../assets/bob/bob-2.png'
import bob3 from '../assets/bob/bob-3.png'
import bob4 from '../assets/bob/bob-4.png'
import bob5 from '../assets/bob/bob-5.png'

const SPRITES = [bob1, bob2, bob3, bob4, bob5]

/**
 * @param {number} index   0–4, the level index (0 = Visitor / no helmet).
 * @param {number} px       rendered box size in pixels.
 * @param {boolean} animate set false to freeze all motion (defaults true).
 * @param {boolean} dim     render greyed-out (a level not yet reached).
 * @param {string} [color]  accepted for call-site compatibility; unused (the
 *                          artwork carries its own colours).
 */
export default function Bob({ index = 0, px = 36, animate = true, dim = false }) {
  const lvl = Math.max(0, Math.min(SPRITES.length - 1, index))
  const freeze = animate && !dim ? '' : ' bob-frozen'
  const worker = lvl >= 1 // levels 2–5 hold a tool

  return (
    <span
      className={`bob-idle${freeze}`}
      style={{
        display: 'inline-flex',
        width: px,
        height: px,
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <img
        src={SPRITES[lvl]}
        alt=""
        aria-hidden="true"
        draggable="false"
        className={worker ? `bob-work${freeze}` : undefined}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          transformOrigin: '50% 100%',
          filter: dim ? 'grayscale(1) brightness(1.1)' : undefined,
          opacity: dim ? 0.32 : 1,
          transition: 'opacity 200ms ease, filter 200ms ease',
        }}
      />
    </span>
  )
}
