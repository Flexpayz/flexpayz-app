import { alpha, createTheme, Shadows } from "@mui/material/styles";
import { flexPayzTokens } from "./tokens";

const {
  color,
  typography,
  radius,
  shadow,
  breakpoint,
  size,
  transition,
} = flexPayzTokens;

const shadows = Array(25).fill("none") as Shadows;
shadows[1] = shadow.raised;
shadows[2] = shadow.floating;
shadows[3] = shadow.champagne;

export const flexPayzTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: color.accent.champagne,
      dark: color.accent.champagneDark,
      light: color.surface.champagneSoft,
      contrastText: color.surface.white,
    },
    secondary: {
      main: color.text.primary,
      light: color.text.muted,
      contrastText: color.surface.white,
    },
    success: {
      main: color.status.success,
      light: color.status.successSoft,
      contrastText: color.surface.white,
    },
    error: {
      main: color.status.danger,
      contrastText: color.surface.white,
    },
    background: {
      default: color.background.canvas,
      paper: color.surface.primary,
    },
    text: {
      primary: color.text.primary,
      secondary: color.text.muted,
      disabled: color.text.faint,
    },
    divider: color.border.subtle,
  },
  breakpoints: {
    values: {
      xs: breakpoint.mobile,
      sm: 390,
      md: breakpoint.tablet,
      lg: breakpoint.desktop,
      xl: breakpoint.wide,
    },
  },
  shape: {
    borderRadius: parseInt(radius.md, 10),
  },
  shadows,
  spacing: 4,
  typography: {
    fontFamily: typography.family.ui,
    h1: {
      fontFamily: typography.family.display,
      fontWeight: typography.weight.medium,
      fontSize: "clamp(2.5rem, 4rem, 4.75rem)",
      lineHeight: typography.lineHeight.tight,
      letterSpacing: 0,
    },
    h2: {
      fontFamily: typography.family.display,
      fontWeight: typography.weight.medium,
      fontSize: "clamp(2rem, 3rem, 3.5rem)",
      lineHeight: typography.lineHeight.tight,
      letterSpacing: 0,
    },
    h3: {
      fontFamily: typography.family.display,
      fontWeight: typography.weight.medium,
      fontSize: "2.375rem",
      lineHeight: typography.lineHeight.heading,
      letterSpacing: 0,
    },
    h4: {
      fontFamily: typography.family.ui,
      fontWeight: typography.weight.semibold,
      fontSize: typography.size.heading,
      lineHeight: typography.lineHeight.heading,
      letterSpacing: 0,
    },
    h5: {
      fontFamily: typography.family.ui,
      fontWeight: typography.weight.semibold,
      fontSize: typography.size.title,
      lineHeight: typography.lineHeight.heading,
      letterSpacing: 0,
    },
    h6: {
      fontFamily: typography.family.ui,
      fontWeight: typography.weight.semibold,
      fontSize: typography.size.titleSmall,
      lineHeight: typography.lineHeight.heading,
      letterSpacing: 0,
    },
    subtitle1: {
      fontSize: typography.size.bodyLarge,
      lineHeight: typography.lineHeight.body,
      color: color.text.muted,
      letterSpacing: 0,
    },
    body1: {
      fontSize: typography.size.body,
      lineHeight: typography.lineHeight.body,
      letterSpacing: 0,
    },
    body2: {
      fontSize: typography.size.bodySmall,
      lineHeight: typography.lineHeight.body,
      color: color.text.muted,
      letterSpacing: 0,
    },
    button: {
      fontSize: typography.size.bodySmall,
      fontWeight: typography.weight.semibold,
      lineHeight: typography.lineHeight.control,
      letterSpacing: 0,
      textTransform: "none",
    },
    caption: {
      fontSize: typography.size.caption,
      lineHeight: typography.lineHeight.control,
      color: color.text.faint,
      letterSpacing: 0,
    },
    overline: {
      fontFamily: typography.family.ui,
      fontSize: typography.size.eyebrow,
      fontWeight: typography.weight.bold,
      lineHeight: 1.2,
      letterSpacing: typography.letterSpacing.eyebrow,
      textTransform: "uppercase",
      color: color.text.muted,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: color.background.canvas,
          color: color.text.primary,
          fontFamily: typography.family.ui,
        },
      },
    },
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          minHeight: size.interactiveMin,
          "&.Mui-focusVisible": {
            boxShadow: flexPayzTokens.focus.ring,
          },
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
        variant: "contained",
      },
      styleOverrides: {
        root: {
          borderRadius: radius.sm,
          minHeight: size.interactiveMin,
          paddingInline: "1.25rem",
          transition: `background-color ${transition.standard}, border-color ${transition.standard}, color ${transition.standard}, box-shadow ${transition.standard}, transform ${transition.fast}`,
          "&:hover": {
            transform: "translateY(-1px)",
          },
          "&.Mui-focusVisible": {
            boxShadow: flexPayzTokens.focus.ring,
          },
        },
        containedPrimary: {
          backgroundColor: color.accent.champagneDark,
          color: color.surface.white,
          "&:hover": {
            backgroundColor: color.text.primary,
            boxShadow: shadow.champagne,
          },
        },
        outlinedPrimary: {
          borderColor: color.accent.champagne,
          color: color.accent.champagneDark,
          backgroundColor: alpha(color.surface.primary, 0.6),
          "&:hover": {
            borderColor: color.accent.champagneDark,
            backgroundColor: color.surface.champagneSoft,
          },
        },
        textPrimary: {
          color: color.accent.champagneDark,
          "&:hover": {
            backgroundColor: color.surface.champagneSoft,
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
        fullWidth: true,
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          minHeight: size.interactiveMin,
          borderRadius: radius.sm,
          backgroundColor: color.surface.primary,
          transition: `background-color ${transition.standard}, box-shadow ${transition.standard}`,
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: color.border.subtle,
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: color.accent.champagne,
          },
          "&.Mui-focused": {
            boxShadow: flexPayzTokens.focus.ring,
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: color.accent.champagneDark,
            borderWidth: 1,
          },
          "&.Mui-error .MuiOutlinedInput-notchedOutline": {
            borderColor: color.status.danger,
          },
        },
        input: {
          paddingBlock: "0.875rem",
          color: color.text.primary,
          "&::placeholder": {
            color: color.text.faint,
            opacity: 1,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: color.text.muted,
          "&.Mui-focused": {
            color: color.accent.champagneDark,
          },
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          marginInline: 0,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          borderColor: color.border.subtle,
        },
        rounded: {
          borderRadius: radius.lg,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: radius.lg,
          border: `1px solid ${color.border.subtle}`,
          boxShadow: shadow.raised,
          backgroundColor: color.surface.primary,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: radius.lg,
          backgroundColor: color.surface.primary,
          boxShadow: shadow.floating,
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          minWidth: size.interactiveMin,
          minHeight: size.interactiveMin,
          color: color.text.muted,
          "&.Mui-checked": {
            color: color.accent.champagneDark,
          },
          "&.Mui-focusVisible": {
            boxShadow: flexPayzTokens.focus.ring,
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          "&.Mui-checked": {
            color: color.surface.white,
            "& + .MuiSwitch-track": {
              backgroundColor: color.accent.champagneDark,
              opacity: 1,
            },
          },
          "&.Mui-focusVisible": {
            boxShadow: flexPayzTokens.focus.ring,
          },
        },
        track: {
          backgroundColor: color.border.subtle,
          opacity: 1,
        },
      },
    },
    MuiTooltip: {
      defaultProps: {
        arrow: true,
      },
      styleOverrides: {
        tooltip: {
          borderRadius: radius.sm,
          backgroundColor: color.text.primary,
          color: color.surface.white,
          fontSize: typography.size.caption,
          padding: "0.5rem 0.75rem",
        },
        arrow: {
          color: color.text.primary,
        },
      },
    },
  },
});

export type FlexPayzTheme = typeof flexPayzTheme;
