import { GlobalStyles } from "@mui/material";
import { flexPayzCssVariables } from "./cssVariables";

export function FlexPayzGlobalStyles() {
  return (
    <GlobalStyles
      styles={{
        ":root": {
          ...flexPayzCssVariables,
          colorScheme: "light",
        },
        "*, *::before, *::after": {
          boxSizing: "border-box",
        },
        html: {
          width: "100%",
          minHeight: "100%",
          backgroundColor: "var(--fp-color-canvas)",
          WebkitTextSizeAdjust: "100%",
        },
        body: {
          width: "100%",
          minHeight: "100%",
          margin: 0,
          overflowX: "hidden",
          backgroundColor: "var(--fp-color-canvas)",
          color: "var(--fp-color-ink)",
          fontFamily: "var(--fp-font-ui)",
          fontSize: "var(--fp-font-size-body)",
          lineHeight: "var(--fp-line-height-body)",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        },
        ".fp-typography-display, .fp-typography-page-title, .fp-typography-heading": {
          fontFamily: "var(--fp-font-display)",
          fontWeight: 400,
          lineHeight: "var(--fp-line-height-tight)",
          letterSpacing: "var(--fp-letter-spacing-reset)",
        },
        ".fp-typography-page-title": {
          fontSize: "var(--fp-font-size-display)",
        },
        ".fp-typography-heading": {
          fontSize: "var(--fp-font-size-heading)",
        },
        ".fp-typography-display-emphasis": {
          fontFamily: "var(--fp-font-display)",
          fontStyle: "italic",
          fontWeight: 400,
        },
        ".fp-typography-body": {
          fontFamily: "var(--fp-font-ui)",
          fontSize: "var(--fp-font-size-body)",
          fontWeight: 400,
          lineHeight: "var(--fp-line-height-body)",
          letterSpacing: "var(--fp-letter-spacing-reset)",
        },
        ".fp-typography-label": {
          fontFamily: "var(--fp-font-ui)",
          fontSize: "var(--fp-font-size-body-small)",
          fontWeight: 600,
          lineHeight: "var(--fp-line-height-control)",
          letterSpacing: "var(--fp-letter-spacing-reset)",
        },
        ".fp-typography-caption": {
          fontFamily: "var(--fp-font-ui)",
          fontSize: "var(--fp-font-size-caption)",
          fontWeight: 400,
          lineHeight: "var(--fp-line-height-control)",
          letterSpacing: "var(--fp-letter-spacing-reset)",
        },
        ".fp-typography-eyebrow, .auth-kicker, .entry-kicker, .business-kicker, .workspace-kicker, .workspace-section-kicker, .workspace-sidebar-kicker, .devices-kicker, .devices-card-kicker, .custom-link-public-kicker, .business-editor-section > p, .device-identity-card span, .device-sidebar-identity span, .dialog-title-row span, .reset-device-dialog .MuiDialogTitle-root span": {
          fontFamily: "var(--fp-font-ui)",
          fontSize: "var(--fp-font-size-eyebrow)",
          fontWeight: 700,
          lineHeight: 1.2,
          letterSpacing: "var(--fp-letter-spacing-eyebrow)",
          textTransform: "uppercase",
          color: "var(--fp-color-text-muted)",
        },
        "#root": {
          minHeight: "100vh",
          overflowX: "hidden",
        },
        "img, picture, video, canvas, svg": {
          display: "block",
          maxWidth: "100%",
        },
        "button, input, textarea, select": {
          font: "inherit",
        },
        "::selection": {
          backgroundColor: "var(--fp-color-champagne-soft)",
          color: "var(--fp-color-ink)",
        },
        ":focus": {
          outlineColor: "var(--fp-color-champagne-dark)",
        },
        ":focus-visible": {
          outline: "var(--fp-focus-outline)",
          outlineOffset: "var(--fp-focus-offset)",
        },
        "@media (prefers-reduced-motion: reduce)": {
          "*, *::before, *::after": {
            animationDuration: "0.01ms !important",
            animationIterationCount: "1 !important",
            scrollBehavior: "auto !important",
            transitionDuration: "0.01ms !important",
          },
        },
      }}
    />
  );
}
