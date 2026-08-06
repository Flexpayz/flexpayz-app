import {
  Box,
  Checkbox,
  FormControlLabel,
  Grid,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { ReactNode } from "react";
import { flexPayzTokens } from "../../theme";
import {
  AppButton,
  AppTextField,
  FlexPayzLogo,
  PageShell,
  SectionHeader,
  StatusBadge,
  Surface,
} from ".";

type ColorToken = {
  name: string;
  value: string;
};

const colorGroups: Record<string, ColorToken[]> = {
  Background: [
    { name: "Canvas", value: flexPayzTokens.color.background.canvas },
    { name: "Secondary", value: flexPayzTokens.color.background.secondary },
  ],
  Surface: [
    { name: "Primary", value: flexPayzTokens.color.surface.primary },
    { name: "White", value: flexPayzTokens.color.surface.white },
    { name: "Sand", value: flexPayzTokens.color.surface.sand },
    { name: "Soft champagne", value: flexPayzTokens.color.surface.champagneSoft },
  ],
  Text: [
    { name: "Primary ink", value: flexPayzTokens.color.text.primary },
    { name: "Muted", value: flexPayzTokens.color.text.muted },
    { name: "Faint", value: flexPayzTokens.color.text.faint },
  ],
  Accent: [
    { name: "Champagne", value: flexPayzTokens.color.accent.champagne },
    { name: "Dark champagne", value: flexPayzTokens.color.accent.champagneDark },
  ],
  Status: [
    { name: "Success", value: flexPayzTokens.color.status.success },
    { name: "Soft success", value: flexPayzTokens.color.status.successSoft },
    { name: "Danger", value: flexPayzTokens.color.status.danger },
    { name: "Border", value: flexPayzTokens.color.border.subtle },
  ],
};

function PreviewBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Surface>
      <Stack spacing={4}>
        <Typography variant="h5">{title}</Typography>
        {children}
      </Stack>
    </Surface>
  );
}

function ColorSwatch({ name, value }: ColorToken) {
  return (
    <Stack spacing={1}>
      <Box
        sx={{
          height: 72,
          borderRadius: "var(--fp-radius-md)",
          border: "1px solid var(--fp-color-border)",
          backgroundColor: value,
        }}
      />
      <Box>
        <Typography variant="body2" sx={{ color: "var(--fp-color-ink)" }}>
          {name}
        </Typography>
        <Typography variant="caption">{value}</Typography>
      </Box>
    </Stack>
  );
}

export function DesignSystemPreview() {
  return (
    <PageShell maxWidth="xl">
      <SectionHeader
        eyebrow="Design system"
        title="FlexPayz champagne foundation"
        description="Development-only preview for tokens, MUI defaults and initial primitives."
        action={<StatusBadge tone="champagne">Phase 0</StatusBadge>}
      />

      <PreviewBlock title="Logo">
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Stack spacing={3}>
              <Typography variant="body2">Light surface</Typography>
              <FlexPayzLogo />
              <FlexPayzLogo />
            </Stack>
          </Grid>
          <Grid item xs={12} md={6}>
            <Surface
              sx={{
                backgroundColor: "var(--fp-color-ink)",
                borderColor: "var(--fp-color-ink)",
              }}
            >
              <Stack spacing={3}>
                <Typography
                  variant="body2"
                  sx={{ color: "var(--fp-color-champagne-soft)" }}
                >
                  Dark surface
                </Typography>
                <FlexPayzLogo />
                <FlexPayzLogo />
              </Stack>
            </Surface>
          </Grid>
        </Grid>
      </PreviewBlock>

      <PreviewBlock title="Color Tokens">
        <Stack spacing={5}>
          {Object.entries(colorGroups).map(([group, colors]) => (
            <Stack key={group} spacing={2}>
              <Typography variant="h6">{group}</Typography>
              <Grid container spacing={3}>
                {colors.map((colorToken) => (
                  <Grid item xs={6} sm={4} md={3} lg={2} key={colorToken.name}>
                    <ColorSwatch {...colorToken} />
                  </Grid>
                ))}
              </Grid>
            </Stack>
          ))}
        </Stack>
      </PreviewBlock>

      <PreviewBlock title="Typography">
        <Stack spacing={3}>
          <Typography variant="h1">Premium display heading</Typography>
          <Typography variant="h2">Elegant section heading</Typography>
          <Typography variant="h4">Operational UI heading</Typography>
          <Typography variant="body1">
            Inter is reserved for body copy, navigation, fields, buttons and
            dense interface text.
          </Typography>
          <Typography variant="body2">
            Muted supporting copy stays compact and readable across mobile and
            desktop.
          </Typography>
          <Typography variant="caption">Caption and helper text</Typography>
        </Stack>
      </PreviewBlock>

      <PreviewBlock title="Buttons">
        <Stack direction="row" flexWrap="wrap" gap={2}>
          <AppButton>Primary action</AppButton>
          <AppButton variant="outlined">Secondary action</AppButton>
          <AppButton variant="text">Text action</AppButton>
          <AppButton disabled>Disabled action</AppButton>
        </Stack>
      </PreviewBlock>

      <PreviewBlock title="Inputs">
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <AppTextField label="Cardholder name" placeholder="Maria Popescu" />
          </Grid>
          <Grid item xs={12} md={4}>
            <AppTextField
              label="Profile URL"
              defaultValue="flexpayz.com/member"
              helperText="Helper text uses the shared muted scale."
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <AppTextField
              label="Validation state"
              defaultValue="invalid-link"
              error
              helperText="Enter a valid public link."
            />
          </Grid>
        </Grid>
        <Stack direction="row" flexWrap="wrap" gap={2}>
          <FormControlLabel control={<Checkbox defaultChecked />} label="Active" />
          <FormControlLabel control={<Switch defaultChecked />} label="Public" />
        </Stack>
      </PreviewBlock>

      <PreviewBlock title="Cards And Badges">
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Surface>
              <Stack spacing={2}>
                <StatusBadge tone="champagne">Premium</StatusBadge>
                <Typography variant="h5">Primary surface</Typography>
                <Typography variant="body2">
                  Used for focused content, forms and compact dashboards.
                </Typography>
              </Stack>
            </Surface>
          </Grid>
          <Grid item xs={12} md={4}>
            <Surface tone="sand">
              <Stack spacing={2}>
                <StatusBadge tone="success">Connected</StatusBadge>
                <Typography variant="h5">Sand surface</Typography>
                <Typography variant="body2">
                  Adds warmth without competing with content.
                </Typography>
              </Stack>
            </Surface>
          </Grid>
          <Grid item xs={12} md={4}>
            <Surface tone="soft">
              <Stack spacing={2}>
                <StatusBadge tone="danger">Needs review</StatusBadge>
                <Typography variant="h5">Soft accent surface</Typography>
                <Typography variant="body2">
                  Reserved for gentle emphasis and empty states.
                </Typography>
              </Stack>
            </Surface>
          </Grid>
        </Grid>
      </PreviewBlock>

      <PreviewBlock title="Responsive Spacing">
        <Grid container spacing={{ xs: 3, md: 6 }}>
          <Grid item xs={12} md={6}>
            <Surface tone="sand">
              <Typography variant="h6">Mobile rhythm</Typography>
              <Typography variant="body2">
                Compact spacing keeps 390px layouts readable without horizontal
                overflow.
              </Typography>
            </Surface>
          </Grid>
          <Grid item xs={12} md={6}>
            <Surface tone="sand">
              <Typography variant="h6">Desktop rhythm</Typography>
              <Typography variant="body2">
                Wider screens use larger gaps while preserving the same token
                scale.
              </Typography>
            </Surface>
          </Grid>
        </Grid>
      </PreviewBlock>
    </PageShell>
  );
}
