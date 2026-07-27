import { Box } from "@mui/material";
import { ReactComponent as LogoSvg } from "../../assets/brand/flexpayz-logo.svg";

type FlexPayzLogoPresentation = "full" | "mark";
type FlexPayzLogoSurface = "light" | "dark";

type FlexPayzLogoProps = {
  presentation?: FlexPayzLogoPresentation;
  surface?: FlexPayzLogoSurface;
  title?: string;
  className?: string;
};

export function FlexPayzLogo({
  presentation = "full",
  surface = "light",
  title = "FlexPayz",
  className,
}: FlexPayzLogoProps) {
  const isMark = presentation === "mark";

  return (
    <Box
      className={className}
      sx={{
        display: "inline-flex",
        width: isMark ? { xs: 56, md: 72 } : { xs: 180, md: 240 },
        maxWidth: "100%",
        color: "var(--fp-color-ink)",
        "--flexpayz-logo-ink":
          surface === "dark" ? "var(--fp-color-white)" : "var(--fp-color-ink)",
        "--flexpayz-logo-muted":
          surface === "dark"
            ? "var(--fp-color-champagne-soft)"
            : "var(--fp-color-text-muted)",
        "--flexpayz-logo-champagne": "var(--fp-color-champagne)",
        "& svg": {
          width: "100%",
          height: "auto",
          aspectRatio: isMark ? "1 / 1" : "31 / 6",
        },
        "& #flexpayz-wordmark": {
          display: isMark ? "none" : "block",
        },
      }}
    >
      <LogoSvg
        title={title}
        viewBox={isMark ? "0 0 120 120" : "0 0 620 120"}
        preserveAspectRatio="xMidYMid meet"
      />
    </Box>
  );
}
