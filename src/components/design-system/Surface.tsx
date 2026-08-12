import { Paper, PaperProps } from "@mui/material";
import { ReactNode } from "react";

type SurfaceTone = "primary" | "sand" | "soft";

type SurfaceProps = Omit<PaperProps, "variant"> & {
  children: ReactNode;
  tone?: SurfaceTone;
};

const toneBackground: Record<SurfaceTone, string> = {
  primary: "var(--fp-color-surface-primary)",
  sand: "var(--fp-color-surface-sand)",
  soft: "var(--fp-color-champagne-soft)",
};

export function Surface({
  children,
  tone = "primary",
  sx,
  ...paperProps
}: SurfaceProps) {
  return (
    <Paper
      {...paperProps}
      sx={{
        p: { xs: 4, md: 6 },
        borderRadius: "var(--fp-radius-lg)",
        border: "1px solid var(--fp-color-border)",
        backgroundColor: toneBackground[tone],
        boxShadow: "var(--fp-shadow-raised)",
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
}
