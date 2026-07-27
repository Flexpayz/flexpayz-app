import { Box, Container, Stack, SxProps, Theme } from "@mui/material";
import { ReactNode } from "react";

type PageShellProps = {
  children: ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl";
  bleed?: boolean;
  sx?: SxProps<Theme>;
};

export function PageShell({
  children,
  className,
  maxWidth = "lg",
  bleed = false,
  sx,
}: PageShellProps) {
  const content = (
    <Stack
      component="main"
      className={className}
      spacing={{ xs: 6, md: 8 }}
      sx={{
        width: "100%",
        py: { xs: 6, md: 10 },
        color: "var(--fp-color-ink)",
        ...sx,
      }}
    >
      {children}
    </Stack>
  );

  if (bleed) {
    return (
      <Box sx={{ minHeight: "100vh", backgroundColor: "var(--fp-color-canvas)" }}>
        {content}
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "var(--fp-color-canvas)" }}>
      <Container maxWidth={maxWidth}>{content}</Container>
    </Box>
  );
}
