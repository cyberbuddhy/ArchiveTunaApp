export interface ThemeDefinition {
  id: string;
  name: string;
  subtitle: string;
  badge?: string;
  bg: string;
  accent: string;
  secondary: string;
  text: string;
  colors: {
    bgBase: string;
    bgSurface: string;
    bgElevated: string;
    borderSubtle: string;
    borderStrong: string;
    textMain: string;
    textSecondary: string;
    textMuted: string;
    textDim: string;
    textFaint: string;
    accentLight: string;
    accentMain: string;
    accentBold: string;
    accentDark: string;
    secondaryMain: string;
    secondaryLight: string;
    secondaryDark: string;
  };
}

export const THEMES: ThemeDefinition[] = [
  {
    id: "matte-lavender",
    name: "Matte Noir & Lavender",
    subtitle: "Matte Black with Dusty Lavender, Sage Green & Alabaster Off-White",
    badge: "Requested",
    bg: "#1A1A1A",
    accent: "#C3B1E1",
    secondary: "#9CB4A6",
    text: "#F5F5F0",
    colors: {
      bgBase: "#1A1A1A",
      bgSurface: "#232323",
      bgElevated: "#2D2D2D",
      borderSubtle: "#363636",
      borderStrong: "#4A4A4A",
      textMain: "#F5F5F0",
      textSecondary: "#DCDCD6",
      textMuted: "#AFAFA8",
      textDim: "#7E7E78",
      textFaint: "#5C5C57",
      accentLight: "#D7CBEE",
      accentMain: "#C3B1E1",
      accentBold: "#B09CCA",
      accentDark: "#8F79AB",
      secondaryMain: "#9CB4A6",
      secondaryLight: "#B8CBC0",
      secondaryDark: "#7C9687",
    },
  },
  {
    id: "amber-vault",
    name: "Warm Amber & Vinyl",
    subtitle: "Vintage analog acoustics, tube amp glow & VU meter teal",
    badge: "Analog Classic",
    bg: "#0C0A09",
    accent: "#D9A441",
    secondary: "#6FA8A0",
    text: "#FAF7F2",
    colors: {
      bgBase: "#0C0A09",
      bgSurface: "#1C1917",
      bgElevated: "#292524",
      borderSubtle: "#292524",
      borderStrong: "#44403C",
      textMain: "#FAF7F2",
      textSecondary: "#E7E5E4",
      textMuted: "#A8A29E",
      textDim: "#78716C",
      textFaint: "#57534E",
      accentLight: "#E8C87E",
      accentMain: "#D9A441",
      accentBold: "#B4832F",
      accentDark: "#8A6420",
      secondaryMain: "#6FA8A0",
      secondaryLight: "#93C4BC",
      secondaryDark: "#4E7B75",
    },
  },
  {
    id: "nordic-frost",
    name: "Nordic Slate & Sky",
    subtitle: "Crisp sub-zero digital studio, glacier sky & frost coral",
    badge: "Studio Pro",
    bg: "#0B0F17",
    accent: "#7FB6D9",
    secondary: "#D98A96",
    text: "#F8FAFC",
    colors: {
      bgBase: "#0B0F17",
      bgSurface: "#131A26",
      bgElevated: "#1E293B",
      borderSubtle: "#1E293B",
      borderStrong: "#334155",
      textMain: "#F8FAFC",
      textSecondary: "#E2E8F0",
      textMuted: "#94A3B8",
      textDim: "#64748B",
      textFaint: "#475569",
      accentLight: "#A8CCE4",
      accentMain: "#7FB6D9",
      accentBold: "#5B93B5",
      accentDark: "#416D87",
      secondaryMain: "#D98A96",
      secondaryLight: "#E5B3BA",
      secondaryDark: "#A9606B",
    },
  },
  {
    id: "emerald-moss",
    name: "Forest Moss & Brass",
    subtitle: "Deep pine canopy, soft emerald jade & aged brass",
    badge: "Botanical",
    bg: "#08110D",
    accent: "#5FAE82",
    secondary: "#D9A441",
    text: "#F0FDF4",
    colors: {
      bgBase: "#08110D",
      bgSurface: "#101E17",
      bgElevated: "#162B21",
      borderSubtle: "#193327",
      borderStrong: "#274C3B",
      textMain: "#F0FDF4",
      textSecondary: "#DCFCE7",
      textMuted: "#8FA89A",
      textDim: "#6E857E",
      textFaint: "#55655F",
      accentLight: "#93D3AC",
      accentMain: "#5FAE82",
      accentBold: "#4A9070",
      accentDark: "#37705A",
      secondaryMain: "#D9A441",
      secondaryLight: "#E8C87E",
      secondaryDark: "#8A6420",
    },
  },
  {
    id: "velvet-rose",
    name: "Velvet Night & Rose",
    subtitle: "Midnight wine cabaret, rose quartz & champagne gold",
    badge: "Nocturne",
    bg: "#14080A",
    accent: "#D1848F",
    secondary: "#D4AF6E",
    text: "#FFF1F2",
    colors: {
      bgBase: "#14080A",
      bgSurface: "#200D11",
      bgElevated: "#2E131A",
      borderSubtle: "#381820",
      borderStrong: "#4F202C",
      textMain: "#FFF1F2",
      textSecondary: "#FFE4E6",
      textMuted: "#C49AA1",
      textDim: "#A2767E",
      textFaint: "#7E565D",
      accentLight: "#E3A7B0",
      accentMain: "#D1848F",
      accentBold: "#B06270",
      accentDark: "#8C4E59",
      secondaryMain: "#D4AF6E",
      secondaryLight: "#E7CE9C",
      secondaryDark: "#A6834F",
    },
  },
  {
    id: "cyber-sunset",
    name: "Cyber Sunset & Violet",
    subtitle: "Deep void indigo with dusty violet & clay tangerine",
    badge: "Synthwave",
    bg: "#0F0A1C",
    accent: "#9A86CC",
    secondary: "#D99A63",
    text: "#FAF5FF",
    colors: {
      bgBase: "#0F0A1C",
      bgSurface: "#18102E",
      bgElevated: "#241744",
      borderSubtle: "#301E5B",
      borderStrong: "#452A80",
      textMain: "#FAF5FF",
      textSecondary: "#F3E8FF",
      textMuted: "#B3A8D6",
      textDim: "#9388BC",
      textFaint: "#6F6394",
      accentLight: "#B9AEE0",
      accentMain: "#9A86CC",
      accentBold: "#7E6BB0",
      accentDark: "#615488",
      secondaryMain: "#D99A63",
      secondaryLight: "#E5B98E",
      secondaryDark: "#A96F42",
    },
  },
  {
    id: "monochrome",
    name: "Studio Monochrome",
    subtitle: "High contrast pure matte black, titanium white & ice cyan",
    badge: "Minimalist",
    bg: "#121212",
    accent: "#F3F4F6",
    secondary: "#7E9CC4",
    text: "#FFFFFF",
    colors: {
      bgBase: "#121212",
      bgSurface: "#1E1E1E",
      bgElevated: "#292929",
      borderSubtle: "#333333",
      borderStrong: "#4A4A4A",
      textMain: "#FFFFFF",
      textSecondary: "#E5E5E5",
      textMuted: "#A3A3A3",
      textDim: "#737373",
      textFaint: "#525252",
      accentLight: "#FFFFFF",
      accentMain: "#F3F4F6",
      accentBold: "#D1D5DB",
      accentDark: "#9CA3AF",
      secondaryMain: "#7E9CC4",
      secondaryLight: "#A3BCD8",
      secondaryDark: "#54749A",
    },
  },
];

const THEME_STORAGE_KEY = "archive_tuner_active_theme";

export function getStoredThemeId(): string {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && THEMES.some((t) => t.id === saved)) {
      return saved;
    }
  } catch (e) {
    // LocalStorage unavailable
  }
  // Default to requested theme: Matte Noir & Lavender
  return "matte-lavender";
}

export function saveThemeId(themeId: string): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch (e) {
    // Ignore error
  }
}

export function applyThemeToDOM(themeId: string): void {
  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0];
  const root = document.documentElement;

  // Set the data-theme attribute on root
  root.setAttribute("data-theme", theme.id);

  // Apply explicit CSS variables for full instant reactivity and browser compatibility
  const { colors } = theme;
  root.style.setProperty("--color-bg-base", colors.bgBase);
  root.style.setProperty("--color-bg-surface", colors.bgSurface);
  root.style.setProperty("--color-bg-elevated", colors.bgElevated);
  root.style.setProperty("--color-border-subtle", colors.borderSubtle);
  root.style.setProperty("--color-border-strong", colors.borderStrong);

  root.style.setProperty("--color-text-main", colors.textMain);
  root.style.setProperty("--color-text-secondary", colors.textSecondary);
  root.style.setProperty("--color-text-muted", colors.textMuted);
  root.style.setProperty("--color-text-dim", colors.textDim);
  root.style.setProperty("--color-text-faint", colors.textFaint);

  root.style.setProperty("--color-accent-light", colors.accentLight);
  root.style.setProperty("--color-accent-main", colors.accentMain);
  root.style.setProperty("--color-accent-bold", colors.accentBold);
  root.style.setProperty("--color-accent-dark", colors.accentDark);

  root.style.setProperty("--color-secondary-main", colors.secondaryMain);
  root.style.setProperty("--color-secondary-light", colors.secondaryLight);
  root.style.setProperty("--color-secondary-dark", colors.secondaryDark);
  root.style.setProperty("--color-accent-sage", colors.secondaryMain);

  // Also set body background directly so during initial paint there is no flash
  document.body.style.backgroundColor = colors.bgBase;
  document.body.style.color = colors.textMain;
}
