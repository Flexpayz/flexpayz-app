import { Box } from "@mui/material";
import { ReactNode } from "react";

type StatusBadgeTone = "neutral" | "champagne" | "success" | "danger";

type StatusBadgeProps = {
  children: ReactNode;
  tone?: StatusBadgeTone;
  className?: string;
};

const toneStyles: Record<
  StatusBadgeTone,
  { backgroundColor: string; borderColor: string; color: string }
> = {
  neutral: {
    backgroundColor: "var(--fp-color-surface-primary)",
    borderColor: "var(--fp-color-border)",
    color: "var(--fp-color-text-muted)",
  },
  champagne: {
    backgroundColor: "var(--fp-color-champagne-soft)",
    borderColor: "var(--fp-color-champagne)",
    color: "var(--fp-color-champagne-dark)",
  },
  success: {
    backgroundColor: "var(--fp-color-success-soft)",
    borderColor: "var(--fp-color-success-soft)",
    color: "var(--fp-color-success)",
  },
  danger: {
    backgroundColor: "var(--fp-color-surface-primary)",
    borderColor: "var(--fp-color-danger)",
    color: "var(--fp-color-danger)",
  },
};

export function StatusBadge({
  children,
  tone = "neutral",
  className,
}: StatusBadgeProps) {
  return (
    <Box
      component="span"
      className={className}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: 28,
        px: 2.5,
        border: "1px solid",
        borderRadius: "999px",
        fontSize: "var(--fp-font-size-caption)",
        fontWeight: 600,
        lineHeight: "var(--fp-line-height-control)",
        ...toneStyles[tone],
      }}
    >
      {children}
    </Box>
  );
}
