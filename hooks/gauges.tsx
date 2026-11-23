import { atom, read, update } from 'claude-code'
import type { AgentInfo, EngineInterface, On, SessionContextUsage, SessionRateLimit } from 'claude-code'

import type { AgentRow, Gauge, Usage } from '../types'

export const PANE = 'dusk-gauges'

const SUN = '#ff8a5c'
const AMBER = '#f2b44f'
const ROSE = '#e5566b'
const LILAC = '#b18cf2'

const usage = atom({ plugin: 'halftone-dusk', key: 'usage' } as const, { contextWindow: 0, limits: [] } as Usage, {
  shape: 'usage-1',
})
const agents = atom({ plugin: 'halftone-dusk', key: 'agents' } as const, [] as AgentRow[], { shape: 'agents-1' })

const ACTIVE = new Set(['pending', 'running', 'waiting'])

function toUsage(context: SessionContextUsage, limits: SessionRateLimit[]): Usage {
  return {
    contextPercent: context.percent,
    contextTokens: context.tokens,
    contextWindow: context.window,
    limits: limits.map(l => ({ kind: l.kind, percentUsed: l.percentUsed, resetsAt: l.resetsAt })),
  }
}

function toRows(list: AgentInfo[]): AgentRow[] {
  return list
    .filter(a => ACTIVE.has(a.status))
    .map(a => ({
      id: a.id,
      type: a.type,
      label: (a.label.split('\n')[0] ?? '').slice(0, 80),
      status: a.status,
      startTime: a.startTime,
      tokenCount: a.tokenCount,
      contextWindowSize: a.contextWindowSize,
    }))
}

const heat = (pct: number) => (pct >= 90 ? ROSE : pct >= 70 ? AMBER : SUN)

const kTokens = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n))

const LIMIT_NAMES: Record<string, string> = { five_hour: '5-hour limit', seven_day: 'Weekly limit', spend_limit: 'Spend limit' }

function resetText(iso: string | undefined, now: number): string {
  if (!iso) return ''
  const ms = Date.parse(iso) - now
  if (!Number.isFinite(ms) || ms <= 0) return 'resets now'
  const m = Math.round(ms / 60000)
  if (m < 60) return `resets in ${m}m`
  const h = Math.floor(m / 60)
  if (h < 48) return `resets in ${h}h ${m % 60}m`
  return `resets in ${Math.round(h / 24)}d`
}

function elapsed(start: number, now: number): string {
  const s = Math.max(0, Math.round((now - start) / 1000))
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

let tick: { cancel: () => void } | undefined

async function refreshAgents($: EngineInterface): Promise<void> {
  const rows = toRows(await $.agent.list())
  await update($, agents, old => (JSON.stringify(old) === JSON.stringify(rows) ? old : rows))
}

/** Called from the module's one session.start hook. */
export async function startGauges($: EngineInterface): Promise<void> {
  await $.command.register({ name: 'dusk-gauges', description: 'Show plan usage, context fill and running sub-agents' })
  const now = await $.session.usage()
  await update($, usage, () => toUsage(now.context, now.rateLimits))
  await refreshAgents($)
  tick?.cancel()
  tick = $.clock.every(3000, () => refreshAgents($))
  void $.ui.open({ id: PANE, title: 'Dusk gauges' })
}

export function registerGauges(on: On): void {

  on('command.run', { command: 'dusk-gauges' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Dusk gauges' })
    return { text: 'Dusk gauges opened.' }
  })

  on('session.measure', async ($, e, next) => {
    await update($, usage, () => toUsage(e.context, e.rateLimits))
    return next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    const started = await next(e)
    await refreshAgents($)
    return started
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Progress } = $.ui.resolve(e)
    const u = await read($, usage)
    const rows = await read($, agents)
    const now = await $.clock.now()
    const glance = e.props.placement === 'widget'

    const ctxPct = u.contextPercent
    const context = (
      <Box flexDirection="column" gap={0}>
        <Text weight="semibold">Context window</Text>
        <Progress
          label="Context window used"
          value={ctxPct ?? 0}
          max={100}
          color={heat(ctxPct ?? 0)}
          valueText={ctxPct === undefined ? 'no reading yet' : `${ctxPct}%`}
        />
        {!glance && (
          <Text dimColor>
            {u.contextTokens === undefined
              ? `window ${kTokens(u.contextWindow)} tokens`
              : `${kTokens(u.contextTokens)} of ${kTokens(u.contextWindow)} tokens`}
          </Text>
        )}
      </Box>
    )

    const limits = (
      <Box flexDirection="column">
        <Text weight="semibold">Plan usage</Text>
        {u.limits.length === 0 && <Text dimColor>No reading yet. It appears after the next reply.</Text>}
        {u.limits.map((l: Gauge) => (
          <Box flexDirection="column">
            <Progress
              label={LIMIT_NAMES[l.kind] ?? l.kind}
              value={l.percentUsed}
              max={100}
              color={heat(l.percentUsed)}
              valueText={`${l.percentUsed}%`}
            />
            {!glance && l.resetsAt !== undefined && <Text dimColor>{resetText(l.resetsAt, now)}</Text>}
          </Box>
        ))}
      </Box>
    )

    const agentList = (
      <Box flexDirection="column">
        <Text weight="semibold">Sub-agents {rows.length > 0 ? `(${rows.length} working)` : ''}</Text>
        {rows.length === 0 && <Text dimColor>None running.</Text>}
        {!glance &&
          rows.map(a => {
            const pct = a.contextWindowSize ? Math.round((a.tokenCount / a.contextWindowSize) * 100) : undefined
            return (
              <Box flexDirection="column">
                <Text color={LILAC}>
                  {a.status === 'running' ? '● ' : '○ '}
                  {a.type} · {elapsed(a.startTime, now)}
                  {pct === undefined ? '' : ` · ${pct}% ctx`}
                </Text>
                <Text dimColor>{a.label}</Text>
              </Box>
            )
          })}
      </Box>
    )

    return (
      <Box flexDirection="column" gap={1}>
        {limits}
        {context}
        {agentList}
      </Box>
    )
  })
}
