// eslint-disable-next-line @typescript-eslint/no-require-imports
const Ctor = require("tiny-segmenter") as { new (): { segment(text: string): string[] } };
const _instance = new Ctor();

export function segmentJapanese(text: string): string[] {
  if (!text) return [];
  return _instance.segment(text);
}
