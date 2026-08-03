/**
 * Structured Break Activities
 * Suggests restorative activities during breaks without repeating until the deck is exhausted.
 */

const ACTIVITIES = [
  "Breathe: Inhale for 4s, hold 4s, exhale 4s, hold 4s. (Box Breathing)",
  "Hydrate: Drink a glass of water right now.",
  "Stretch: Reach for the ceiling, then touch your toes.",
  "Vision: Look at an object 20 feet away for 20 seconds.",
  "Posture: Roll your shoulders back and sit up straight.",
  "Move: Stand up and walk around the room for 1 minute.",
  "Mind: Close your eyes and clear your thoughts for 30 seconds.",
  "Body: Do 5 slow, deep squats to get blood flowing.",
  "Reset: Step completely away from all screens for 2 minutes.",
];

let deck: string[] = [];

export function getBreakActivity(): string {
  if (deck.length === 0) {
    deck = [...ACTIVITIES];
  }
  const index = Math.floor(Math.random() * deck.length);
  const activity = deck[index] ?? "";
  deck.splice(index, 1); // remove it so it doesn't repeat
  return activity;
}
