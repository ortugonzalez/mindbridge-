# BRESO Design System - Standard Operating Procedure (SOP)

## Purpose
This document defines the core visual and structural rules for the BRESO design system, ensuring consistency across all components and views.

## Core Principles
1. **Premium Aesthetics**: Use modern, clean layouts with high contrast and smooth transitions.
2. **Dynamic Theming**: Support for Light and Dark modes is mandatory.
3. **Consistency**: All components must use tokens defined in `theme.js`.

## Tokens

### Colors
- **Primary**: A vibrant, professional color (e.g., BRESO Blue or Purple).
- **Secondary**: A complementary accent color.
- **Surface**: Background colors for cards and sections.
- **Text**: Contrast-rich colors for readability.
- **Ghost**: Transparent but visible elements.

### Typography
- **Primary Font**: Modern sans-serif (e.g., Inter, Montserrat).
- **Secondary Font**: For headings if applicable.

### Spacing
- Use a 4px or 8px grid system.

## Component Specifics

### Buttons
- **Primary**: Solid background, high contrast text.
- **Secondary**: Outlined or subtle background.
- **Ghost**: No background, visible on hover.

### Cards
- Subtle shadows in Light mode.
- Subtle borders or slight elevation in Dark mode.

### Inputs
- Clear focus states.
- High accessibility.

### Toggle
- Smooth animation between modes.

### Avatar
- Dedicated persona representation for "Soledad".

### Typing Indicator
- 3 dots with a staggered "floating" or "pulsing" animation.

## Known Constraints / Edge Cases
- **Mobile View**: All components must be responsive.
- **Contrast**: Ensure AA/AAA accessibility standards for text-to-background ratios.
- **Dark Mode Switch**: Must update tokens globally.

## Future Improvements
- Storybook integration for component documentation.
- Micro-interactions for all hover states.
