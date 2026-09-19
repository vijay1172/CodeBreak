---
name: CodeBreak
description: A precise code-review workspace for debugging practice.
colors:
  primary: "#2459bd"
  primary-hover: "#194897"
  paper: "#f3f5f8"
  ink: "#1c3046"
  surface: "#fff"
  muted: "#e8edf5"
  muted-ink: "#53657a"
  supporting-ink: "#475e76"
  accent: "#dbe5f6"
  border: "#cbd4e0"
  input-border: "#a9b8cb"
  diagnostic: "#ac3b27"
  diagnostic-surface: "#fff0eb"
  diagnostic-ink: "#8b301e"
  success: "#196e50"
  success-surface: "#e5f4ec"
  syntax-keyword: "#7134a5"
  code-comment: "#62748a"
typography:
  display:
    fontFamily: '"Manrope Variable", sans-serif'
    fontSize: "clamp(2.4rem,5.6vw,5.3rem)"
    fontWeight: 750
    lineHeight: 1.15
    letterSpacing: "-.04em"
  headline:
    fontFamily: '"Manrope Variable", sans-serif'
    fontSize: "clamp(1.8rem,3.2vw,2.8rem)"
    fontWeight: 750
    lineHeight: 1.15
    letterSpacing: "-.03em"
  title:
    fontFamily: '"Manrope Variable", sans-serif'
    fontSize: "1.15rem"
    fontWeight: 750
    lineHeight: 1.15
    letterSpacing: "-.015em"
  body:
    fontFamily: '"Manrope Variable", sans-serif'
    fontSize: "15px"
    lineHeight: 1.65
  label:
    fontFamily: '"Manrope Variable", sans-serif'
    fontSize: "14px"
    fontWeight: 750
    lineHeight: 1.4
  code:
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace"
    fontSize: "13px"
    lineHeight: 1.8
rounded:
  control: "5px"
  panel: "8px"
  file-selection: "3px"
spacing:
  compact: "8px"
  control-gap: "12px"
  content: "20px"
  panel: "24px"
  form: "30px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 22px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 22px"
  button-secondary-hover:
    backgroundColor: "#e2eaf8"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    padding: "8px 0"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "11px 13px"
  form-panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "30px"
  navigation:
    textColor: "{colors.ink}"
  status-solved:
    textColor: "{colors.success}"
  diagnostic-panel:
    backgroundColor: "{colors.diagnostic-surface}"
    textColor: "{colors.diagnostic-ink}"
    rounded: "{rounded.control}"
    padding: "18px"
---

# Design System: CodeBreak

## Overview

**Creative North Star: "The Code Review Desk"**

CodeBreak pairs cool paper, dark ink, and deliberate blue actions with the visual language of source files and diagnostic results. The atmosphere is calm, direct, and technical without making the interface itself feel like a terminal.

Generous space introduces the product; tighter rows and panels support practice. File paths, line numbers, restrained separators, and readable code carry the identity. The system serves students and junior engineers investigating unfamiliar projects.

**Key Characteristics:**

- Cool paper and white working surfaces.
- Strong Manrope headings with system monospace for code.
- Blue actions, rust failures, and green verified success.
- Restrained corners, thin separators, and minimal elevation.

This is a scan of the completed implementation. The frontmatter captures reusable values; `app/globals.css` and `components/code-editor.tsx` remain the implementation authority. Role names describe the observed design rather than introducing a second theme.

## Colors

### Dark theme

The global header toggle preserves the Code Review Desk hierarchy for low-light practice: slate canvas (#14202d), raised working surfaces (#1d2a39), pale review blue (#8fb5ff), and readable ink (#e0e8f2). Success stays green and diagnostics stay warm, each with its own darker surface. Syntax, gutters, selections, native controls, focus, and toast colors use semantic variables rather than fixed light colors.

The initial theme follows the device preference. Explicit choices persist under `codebreak-theme`, synchronize between tabs, and apply before page content paints. The same toggle appears on every route, including authentication and 404. Switching themes must never reset editor contents or test results.

The palette combines cool neutrals and a clear working blue with semantic diagnostic colors.

### Primary

- **Review Blue:** primary actions, interactive text, focus outlines, active output tabs, and the editor caret.
- **Deep Review Blue:** primary-button hover and selected file text.

### Secondary

- **Diagnostic Rust:** failure marks, failing assertions, and diagnostic code values. The pale diagnostic surface and darker diagnostic ink keep longer error text readable.
- **Verified Green:** passed assertions, solved status, progress bars, strings, and the demonstration's repaired state.
- **Keyword Violet:** code syntax only; it does not introduce another interface action color.

### Neutral

- **Cool Paper:** the page background.
- **Review Ink:** headings, body text, and core labels.
- **Working White:** forms, editor, and demonstration surfaces.
- **Muted Paper and Accent Wash:** supporting tonal layers.
- **Muted Ink and Supporting Ink:** metadata and explanatory copy.
- **Rule Gray and Input Gray:** separators and control boundaries.
- **Comment Slate:** code comments, line numbers, and placeholder text.

**The Diagnostic Meaning Rule.** Pair success and failure colors with text or an icon; color alone must not communicate test outcomes.

## Typography

Manrope Variable is self-hosted through the font package imported in the root layout. The body uses a sans-serif fallback. Source code and sequence markers use the platform monospace stack in the frontmatter.

Display, headline, and title roles share compact line height and slightly tight tracking. Body copy is more open. Paragraphs are capped at 68 characters; the landing introduction uses a narrower measure.

### Hierarchy

- **Display:** landing headings use the display role, with responsive overrides documented below.
- **Headline:** section headings use the headline role.
- **Title:** compact subsection headings use the title role; challenge rows use a slightly larger title.
- **Body:** the default reading size is the body role; explanatory landing copy grows to 18px.
- **Label:** primary controls use the label role. Navigation uses 14px at weight 600; metadata usually ranges from 10px to 13px.
- **Code:** the live editor uses the code role; the illustration uses the same family and size with a slightly tighter line height.

**The Code Is Content Rule.** Reserve monospace for source, file numbering, and diagnostic artifacts; retain Manrope for instructions and controls.

## Layout

The shared page container is capped at 1240px, with 40px gutters on each side. At 760px and below, those gutters become 20px. Header and footer align to the same outer spacing.

The landing hero uses two columns at a 1:1.08 ratio. Workflow and curriculum sections also pair explanatory copy with evidence or steps. These compositions stack at 760px. The hero heading becomes 4rem at 1100px and below, then uses a 2.8rem–4.2rem fluid range on mobile. These are landing-specific overrides, not a global headline scale.

Forms pair context with a white panel capped at 450px; mobile layouts stack both and let the form fill the container. Challenge listings use horizontal rules and aligned columns. Their action wraps below the descriptive content at 1100px, and compact rows reorganize at 760px.

The lab is capped at 1800px. Its wide layout is a 210px file explorer, flexible editor, and 290px brief with 22px gaps. At 1100px the file explorer hides and the toolbar file selector remains available. At 760px the brief moves above the editor in one column. Criteria, hints, and reporting remain available.

Spacing follows observed component needs rather than a fabricated universal scale. Use the frontmatter's recurring steps for internal spacing; larger section gaps remain contextual.

## Elevation & Depth

Depth comes chiefly from cool tonal layers, white surfaces, and thin borders. Forms and the lab workspace do not need floating shadows. The illustrative code sample alone receives an ambient lift.

### Shadow Vocabulary

- **Demonstration lift:** `0 18px 40px -25px #334e76`, used by the landing's illustrated bug panel.

**The Working Surface Rule.** Keep operational panels flat and distinguish them through tone and boundaries.

## Shapes

Controls and editor containers use the control radius. Forms and the demonstration use the panel radius; selected file rows use the smaller file-selection radius. Thin borders divide files, rows, tabs, and outputs. The forms are compact rectangles, with no pill-shaped action system.

The root `--radius` compatibility token is .4rem; the custom interface explicitly uses the concrete radii documented above. Do not replace those observed values with a framework default.

## Components

### Buttons

Buttons are clear, compact, and confident. Primary actions use Review Blue with white text, a one-pixel blue border, and a minimum height of 48px. Hover deepens the background over .15s. Secondary actions use a transparent background and a pale blue border, with a pale hover wash. Text actions use blue text without a filled container.

Small controls use a 42px minimum height; mobile header actions use 38px, and mobile lab actions use 40px. Disabled buttons reduce opacity to .5 and use the unavailable cursor.

All keyboard-focused controls use a three-pixel Review Blue outline offset by four pixels. The global skip link appears on focus and targets the main content.

### Cards / Containers

The white form panel uses a thin Rule Gray border and the panel radius, with form spacing inside; mobile reduces its padding to the panel spacing step. The editor uses the control radius, clipped content, and no shadow. Challenge collections are divided rows rather than repeated floating cards.

### Inputs / Fields

Inputs and selects have white backgrounds, Input Gray borders, the control radius, and the input padding in the frontmatter. Placeholder text uses Comment Slate. Password visibility controls sit beside the input within a shared border. Search fields combine an icon and input in the same bordered shell. Keep labels visible and use the shared keyboard focus treatment.

### Navigation

The header uses an inline code mark, a heavy wordmark, and a compact horizontal navigation group. Navigation links change to Review Blue on hover without underlines. At mobile widths the header and navigation can wrap. Authenticated links reflect the account state; there is no invented active-page treatment.

The theme control is deliberately borderless. Its sun and moon share a compact orbit: changing themes rotates and crossfades the icons, while hovering briefly reveals small orbiting points. Motion pauses unless the control is being used and is removed for reduced-motion preferences.

### Support form

The footer opens a first-party support page rather than invoking a device mail application. The form uses the same flat working surface as authentication, with persistent labels, specific validation and delivery errors, an anti-spam field, and a dedicated confirmation state. Messages are delivered server-side so provider credentials never reach the browser.

### Status and Diagnostics

Solved status combines a check icon and text. Error panels use the diagnostic background, a warm border, and darker error text. Lab output tabs communicate selection through blue text and a bottom border. Result messages and assertion icons make meaning explicit.

### Code Editor and Illustrated Bug

The live editor is white, with cool gutters and an active-line wash. Its height is 460px, code wraps, and line numbers and folding remain visible. Syntax colors distinguish keywords, strings, numbers, functions, comments, types, and properties.

The landing illustration juxtaposes client and server files. Its explicit “See the fix” control changes an incorrect authentication header to a matching one, then offers replay. The changed line uses a .6s reveal; the result uses a polite live region. This is a labeled example, not a claim that the illustration executed tests.

Respect reduced motion: the implementation disables animations and transitions and changes smooth scrolling to automatic scrolling.

## Do's and Don'ts

### Do:

- **Do** use shared blue actions and visible keyboard focus.
- **Do** preserve readable code, visible labels, and text alongside result colors.
- **Do** use file paths, rules, and diagnostic evidence to express the debugging identity.
- **Do** preserve mobile access to challenge criteria, hints, file selection, and results.
- **Do** describe examples and real test execution accurately.

### Don't:

- **Don't** add generic SaaS claims or invented metrics.
- **Don't** turn every challenge row into a floating card.
- **Don't** use diagnostic colors as arbitrary action accents.
- **Don't** animate essential interaction when reduced motion is requested.
