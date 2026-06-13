export type ExecTheme = "dark" | "light";

export interface Theme {
  bg: string;
  card: string;
  border: string;
  text: string;
  secondary: string;
  accent: string;
  positive: string;
  negative: string;
}

export function getTheme(mode: ExecTheme): Theme {
  if (mode === "light") {
    return {
      bg: "#F8F8F6",
      card: "#FFFFFF",
      border: "#E8E8E8",
      text: "#111111",
      secondary: "#888888",
      accent: "#B8960C",
      positive: "#15803D",
      negative: "#DC2626",
    };
  }
  return {
    bg: "#080808",
    card: "#111111",
    border: "#1E1E1E",
    text: "#F0F0F0",
    secondary: "#606060",
    accent: "#C0C0C0",
    positive: "#22C55E",
    negative: "#EF4444",
  };
}

export function variationColor(v: number, positiveGood: boolean | null, t: Theme): string {
  if (positiveGood === null) return t.secondary;
  return (v >= 0) === (positiveGood === true) ? t.positive : t.negative;
}
