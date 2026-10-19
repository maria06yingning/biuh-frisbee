# FIELDNOTES — First-person Frisbee Playground (v0.2)

A browser-based React + Three.js prototype for practising first-person movement and passing to moving teammates.

## What's improved in v0.2
- Three moving teammates with selectable targets (`1`, `2`, `3`) and simple run-out patterns.
- Disc flight with gravity and a spinning visual.
- Segment-to-player distance checks during each flight step to reduce missed catches / tunnelling between frames.
- Teammate catches return the disc to the player and increment the catch counter.
- Opponent interception checks, ground hits, out-of-bounds checks, and reset flow.
- Fixed right/left movement vector and disc world-position handoff when throwing.
- Responsive HUD and roster, with a quick-controls panel.

## Run
Node.js 18+ (Node.js 20 LTS recommended):

```bash
npm install
npm run dev
```
Open the local URL Vite prints, usually `http://localhost:5173`.

For a production build:

```bash
npm run build
npm run preview
```

## Controls
- Click **Enter the field** to lock the pointer.
- `W A S D`: move; `Shift`: move faster.
- Mouse: look / aim.
- `1`, `2`, `3`: select the teammate you intend to pass to.
- Hold left mouse button to charge; release to throw.
- `R`: reset the disc after a miss or turnover.
- `Esc`: pause / release pointer lock.

## Honest limitations
This is a more interactive prototype, not a finished sports simulator. Teammates use simple procedural movement, not sophisticated tactical AI. Catching is based on proximity to the flight segment, not hand animation or full disc aerodynamics. There is no online multiplayer, mobile joystick, complete scoring/turnover rules, or polished character animation yet. Since the scene is procedural, character and environment art are still stylized placeholders.
