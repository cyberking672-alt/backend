export const COLOR_HEX_MAP: Record<string, { hex: string; border?: boolean }> = {
  black: { hex: '#0f172a' },
  white: { hex: '#ffffff', border: true },
  blue: { hex: '#2563eb' },
  navy: { hex: '#1e3a8a' },
  sky: { hex: '#0284c7' },
  cyan: { hex: '#06b6d4' },
  red: { hex: '#dc2626' },
  burgundy: { hex: '#800020' },
  wine: { hex: '#722f37' },
  green: { hex: '#16a34a' },
  olive: { hex: '#65a30d' },
  army: { hex: '#4d5d53' },
  mint: { hex: '#6ee7b7' },
  yellow: { hex: '#eab308' },
  orange: { hex: '#f97316' },
  coral: { hex: '#ff7f50' },
  pink: { hex: '#ec4899' },
  rose: { hex: '#f43f5e' },
  purple: { hex: '#a855f7' },
  violet: { hex: '#7c3aed' },
  gray: { hex: '#64748b' },
  grey: { hex: '#64748b' },
  charcoal: { hex: '#334155' },
  brown: { hex: '#854d0e' },
  coffee: { hex: '#451a03' },
  chocolate: { hex: '#7c2d12' },
  beige: { hex: '#f5f5dc', border: true },
  cream: { hex: '#fffdd0', border: true },
  khaki: { hex: '#c2b280' },
  gold: { hex: '#d97706' },
  silver: { hex: '#94a3b8' },
  apricot: { hex: '#fbceb1' },
  camel: { hex: '#c19a6b' },
};

export const getColorSwatch = (colorName: string): { hex: string; border: boolean } => {
  if (!colorName) return { hex: '#f8fafc', border: true };
  const clean = colorName.toLowerCase().trim();
  for (const [key, val] of Object.entries(COLOR_HEX_MAP)) {
    if (clean.includes(key)) {
      return { hex: val.hex, border: !!val.border };
    }
  }
  // Generate a smooth deterministic pastel color if custom name
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return { hex: `hsl(${h}, 65%, 50%)`, border: false };
};
