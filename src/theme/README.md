# FlexPayz Theme Foundation

## Token organization

Design tokens live in `src/theme/tokens.ts`. Raw brand color values belong there and in theme-only files. Components should consume semantic tokens through the MUI theme or CSS custom properties.

`src/theme/cssVariables.ts` maps the core tokens to `--fp-*` custom properties so legacy CSS and new components can share the same values during gradual migration.

## MUI theme usage

Use `flexPayzTheme` from `src/theme/theme.ts` through `FlexPayzThemeProvider`. The provider is installed at the React root and includes `CssBaseline` plus global styles.

New UI should prefer MUI props, `sx`, and the primitives in `src/components/design-system` instead of local CSS files.

## CSS custom properties

Legacy CSS may use variables such as `var(--fp-color-canvas)`, `var(--fp-color-ink)`, `var(--fp-color-border)`, `var(--fp-radius-md)`, `var(--fp-shadow-raised)` and `var(--fp-size-interactive-min)`.

Do not hard-code brand hex values in migrated page CSS. Add or adjust semantic tokens first when a reusable value is missing.

## Typography rules

Inter is the UI font for body copy, navigation, buttons, form fields and dense interface text. Cormorant Garamond is reserved for premium display headings and editorial emphasis, and should not be used for form-heavy or dense operational UI.

The current implementation loads only the required Google Fonts weights: Inter 400, 500, 600 and 700; Cormorant Garamond 400, 500 and 400 italic.

## Migrating legacy pages

Migrate one flow at a time. Keep Firebase calls, database payloads, authentication checks and routing behavior unchanged. Replace local colors, spacing, typography and focus styles with theme tokens as each page is redesigned.

Start with shared layout primitives, then move repeated controls to `AppButton`, `AppTextField`, `Surface`, `StatusBadge`, `SectionHeader` and `FlexPayzLogo`.

## Values that must not be hard-coded

Do not hard-code brand colors, font families, spacing increments, border radii, shadows, transitions, focus rings, breakpoints or interactive target sizes in new UI components.
