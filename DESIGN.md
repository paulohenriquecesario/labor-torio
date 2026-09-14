---
name: Surgical Performance Intelligence
colors:
  surface: '#131317'
  surface-dim: '#131317'
  surface-bright: '#39393d'
  surface-container-lowest: '#0e0e12'
  surface-container-low: '#1b1b1f'
  surface-container: '#1f1f23'
  surface-container-high: '#2a292e'
  surface-container-highest: '#353439'
  on-surface: '#e4e1e7'
  on-surface-variant: '#c9c4d8'
  inverse-surface: '#e4e1e7'
  inverse-on-surface: '#303034'
  outline: '#938ea1'
  outline-variant: '#484555'
  surface-tint: '#cabeff'
  primary: '#cabeff'
  on-primary: '#31009a'
  primary-container: '#947dff'
  on-primary-container: '#2a0088'
  inverse-primary: '#603ce2'
  secondary: '#4ae08d'
  on-secondary: '#00391d'
  secondary-container: '#00b86a'
  on-secondary-container: '#004122'
  tertiary: '#f3bf53'
  on-tertiary: '#412d00'
  tertiary-container: '#b78920'
  on-tertiary-container: '#382700'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e6deff'
  primary-fixed-dim: '#cabeff'
  on-primary-fixed: '#1c0062'
  on-primary-fixed-variant: '#4816cb'
  secondary-fixed: '#6bfda7'
  secondary-fixed-dim: '#4ae08d'
  on-secondary-fixed: '#00210f'
  on-secondary-fixed-variant: '#00522c'
  tertiary-fixed: '#ffdea4'
  tertiary-fixed-dim: '#f3bf53'
  on-tertiary-fixed: '#261900'
  on-tertiary-fixed-variant: '#5d4200'
  background: '#131317'
  on-background: '#e4e1e7'
  surface-variant: '#353439'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  display-sm:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-bold:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  data-metric-lg:
    fontFamily: JetBrains Mono
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.03em
  data-metric-sm:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  data-code:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.25rem
  margin: 1.25rem
  margin-desktop: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 1.75rem
---

## Brand & Style

The design system is architected for elite direct-response copywriters, media buyers, and marketing analysts who operate in high-velocity, high-stakes environments. The aesthetic narrative is rooted in "surgical precision": cold, dark, analytical, and uncluttered. It evokes the focus of a terminal combined with the high-density information architecture of an institutional trading desk.

Key characteristics:
- **Tone:** Technical, sharp, silent, and uncompromising.
- **Form Factor:** Optimized primarily for desktop power users requiring high data density, rapid scanability, and minimal cognitive friction.
- **Visual Stance:** Utilitarian dark mode relying on strict tonal stratification rather than flashy lighting effects or skeuomorphism.

## Colors

The palette uses low-luminance neutral slate tones paired with laser-sharp functional accents. Color serves strictly as a tool for classification, directional performance, and validation.

### Background & Surface Hierarchy
- **Canvas (`#0E0E12`):** Ground-level backdrop for the entire viewport.
- **Sidebar (`#13131A`):** Low-contrast architectural anchor for vertical navigation.
- **Surface / Card (`#17171F`):** Standard container surface for panels, tables, and inspection modules.
- **Elevated Surface (`#1E1E28`):** Elevated container level used for modal headers, sticky table headers, dropdowns, and flyout menus.
- **Structural Stroke (`#2A2A36`):** 1px boundary layer separating functional zones and containment blocks.

### Typography Levels
- **Text Primary (`#F2F2F5`):** High-clarity white-silver for headlines, core copy samples, and key metric figures.
- **Text Secondary (`#9A9AA8`):** Balanced silver for labels, secondary copy lines, and structural guidance.
- **Text Muted (`#6A6A78`):** Subdued grey for table footers, metadata timestamps, and inactive iconography.

### Semantic & Intent Tokens
- **Action Primary (`#7C5CFF` / Hover: `#8F73FF`):** Focused energy for primary executions and active analysis states.
- **Success & Profit (`#35D07F`):** Denotes positive CTR shift, conversion scaling, and positive revenue deltas. Tint container: `rgba(53, 208, 127, 0.12)`.
- **Warning & "DOR" Vector (`#E8B54A`):** Flags hook fatigue, pain-point clustering ("DOR"), and test warnings. Tint container: `rgba(232, 181, 74, 0.12)`.
- **Critical & Loss (`#F0603E`):** Represents burn rate, decaying angles, and underperforming creatives. Tint container: `rgba(240, 96, 62, 0.12)`.
- **Desire Vector (`#A78BFA`):** Dedicated categorization for aspirational angles and benefit hooks ("DESEJO"). Tint container: `rgba(167, 139, 250, 0.12)`.

## Typography

The typographic engine balances rapid narrative reading with dense, tabular verification:

1. **Editorial & Interface Layer (Inter):** Leveraged across structural layouts, form controls, and copy body text. Letter spacing is slightly tightened across large formats to maintain strict density.
2. **Quantitative & Technical Layer (JetBrains Mono):** Dedicated to data elements, creative hashes, angle tags, ROAS calculations, character counts, and timestamps. It guarantees tabular figure alignment across dense comparative grids.

## Layout & Spacing

The workspace prioritizes vertical containment, lateral scannability, and high-density information displays.

- **Workspace Anatomy:** Fixed 240px sidebar on the left (`#13131A`), bordered by a solid 1px line (`#2A2A36`). The primary content area utilizes an internal fluid grid adapting to available desktop width.
- **Card Spacing:** All analytical modules and cards maintain an internal structural padding of `20px` (`1.25rem`), keeping visual weight unified across the dashboard.
- **Horizontal & Vertical Rhythm:** A dense 4px baseline sub-grid drives element gaps (`space-xs: 4px`, `space-sm: 8px`, `space-md: 12px`, `space-lg: 20px`, `space-xl: 28px`).
- **Responsive Behavior:** While focused on wide desktop screens (1440px+), down to 1024px tablet landscape the layout drops from multi-column metrics to stacked rows; the 240px sidebar collapses to a 56px icon rail.

## Elevation & Depth

This design system avoids traditional dropped shadows in favor of a strictly engineered tonal layering model combined with hairline borders:

- **Flat Stratification:** Depth is communicated exclusively through surface luminance changes (`#0E0E12` → `#17171F` → `#1E1E28`).
- **Structural Outlines:** Every card, cell barrier, and surface transition is bounded by a crisp 1px solid stroke (`#2A2A36`).
- **Floating Overlays (Dropdowns, Popovers, Modals):** Utilizes elevated surface `#1E1E28`, a 1px `#2A2A36` perimeter border, and a tight, low-diffusion black shadow (`0 8px 24px rgba(0, 0, 0, 0.5)`) to cleanly separate context layers without diffusing color into the dark workspace.

## Shapes

The geometric philosophy relies on structured, disciplined corners that keep the eye focused on analytical data:

- **Cards & Data Modules:** Fixed at `10px` border-radius to define distinct containment units without rounding away critical layout space.
- **Interactive Controls (Buttons, Inputs, Selectors):** Uniform `8px` border-radius for clean click targets and alignment with table rows.
- **Badges & Inline Status Pills:** Compact `4px` or `6px` radius to maintain a technical, chip-like appearance.

## Components

### Buttons
- **Primary:** Background `#7C5CFF`, text `#F2F2F5`, border-radius `8px`, padding `8px 16px`. Font: Inter 14px SemiBold. Hover: `#8F73FF`. Active: `#6C4CE6`.
- **Secondary / Outline:** Background transparent, border `1px solid #2A2A36`, text `#F2F2F5`, border-radius `8px`, padding `8px 16px`. Hover: Background `#1E1E28`, border color `#3A3A4A`.
- **Destructive:** Background transparent, border `1px solid rgba(240, 96, 62, 0.4)`, text `#F0603E`. Hover: Background `rgba(240, 96, 62, 0.12)`.
- **Icon / Compact:** Height `32px`, width `32px`, border-radius `8px`, border `1px solid #2A2A36`, background `#17171F`.

### Badges & Category Tags
Constructed with a 12% translucent background tint and 100% full-intensity text, rendered in `JetBrains Mono` 11px uppercase:
- **DOR (Pain Point):** Background `rgba(232, 181, 74, 0.12)`, text `#E8B54A`, border `1px solid rgba(232, 181, 74, 0.25)`.
- **DESEJO (Aspiration):** Background `rgba(167, 139, 250, 0.12)`, text `#A78BFA`, border `1px solid rgba(167, 139, 250, 0.25)`.
- **LUCRO (Winning):** Background `rgba(53, 208, 127, 0.12)`, text `#35D07F`, border `1px solid rgba(53, 208, 127, 0.25)`.
- **PREJUÍZO (Decaying):** Background `rgba(240, 96, 62, 0.12)`, text `#F0603E`, border `1px solid rgba(240, 96, 62, 0.25)`.

### Cards & Analytical Panels
- Background `#17171F`, border `1px solid #2A2A36`, border-radius `10px`, padding `20px`.
- Header sub-structure: Displays metadata, active tests, and creative ID badges on a single 24px vertical row before content blocks.

### Input Fields & Search Bars
- Background `#0E0E12`, border `1px solid #2A2A36`, border-radius `8px`, text `#F2F2F5`, placeholder `#6A6A78`.
- Focus state: Border color `#7C5CFF` with a zero-offset outline `0 0 0 1px #7C5CFF`.
- Typography: Inter 14px Regular for copy inputs; JetBrains Mono 13px for regex queries, URL filters, and token parameters.

### Data Tables (High-Density Zebra)
- **Header:** Sticky top, background `#1E1E28`, border-bottom `1px solid #2A2A36`, text `#9A9AA8`, font: `JetBrains Mono` 11px uppercase with `0.06em` tracking.
- **Rows:** Height `40px` (dense standard). Alternating zebra striping:
  - Row Even: Background `#17171F`
  - Row Odd: Background `#13131A`
  - Hover state: Background `#1E1E28` across all columns.
- **Dividers:** Horizontal hairline `1px solid #2A2A36`.
- **Cells:** Metric figures, CTR percentages, and Hook IDs rendered in `JetBrains Mono` 13px tabular figures. Creative copy excerpts rendered in `Inter` 13px.

### Navigation Sidebar
- Width: Fixed `240px`, height `100vh`, background `#13131A`, right border `1px solid #2A2A36`.
- Items: Height `36px`, padding `0 12px`, border-radius `6px`, text `#9A9AA8`, font: Inter 13px Medium.
- Active Item: Background `#1E1E28`, text `#F2F2F5`, with an indicator bar (`2px` wide in `#7C5CFF`) flush with the left boundary.