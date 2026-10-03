# EVENT HORIZON

Cinematic browser space game. Player pilots a small ship around a supermassive black hole.
Core mechanic: TIME DILATION. The closer to the black hole, the slower the ship clock runs
relative to the universe clock. Close = higher score and rare resources, but much more danger.
Everything must be 100% original (no names, characters, music, or assets from existing films).

## Stack
Vite + React + TypeScript, @react-three/fiber, @react-three/drei, @react-three/postprocessing,
three, Zustand. Web Audio API for all sound (no audio files). No external textures or models:
everything procedural (shaders, geometry, canvas textures).

## Structure
src/game (state, physics, constants), src/scene (3D components), src/shaders, src/audio, src/ui

## Rules
- All tunable numbers (gravity, dilation curve, radii, drain rates) live in src/game/constants.ts
- Delta time everywhere. No object allocation inside useFrame.
- Target 60 FPS on a mid-range laptop. Quality setting Low/Medium/High scales effects and star count.
- Dispose geometries, materials, textures on unmount/restart. No memory leaks.
- After every stage: run `npm run build` and fix all type/build errors before reporting done.
- Work on ONE stage at a time. Stop after the stage and wait for my next instruction.
- At the end of each stage: list what was built, how to test it, and an acceptance checklist.
- Commit to git at the end of each finished stage: "stage N: <name>".

## Stages
0 Setup and architecture (formulas: gravity, dilation = 1/sqrt(1 - rs/r) clamped, danger radius)
1 Black hole, accretion disk (turbulence + Doppler), starfield, nebula, orbit camera
2 Lensing shader + bloom, vignette, grain, chromatic aberration, quality settings
3 Ship, Newtonian flight, controls, chase/cockpit camera, thrust particles
4 Gravity, slingshot, procedural planets, time dilation clocks, first HUD
5 Collectibles (fuel, oxygen, chrono shards), hazards, tidal forces, spaghettification, death/restart
6 Audio (drone, pads, pitch/tempo shift near horizon, SFX, mute)
7 Sectors (5+ and endless), wormhole jump, upgrade shop, localStorage save
8 UI and menus, full HUD, radar, mobile joystick, settings
9 Performance, resize/visibility handling, bug pass, balancing