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
    name: "Vesper",
    subtitle: "Last light over dust and tape",
    badge: "Dusk",
    bg: "#0E0E0E",
    accent: "#C3B1E1",
    secondary: "#9CB4A6",
    text: "#F5F5F0",
    colors: {
      bgBase: "#0E0E0E",
      bgSurface: "#1B1B1B",
      bgElevated: "#2A2A2A",
      borderSubtle: "#2A2A2A",
      borderStrong: "#3D3D3D",
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
    name: "Valve",
    subtitle: "Tube-amp warmth and VU glow",
    badge: "Analog",
    bg: "#0C0A09",
    accent: "#D9A441",
    secondary: "#6FA8A0",
    text: "#FAF7F2",
    colors: {
      bgBase: "#0C0A09",
      bgSurface: "#211C17",
      bgElevated: "#302820",
      borderSubtle: "#3A2E22",
      borderStrong: "#4A3E30",
      textMain: "#FAF7F2",
      textSecondary: "#D6D3D1",
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
    name: "Glacier",
    subtitle: "Sub-zero studio air",
    badge: "Studio",
    bg: "#0B0F17",
    accent: "#7FB6D9",
    secondary: "#D98A96",
    text: "#F8FAFC",
    colors: {
      bgBase: "#0B0F17",
      bgSurface: "#151D2C",
      bgElevated: "#243044",
      borderSubtle: "#2C3A55",
      borderStrong: "#3B4B66",
      textMain: "#F8FAFC",
      textSecondary: "#CBD5E1",
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
    name: "Canopy",
    subtitle: "Pine canopy and old brass",
    badge: "Botanical",
    bg: "#08110D",
    accent: "#5FAE82",
    secondary: "#D9A441",
    text: "#F0FDF4",
    colors: {
      bgBase: "#08110D",
      bgSurface: "#12241B",
      bgElevated: "#1B3A2B",
      borderSubtle: "#1E3A2C",
      borderStrong: "#2C5540",
      textMain: "#F0FDF4",
      textSecondary: "#BBF7D0",
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
    name: "Cabaret",
    subtitle: "After-hours wine and velvet",
    badge: "Nocturne",
    bg: "#14080A",
    accent: "#D1848F",
    secondary: "#D4AF6E",
    text: "#FFF1F2",
    colors: {
      bgBase: "#14080A",
      bgSurface: "#260F15",
      bgElevated: "#3A1620",
      borderSubtle: "#421A24",
      borderStrong: "#5C2534",
      textMain: "#FFF1F2",
      textSecondary: "#FECDD3",
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
    name: "Afterglow",
    subtitle: "Synth dusk over indigo",
    badge: "Synthwave",
    bg: "#0F0A1C",
    accent: "#9A86CC",
    secondary: "#D99A63",
    text: "#FAF5FF",
    colors: {
      bgBase: "#0F0A1C",
      bgSurface: "#1C1236",
      bgElevated: "#2C1D52",
      borderSubtle: "#372465",
      borderStrong: "#4F3391",
      textMain: "#FAF5FF",
      textSecondary: "#DDCCFA",
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
    id: "aero-glass",
    name: "Aero",
    subtitle: "Glass, gloss, and aurora light",
    badge: "Glass",
    bg: "#0A1220",
    accent: "#4AA8E8",
    secondary: "#43D6A8",
    text: "#F2F8FD",
    colors: {
      bgBase: "#0A1220",
      bgSurface: "#101C30",
      bgElevated: "#16263E",
      borderSubtle: "#23415F",
      borderStrong: "#33567E",
      textMain: "#F2F8FD",
      textSecondary: "#CFE3F2",
      textMuted: "#9DB8CC",
      textDim: "#6E8AA3",
      textFaint: "#4E6579",
      accentLight: "#8FD0F7",
      accentMain: "#4AA8E8",
      accentBold: "#2E86C9",
      accentDark: "#1C5F96",
      secondaryMain: "#43D6A8",
      secondaryLight: "#7FEBC4",
      secondaryDark: "#2A9E78",
    },
  },
  {
    id: "monochrome",
    name: "Mono",
    subtitle: "Pure signal, no noise",
    badge: "Minimal",
    bg: "#121212",
    accent: "#F3F4F6",
    secondary: "#7E9CC4",
    text: "#FFFFFF",
    colors: {
      bgBase: "#121212",
      bgSurface: "#232323",
      bgElevated: "#2F2F2F",
      borderSubtle: "#383838",
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
  {
    id: "shellac-sepia",
    name: "Shellac",
    subtitle: "78 RPM espresso and groove",
    badge: "78 RPM",
    bg: "#140C06",
    accent: "#E0651F",
    secondary: "#A8A35D",
    text: "#F7EFE1",
    colors: {
      bgBase: "#140C06",
      bgSurface: "#241708",
      bgElevated: "#32200D",
      borderSubtle: "#332412",
      borderStrong: "#4A3520",
      textMain: "#F7EFE1",
      textSecondary: "#D8C8AC",
      textMuted: "#B8A88F",
      textDim: "#8F7F66",
      textFaint: "#6B5D48",
      accentLight: "#F09355",
      accentMain: "#E0651F",
      accentBold: "#B94F14",
      accentDark: "#8F3C0D",
      secondaryMain: "#A8A35D",
      secondaryLight: "#C4BE7E",
      secondaryDark: "#6E6A38",
    },
  },
  {
    id: "taper-rec",
    name: "REC",
    subtitle: "Tape rolling in the pit",
    badge: "Live",
    bg: "#0A0D14",
    accent: "#FF5252",
    secondary: "#FFC46B",
    text: "#F2F5FA",
    colors: {
      bgBase: "#0A0D14",
      bgSurface: "#121826",
      bgElevated: "#1E2940",
      borderSubtle: "#1E2637",
      borderStrong: "#33405A",
      textMain: "#F2F5FA",
      textSecondary: "#C9D4E6",
      textMuted: "#93A0B8",
      textDim: "#6B7690",
      textFaint: "#4E576C",
      accentLight: "#FF8A8A",
      accentMain: "#FF5252",
      accentBold: "#E03232",
      accentDark: "#B02020",
      secondaryMain: "#FFC46B",
      secondaryLight: "#FFDCA3",
      secondaryDark: "#A67C2E",
    },
  },
  {
    id: "netlabel-acid",
    name: "EVA-01",
    subtitle: "Neon genesis in purple and green",
    badge: "EVA",
    bg: "#0C0A10",
    accent: "#9BE815",
    secondary: "#7C53E8",
    text: "#F4F4F2",
    colors: {
      bgBase: "#0C0A10",
      bgSurface: "#151021",
      bgElevated: "#221832",
      borderSubtle: "#241B38",
      borderStrong: "#3A2B5C",
      textMain: "#F4F4F2",
      textSecondary: "#D9D4E8",
      textMuted: "#A8A0BE",
      textDim: "#7E7494",
      textFaint: "#5C5370",
      accentLight: "#C2F456",
      accentMain: "#9BE815",
      accentBold: "#7AB80F",
      accentDark: "#5A8A0C",
      secondaryMain: "#7C53E8",
      secondaryLight: "#A58CF2",
      secondaryDark: "#573DC0",
    },
  },
  {
    id: "eva-00",
    name: "EVA-00",
    subtitle: "Prototype amber, first light",
    badge: "EVA",
    bg: "#0E0C08",
    accent: "#FFB800",
    secondary: "#6E9BB8",
    text: "#FAF6EE",
    colors: {
      bgBase: "#0E0C08",
      bgSurface: "#1D1710",
      bgElevated: "#2C2318",
      borderSubtle: "#2E2518",
      borderStrong: "#4A3B24",
      textMain: "#FAF6EE",
      textSecondary: "#E4DCC8",
      textMuted: "#B3A88D",
      textDim: "#877C64",
      textFaint: "#615845",
      accentLight: "#FFC94D",
      accentMain: "#FFB800",
      accentBold: "#D1950A",
      accentDark: "#9A6F08",
      secondaryMain: "#6E9BB8",
      secondaryLight: "#93B7CF",
      secondaryDark: "#4A6E88",
    },
  },
  {
    id: "eva-02",
    name: "EVA-02",
    subtitle: "Red fury, four eyes",
    badge: "EVA",
    bg: "#100808",
    accent: "#FF3B30",
    secondary: "#FF8C42",
    text: "#FBF3EF",
    colors: {
      bgBase: "#100808",
      bgSurface: "#211012",
      bgElevated: "#33181C",
      borderSubtle: "#381C20",
      borderStrong: "#5C2A32",
      textMain: "#FBF3EF",
      textSecondary: "#F0D5CF",
      textMuted: "#C29A94",
      textDim: "#96716C",
      textFaint: "#6E514D",
      accentLight: "#FF7A70",
      accentMain: "#FF3B30",
      accentBold: "#D12A22",
      accentDark: "#9C1F19",
      secondaryMain: "#FF8C42",
      secondaryLight: "#FFB37E",
      secondaryDark: "#B25F28",
    },
  },
  {
    id: "reading-room",
    name: "Folio",
    subtitle: "Paper, brass lamp, ink",
    badge: "Light",
    bg: "#F6F1E7",
    accent: "#A0741C",
    secondary: "#6E9BB8",
    text: "#1C1917",
    colors: {
      bgBase: "#F6F1E7",
      bgSurface: "#FFFDF8",
      bgElevated: "#FFFFFF",
      borderSubtle: "#E3DCCB",
      borderStrong: "#C9BFA6",
      textMain: "#1C1917",
      textSecondary: "#44403C",
      textMuted: "#6B6257",
      textDim: "#8A8175",
      textFaint: "#A79D8D",
      accentLight: "#C49A3F",
      accentMain: "#A0741C",
      accentBold: "#80601A",
      accentDark: "#5F4713",
      secondaryMain: "#6E9BB8",
      secondaryLight: "#93B7CF",
      secondaryDark: "#4A6E88",
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
