/**
 * Chart colours. Categorical order is fixed (never cycled) and was run through
 * the dataviz validator on the light surface: lightness band, chroma floor,
 * CVD separation (worst adjacent ΔE 9.8) and 3:1 contrast all pass.
 * Teal and mustard are deepened from the brand fills to pass.
 */
export const CATEGORICAL = ["#E4572E", "#008F7A", "#B8820A", "#7B4B94", "#3A84C4"] as const;
export const OTHER = "#B9B2A6"; // everything past the 5 coloured series

/** Single-series magnitude (bars): one hue. */
export const SERIES = "#E4572E";

/** Heatmap scale, low → high (one warm hue family, light → dark). */
export const HEAT_SCALE = ["#F4EFE6", "#F3D9A4", "#E9B44C", "#E98A3D", "#E4572E", "#9E3A1F"] as const;

export function heatColor(value: number, max: number): string {
  if (value <= 0 || max <= 0) return HEAT_SCALE[0];
  const i = 1 + Math.min(HEAT_SCALE.length - 2, Math.floor((value / max) * (HEAT_SCALE.length - 1)));
  return HEAT_SCALE[i];
}
