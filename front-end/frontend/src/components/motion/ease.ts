// Shared easing curves so every animation on the storefront feels like one system.
// EXPO_OUT: fast start, long soft landing — used for reveals.
// IN_OUT: symmetric — used for curtains/wipes that cross the whole screen.
export const EASE_EXPO_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.76, 0, 0.24, 1] as const;
