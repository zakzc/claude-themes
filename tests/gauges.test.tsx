import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'halftone-dusk',
  component: 'Pane',
  requestId: 'dusk-gauges',
  props: {
    title: 'Dusk gauges',
    isFocused: false,
    bodyColumns: 40,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

test('the pane shows plan usage, context and a running sub-agent', async ($, on) => {
  on('command.register', () => ({ value: { command: 'dusk-gauges' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 't' } }))
  on('clock.every', () => ({ value: undefined }))
  on('clock.now', () => ({ value: Date.parse('2026-11-23T10:00:00Z') }))
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: { tokens: 84000, window: 200000, percent: 42 },
      rateLimits: [{ kind: 'five_hour', percentUsed: 37, resetsAt: '2026-11-23T12:30:00Z' }],
    },
  }))
  on('agent.list', () => ({
    value: [
      {
        id: 'a1', description: 'Search', type: 'Explore', status: 'running', kind: 'local_agent',
        taskStatus: 'running', label: 'Searching for config files', startTime: Date.parse('2026-11-23T09:59:00Z'),
        cwd: '/', tokenCount: 20000, contextWindowSize: 200000, tokenSamples: [20000], hasRow: true,
      },
      {
        id: 'a2', description: 'Done', type: 'Plan', status: 'completed', kind: 'local_agent',
        taskStatus: 'completed', label: 'old', startTime: 0, cwd: '/', tokenCount: 1, tokenSamples: [1], hasRow: true,
      },
    ],
  }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  for (const surface of ['desktop', 'mobile', 'terminal'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /resets in/ }))?.text).toBe('resets in 2h 30m')
    expect((await ui.find({ type: 'Text', text: /84k of 200k/ }))?.text).toBe('84k of 200k tokens')
    expect((await ui.find({ type: 'Text', text: /Explore/ }))?.text).toContain('10% ctx')
    expect((await ui.find({ type: 'Text', text: /1 working/ }))).toBeTruthy()
    expect(await ui.find({ type: 'Text', text: /^old$/ })).toBeFalsy()
    await ui.unmount()
  }
})
