import { Button, ButtonProps } from "@mui/material";

export type AppButtonProps = ButtonProps;

export function AppButton({ sx, ...buttonProps }: AppButtonProps) {
  return (
    <Button
      {...buttonProps}
      sx={{
        minHeight: "var(--fp-size-interactive-min)",
        ...sx,
      }}
    />
  );
}
