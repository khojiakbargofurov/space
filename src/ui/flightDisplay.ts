/** Shared handle so the in-canvas flight loop can write the debug readout without React re-renders. */
export const flightDisplay: { el: HTMLElement | null } = { el: null }
