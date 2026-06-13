export type ExecTheme = "dark" | "light";

export interface Theme {
  bg: string;
  bgColor: string;
  card: string;
  cardColor: string;
  border: string;
  cardBorder: string;
  cardShadow: string;
  text: string;
  secondary: string;
  accent: string;
  positive: string;
  negative: string;
  separator: string;
}

export function getTheme(mode: ExecTheme): Theme {
  if (mode === "light") {
    return {
      bg: "linear-gradient(160deg, #F8F8F6 0%, #F2F2EF 50%, #F5F5F2 100%)",
      bgColor: "#F5F5F2",
      card: "linear-gradient(145deg, #FFFFFF 0%, #F8F8F8 100%)",
      cardColor: "#FFFFFF",
      border: "rgba(0,0,0,0.06)",
      cardBorder: "1px solid rgba(0,0,0,0.06)",
      cardShadow: "0 2px 8px rgba(0,0,0,0.08)",
      text: "#111111",
      secondary: "#999999",
      accent: "#B8960C",
      positive: "#15803D",
      negative: "#DC2626",
      separator: "rgba(0,0,0,0.06)",
    };
  }
  return {
    bg: "linear-gradient(160deg, #0A0A0A 0%, #111111 50%, #0D0D0D 100%)",
    bgColor: "#0D0D0D",
    card: "linear-gradient(145deg, #1A1A1A 0%, #141414 100%)",
    cardColor: "#161616",
    border: "rgba(255,255,255,0.06)",
    cardBorder: "1px solid rgba(255,255,255,0.06)",
    cardShadow: "0 2px 8px rgba(0,0,0,0.4)",
    text: "#F0F0F0",
    secondary: "#505050",
    accent: "#C8C8C8",
    positive: "#22C55E",
    negative: "#EF4444",
    separator: "rgba(255,255,255,0.06)",
  };
}

export function variationColor(v: number, positiveGood: boolean | null, t: Theme): string {
  if (positiveGood === null) return t.secondary;
  return (v >= 0) === (positiveGood === true) ? t.positive : t.negative;
}
