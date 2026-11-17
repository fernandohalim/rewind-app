/* Small line icons used inside IconBadge. */

const base = {
  width: 28,
  height: 28,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const TrophyIcon = () => (
  <svg {...base}><path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H4a3 3 0 0 0 4 4M16 6h4a3 3 0 0 1-4 4M12 13v4M8 20h8" /></svg>
);
export const ClockIcon = () => (
  <svg {...base}><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></svg>
);
export const FlameIcon = () => (
  <svg {...base}><path d="M12 21c-4 0-6.5-2.6-6.5-6 0-4 3.5-5.5 4-10 2.5 1.5 3.5 4 3.5 6 1-.6 1.6-1.6 1.8-3 1.8 1.5 3.7 4 3.7 7 0 3.4-2.5 6-6.5 6z" /></svg>
);
export const ShapesIcon = () => (
  <svg {...base}><circle cx="8" cy="8" r="4" /><path d="M14 4h6v6h-6zM8 14l4.5 7h-9z" /><circle cx="17" cy="17" r="3.5" /></svg>
);
export const HeadphonesIcon = () => (
  <svg {...base}><path d="M4 15v-3a8 8 0 0 1 16 0v3" /><rect x="3" y="14" width="4.5" height="7" rx="2" /><rect x="16.5" y="14" width="4.5" height="7" rx="2" /></svg>
);
