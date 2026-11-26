import { Stack, Typography } from "@mui/material";
import { ReactNode } from "react";

type SectionHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <Stack
      className={className}
      direction={{ xs: "column", md: "row" }}
      spacing={{ xs: 3, md: 4 }}
      alignItems={{ xs: "flex-start", md: "flex-end" }}
      justifyContent="space-between"
    >
      <Stack spacing={1.5} sx={{ maxWidth: 680 }}>
        {eyebrow ? (
          <Typography
            variant="overline"
            className="fp-typography-eyebrow"
            sx={{
              display: "block",
            }}
          >
            {eyebrow}
          </Typography>
        ) : null}
        <Typography variant="h3" component="h2">
          {title}
        </Typography>
        {description ? (
          <Typography variant="body1" color="text.secondary">
            {description}
          </Typography>
        ) : null}
      </Stack>
      {action}
    </Stack>
  );
}
