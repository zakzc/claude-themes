# halftone-dusk

A dark Claude Code theme for the desktop and mobile apps: plum-indigo surfaces, sunset-orange accents, and a slowly sinking halftone-dot sun behind the conversation. Your messages sit in a dotted bubble; replies and tool calls sit on solid plum cards. Terminals and editors don't draw themes.

It also opens a **Dusk gauges** side pane (reopen it with `/dusk-gauges`) showing:

- **Plan usage**: your 5-hour and weekly limit windows, with time to reset
- **Context window**: how full the conversation's context is
- **Sub-agents**: which are working now, how long they've run and how much context each has used

Plan usage fills in after the first reply of a session.

## Install

At the prompt of a terminal session:

```
/plugin install halftone-dusk --marketplace zakzc/claude-themes
```

Answer `y` to add the marketplace, then pick the user scope so every new session gets the theme.

From a shell:

```bash
claude plugin install halftone-dusk --marketplace zakzc/claude-themes
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `zakzc/claude-themes`, then Add plugin.
