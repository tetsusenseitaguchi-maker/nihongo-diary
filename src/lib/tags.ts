export const PRESET_TAGS: { key: string; en: string }[] = [
  { key: "旅行", en: "Travel" },
  { key: "日常", en: "Daily" },
  { key: "勉強", en: "Study" },
  { key: "仕事", en: "Work" },
  { key: "食べ物", en: "Food" },
  { key: "趣味", en: "Hobby" },
  { key: "家族", en: "Family" },
  { key: "気持ち", en: "Feelings" },
];

export const PRESET_TAG_KEYS = new Set(PRESET_TAGS.map((t) => t.key));
