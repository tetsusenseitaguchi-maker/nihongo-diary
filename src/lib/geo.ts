// Rounds a coordinate to 0.2-degree precision (≈ 22 km at equator).
// Used server-side to blur friend locations to city level before
// sending coordinates to the client.
export function blurCoord(c: number): number {
  return Math.round(c * 5) / 5;
}
