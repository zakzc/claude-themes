export type Gauge = { kind: string; percentUsed: number; resetsAt?: string }

export type Usage = {
  contextPercent?: number
  contextTokens?: number
  contextWindow: number
  limits: Gauge[]
}

export type AgentRow = {
  id: string
  type: string
  label: string
  status: string
  startTime: number
  tokenCount: number
  contextWindowSize?: number
}

declare module 'claude-code' {
  interface PluginState {
    'halftone-dusk': {
      usage: Shaped<Usage>
      agents: Shaped<AgentRow[]>
    }
  }
}
