# Fieldnotes — First-person Frisbee Prototype

A small React + Three.js browser prototype for a first-person ultimate frisbee field.

## Included

- Stylized outdoor field with end zones and boundary lines
- First-person mouse-look using Three.js `PointerLockControls`
- WASD movement constrained to the field
- Hold left mouse button to charge, release to throw
- Simple spinning disc flight with gravity
- Reset disc (`R`), pause (`Esc`), HUD and responsive layout
- Cream / cobalt / lime / coral visual direction

## Run locally

Requires Node.js 18+ (Node.js 20 LTS recommended).

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

Build for production:

```bash
npm run build
npm run preview
```

## Controls

- Click **Enter the field** to start and lock the mouse pointer.
- `W A S D`: move
- Mouse: look around
- Hold left mouse button: charge the throw
- Release left mouse button: throw the disc
- `R`: reset disc
- `Esc`: release mouse / pause

Click **Back to play** to resume after pausing.

## Notes / current limitations

This is an MVP prototype, not a full simulation:
- Player characters are simple procedural placeholder models.
- Disc flight uses a lightweight approximation, not full aerodynamic simulation.
- There is no true catch detection, defender AI, scoring logic, or mobile joystick yet.
- The sound toggle is a UI placeholder; no audio is currently played.
- The first-person held disc is a simple model parented to the camera; after throwing it becomes a world object.
- Google Fonts are loaded remotely; the system sans-serif fallback works offline.

## Suggested next steps

1. Replace placeholder player models with lightweight GLB models.
2. Improve disc lift / glide and add catch detection.
3. Add touch controls for mobile.
4. Add 2–3 rule-learning events, such as end-zone and out-of-bounds prompts.
5. Add quality settings to lower shadows and pixel ratio on slower devices.
