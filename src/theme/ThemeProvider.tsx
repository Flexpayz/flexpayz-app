import { CssBaseline, ThemeProvider } from "@mui/material";
import { ReactNode } from "react";
import { FlexPayzGlobalStyles } from "./GlobalStyles";
import { flexPayzTheme } from "./theme";

type FlexPayzThemeProviderProps = {
  children: ReactNode;
};

export function FlexPayzThemeProvider({ children }: FlexPayzThemeProviderProps) {
  return (
    <ThemeProvider theme={flexPayzTheme}>
      <CssBaseline />
      <FlexPayzGlobalStyles />
      {children}
    </ThemeProvider>
  );
}
