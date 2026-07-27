export const flexPayzTokens = {
  color: {
    background: {
      canvas: "#EEE8DE",
      secondary: "#E5DCCE",
    },
    surface: {
      primary: "#FFFCF7",
      white: "#FFFFFF",
      sand: "#EDE2D3",
      champagneSoft: "#F5EBDD",
    },
    text: {
      primary: "#211F1C",
      muted: "#7A736B",
      faint: "#A49B91",
    },
    border: {
      subtle: "#DED4C8",
    },
    accent: {
      champagne: "#C5965D",
      champagneDark: "#7A5730",
    },
    status: {
      success: "#50765B",
      successSoft: "#E4EFE6",
      danger: "#9B4B32",
    },
  },
  typography: {
    family: {
      ui: '"Manrope", "Inter", "Segoe UI", Roboto, Arial, sans-serif',
      display: '"Cormorant Garamond", Georgia, "Times New Roman", serif',
      mono: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
    },
    weight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    size: {
      caption: "0.75rem",
      bodySmall: "0.875rem",
      body: "1rem",
      bodyLarge: "1.125rem",
      titleSmall: "1.25rem",
      title: "1.5rem",
      heading: "2rem",
      display: "3rem",
    },
    lineHeight: {
      tight: 1.15,
      heading: 1.2,
      body: 1.6,
      control: 1.25,
    },
  },
  spacing: {
    0: "0",
    1: "0.25rem",
    2: "0.5rem",
    3: "0.75rem",
    4: "1rem",
    5: "1.25rem",
    6: "1.5rem",
    8: "2rem",
    10: "2.5rem",
    12: "3rem",
    16: "4rem",
    20: "5rem",
    24: "6rem",
  },
  radius: {
    sm: "12px",
    md: "16px",
    lg: "24px",
    xl: "32px",
  },
  shadow: {
    raised: "0 12px 32px rgba(33, 31, 28, 0.08)",
    floating: "0 20px 56px rgba(33, 31, 28, 0.12)",
    champagne: "0 16px 40px rgba(122, 87, 48, 0.16)",
  },
  transition: {
    fast: "120ms ease",
    standard: "180ms ease",
    slow: "260ms ease",
  },
  focus: {
    ring: "0 0 0 3px rgba(197, 150, 93, 0.34)",
    outline: "2px solid #7A5730",
    offset: "3px",
  },
  breakpoint: {
    mobile: 0,
    tablet: 768,
    desktop: 1280,
    wide: 1440,
  },
  size: {
    interactiveMin: "44px",
  },
} as const;

export type FlexPayzTokens = typeof flexPayzTokens;
