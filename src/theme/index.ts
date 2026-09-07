/**
 * Design tokens sampled directly from the source mockup (kept locally, not
 * committed). Values below are the exact hex codes read from its pixels.
 * Colors are exact hex values pulled from the mockup pixels.
 */

export const colors = {
  /** Primary action green — "Get started", "Save", "Continue", toggles. */
  green: '#6EDA8C',
  greenPressed: '#5AC97A',
  /** Mint surface — hero score card, selected option, summary total card. */
  mint: '#B7FACC',
  /** Text/icon color that sits on top of `mint`. */
  onMint: '#0B3A1E',
  /** Teal accent — header gear, category glyphs, inline links, mid scores. */
  teal: '#35D6C0',
  /** Pale teal — category icon chip backgrounds. */
  tealChip: '#BEF0ED',
  /** Brand yellow — logo tile, the score-of-1 numeral. */
  yellow: '#FFDD33',

  ink: '#1C1C1E',
  inkMuted: '#616163',
  inkFaint: '#9A9A9E',

  white: '#FFFFFF',
  /** App background on non-white screens + inactive pills, inputs, dividers. */
  surface: '#F0F0F0',
  border: '#E6E6E8',
  /** Neutral chip for not-yet-scored categories. */
  chipIdle: '#EFEFF1',
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const spacing = (n: number) => n * 4;

/**
 * Figtree is a free stand-in for the mockup's geometric sans (Gilroy-family).
 * Swap the @expo-google-fonts package in src/theme/fonts.ts to change it.
 */
export const fonts = {
  regular: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
  extrabold: 'Figtree_800ExtraBold',
} as const;

export const type = {
  /** 40px display — "8/10", "7.4" */
  display: { fontFamily: fonts.extrabold, fontSize: 40, lineHeight: 46 },
  /** 28px screen titles — "Welcome to Energy Score", "Settings" */
  title: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34 },
  /** 20px section heads — "Energy Check-ins", "Question Manager" */
  heading: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26 },
  /** 16px emphasised body — list item names, button labels */
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  /** 14px secondary text — subtitles, "Completed", option labels */
  small: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  smallStrong: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 },
  /** 12px labels — "Category 5 of 5", "Score descriptions" */
  label: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16 },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
} as const;

/** Soft card elevation used on white cards over the grey background. */
export const cardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.04,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
} as const;

/** Score colors: 0 is muted, 1 is yellow, 2 is green (per the dashboard rows). */
export function scoreColor(score: number | null | undefined) {
  if (score == null) return colors.inkFaint;
  if (score >= 2) return colors.green;
  if (score === 1) return colors.yellow;
  return colors.inkMuted;
}

/** Daily-total color used on the History list (green when strong, teal when middling). */
export function totalColor(total: number, max: number) {
  const ratio = max > 0 ? total / max : 0;
  if (ratio >= 0.7) return colors.green;
  return colors.teal;
}
