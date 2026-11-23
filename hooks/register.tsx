import type { Register, ThemeSetArgs } from 'claude-code'

import { registerGauges, startGauges } from './gauges'
import { makeColors } from './make-colors.js'

// Halftone dusk: the hour after sunset, printed in dots.
const { theme, problems } = makeColors({
  label: 'Halftone dusk',
  only: 'dark',
  roles: { accent: '#ff8a5c', danger: '#e5566b', success: '#88c993', warning: '#f2b44f', pro: '#b18cf2' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#1c1626',
        'surface-1': '#221b2e',
        'surface-2': '#282034',
        'surface-3': '#2a2136',
        'text-primary': '#f4e7e2',
        'text-secondary': '#d6c4c6',
        'text-muted': '#ae9aa8',
      },
    },
  },
})

const W = 1600
const H = 1000
const HORIZON = 640

const n = (v: number) => Math.round(v * 10) / 10

// The sky's dot screen: dots swell as they near the glow on the horizon.
function skyDots(): string {
  const step = 22
  const top = 220
  let out = ''
  for (let row = 0, y = top; y < HORIZON; row++, y += step) {
    const t = (y - top) / (HORIZON - top)
    const r = 0.4 + 6.4 * t * t
    const shift = row % 2 === 0 ? 0 : step / 2
    for (let x = shift; x <= W; x += step) {
      out += `<circle cx="${n(x)}" cy="${y}" r="${n(r)}"/>`
    }
  }
  return out
}

// The sun: a disc of dots, fullest at the middle.
function sunDots(cx: number, cy: number, radius: number): string {
  const step = 13
  let out = ''
  for (let row = 0, y = cy - radius; y <= cy + radius; row++, y += step) {
    const shift = row % 2 === 0 ? 0 : step / 2
    for (let x = cx - radius + shift; x <= cx + radius; x += step) {
      const d = Math.hypot(x - cx, y - cy) / radius
      if (d > 1) continue
      const r = 6.6 * Math.sqrt(1 - d * d) + 0.4
      out += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}"/>`
    }
  }
  return out
}

// The water: dashes that shorten with depth, brightest under the sun.
function reflection(cx: number): string {
  let out = ''
  for (let i = 0, y = HORIZON + 14; y < H; i++, y += 16) {
    const depth = (y - HORIZON) / (H - HORIZON)
    const half = 150 * (1 - depth * 0.6)
    const h = n(3.5 - depth * 2)
    for (let k = -3; k <= 3; k++) {
      const len = n((half / 3.4) * (1 - Math.abs(k) / 4))
      const x = cx + k * (half / 3.2) + (i % 2 === 0 ? 0 : half / 7) - len / 2
      out += `<rect x="${n(x)}" y="${y}" width="${len}" height="${h}" rx="${n(h / 2)}"/>`
    }
  }
  return out
}

const SUN_X = 1240
const SUN_Y = HORIZON - 40

const SCENE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#120d1c"/>
<stop offset="0.35" stop-color="#231833"/>
<stop offset="0.55" stop-color="#4a2240"/>
<stop offset="0.64" stop-color="#8a3a44"/>
<stop offset="0.64" stop-color="#1a1222"/>
<stop offset="1" stop-color="#0f0b15"/>
</linearGradient>
<clipPath id="above"><rect x="0" y="0" width="${W}" height="${HORIZON}"/></clipPath>
</defs>
<style>
.sky { fill: #ff9566; opacity: 0.32; }
.sun { fill: #ffc27a; animation: sink 120s ease-in-out infinite alternate; }
.glint { fill: #ffb07a; opacity: 0.5; animation: glint 9s ease-in-out infinite alternate; }
.stars circle { fill: #f4e7e2; opacity: 0.5; }
@keyframes sink { from { transform: translateY(0); } to { transform: translateY(70px); } }
@keyframes glint { from { opacity: 0.35; } to { opacity: 0.6; } }
</style>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
<g class="stars">
<circle cx="180" cy="90" r="1.6"/><circle cx="420" cy="150" r="1.2"/><circle cx="760" cy="70" r="1.4"/>
<circle cx="1010" cy="130" r="1.1"/><circle cx="1330" cy="60" r="1.7"/><circle cx="1500" cy="170" r="1.2"/>
<circle cx="610" cy="200" r="1"/><circle cx="90" cy="230" r="1.1"/>
</g>
<g class="sky">${skyDots()}</g>
<g clip-path="url(#above)"><g class="sun">${sunDots(SUN_X, SUN_Y, 150)}</g></g>
<rect x="0" y="${HORIZON}" width="${W}" height="2" fill="#ff8a5c" opacity="0.45"/>
<g class="glint">${reflection(SUN_X)}</g>
</svg>`

// A faint dot screen tiled inside the person's bubble.
const BUBBLE = '#33223f'

const LOOK: ThemeSetArgs = {
  colors: theme,
  backdrop: { scene: 'halftone-dusk', glass: { blur: 18, tint: '#1c1626', opacity: 0.74 } },
  style: {
    Heading: { letterSpacing: 0.5 },
    UserMessage: {
      backgroundColor: BUBBLE,
      borderColor: '#ff8a5c',
      borderWidth: 1,
      radius: [16, 16, 4, 16],
      fill: {
        vector: {
          viewBox: 12,
          size: [12, 12],
          repeat: true,
          paths: [
            { d: `M0 0H12V12H0Z`, color: BUBBLE },
            { d: 'M3 3m-1.2 0a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0Z M9 9m-1.2 0a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0Z', color: '#3d2849' },
          ],
        },
      },
    },
    AssistantMessage: { backgroundColor: '#221b2e', radius: 12, padding: 14 },
    ToolUse: { backgroundColor: '#282034', radius: 8, paddingX: 8 },
  },
}

const PLAIN: ThemeSetArgs = { colors: theme, backdrop: LOOK.backdrop }

export const register: Register = on => {
  registerGauges(on)

  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }

    let set
    try {
      set = await $.theme.set(LOOK)
    } catch (error) {
      $.ui.log(String(error))
      set = await $.theme.set(PLAIN)
    }
    if (!set.isDrawn) {
      $.ui.status(set.reason)
    }

    try {
      await startGauges($)
    } catch (error) {
      $.ui.log(`dusk gauges: ${String(error)}`)
    }

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    return <Svg source={SCENE} alt="A sunset printed in halftone dots, the sun slowly sinking toward still water" isInteractive />
  })
}
