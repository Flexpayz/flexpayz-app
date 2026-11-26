import { TextField, TextFieldProps } from "@mui/material";

export type AppTextFieldProps = TextFieldProps;

export function AppTextField({ sx, ...textFieldProps }: AppTextFieldProps) {
  return (
    <TextField
      {...textFieldProps}
      sx={{
        "& .MuiInputBase-root": {
          minHeight: "var(--fp-size-interactive-min)",
        },
        ...sx,
      }}
    />
  );
}
