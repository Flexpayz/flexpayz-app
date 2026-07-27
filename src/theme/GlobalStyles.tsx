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
