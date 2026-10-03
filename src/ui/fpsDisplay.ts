/** Shared handle so the in-canvas FPS sampler can write to the DOM overlay without React re-renders. */
export const fpsDisplay: { el: HTMLElement | null } = { el: null }
