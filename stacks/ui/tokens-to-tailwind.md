# Tokens to Tailwind — UI Toolkit

The pipeline from Design Mode style tokens to production Tailwind configuration and shadcn/ui CSS variables.

---

## The Pipeline

```
Design Mode (style-tokens.md) → tailwind.config.ts → globals.css → Components
```

1. **Design Mode** produces a `style-tokens.md` file with colour palette, typography, spacing, border radius, and shadows.
2. **Engineer Claude** maps those tokens to `tailwind.config.ts` and `globals.css` CSS variables.
3. **shadcn/ui components** consume the CSS variables automatically.
4. **Custom components** use Tailwind utilities that reference the same tokens.

Tokens are defined once. Both Tailwind utilities and shadcn/ui components consume them. No duplication, no drift.

---

## What Design Mode Produces

A `style-tokens.md` file in the project's `design/` folder. Structure:

```markdown
## Colour Palette
- Primary: #6366f1 (indigo)
- Primary foreground: #ffffff
- Secondary: #f1f5f9 (slate-100)
- Accent: #f59e0b (amber)
- Destructive: #ef4444
- Background: #ffffff
- Foreground: #0f172a
- Muted: #f1f5f9
- Border: #e2e8f0

## Typography
- Font family: Inter
- Heading: 600 weight
- Body: 400 weight
- Small: 14px / 0.875rem
- Base: 16px / 1rem

## Spacing
- Base unit: 4px
- Section gap: 24px (6 units)
- Card padding: 24px
- Input height: 40px

## Border Radius
- Default: 8px (0.5rem)
- Small (badges, chips): 4px
- Full (avatars): 9999px

## Shadows
- Card: 0 1px 3px rgba(0,0,0,0.1)
- Dropdown: 0 4px 6px rgba(0,0,0,0.1)
```

---

## Mapping to CSS Variables (globals.css)

shadcn/ui reads theme values from CSS variables defined in `globals.css`. Colours use the HSL channel format (without the `hsl()` wrapper).

Convert hex colours to HSL channels:

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222 47% 11%;

    --primary: 239 84% 67%;
    --primary-foreground: 0 0% 100%;

    --secondary: 210 40% 96%;
    --secondary-foreground: 222 47% 11%;

    --accent: 38 92% 50%;
    --accent-foreground: 0 0% 100%;

    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;

    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;

    --border: 214 32% 91%;
    --input: 214 32% 91%;
    --ring: 239 84% 67%;

    --radius: 0.5rem;

    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;

    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 11%;

    /* Chart palette */
    --chart-1: 239 84% 67%;
    --chart-2: 142 76% 36%;
    --chart-3: 38 92% 50%;
    --chart-4: 280 67% 49%;
    --chart-5: 0 84% 60%;
  }

  .dark {
    --background: 222 47% 11%;
    --foreground: 210 40% 98%;

    --primary: 239 84% 67%;
    --primary-foreground: 0 0% 100%;

    /* ... map all tokens for dark mode */
  }
}
```

**Key detail:** shadcn uses `hsl(var(--primary))` in component styles. The CSS variable stores only the HSL channels (`239 84% 67%`), not the full `hsl()` call. This allows composing with opacity: `hsl(var(--primary) / 0.5)`.

---

## Mapping to tailwind.config.ts

Extend the Tailwind theme to reference the CSS variables:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
};

export default config;
```

**Note:** `npx shadcn@latest init` generates most of this automatically. The engineer's job is to update the CSS variable values to match Design Mode tokens, not to write this config from scratch.

---

## Worked Example: colourbookpub-kdp

Design Mode produces tokens for the KDP Publisher admin dashboard:

**Design tokens (input):**
```markdown
## Colour Palette
- Primary: deep violet (#7c3aed) — main brand, CTAs
- Secondary: slate-100 (#f1f5f9) — backgrounds, secondary buttons
- Accent: amber (#f59e0b) — highlights, in-progress status
- Destructive: red-500 (#ef4444)
- Background: white
- Foreground: slate-900

## Typography
- Font: Inter (already the factory default)
- Headings: 600 weight
- Body: 400 weight

## Border Radius
- Default: 8px (0.5rem)
```

**Mapping (output in globals.css):**
```css
:root {
  --primary: 263 70% 58%;        /* #7c3aed → HSL */
  --primary-foreground: 0 0% 100%;
  --secondary: 210 40% 96%;      /* #f1f5f9 */
  --accent: 38 92% 50%;          /* #f59e0b */
  --destructive: 0 84% 60%;      /* #ef4444 */
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;     /* slate-900 */
  --radius: 0.5rem;
}
```

**Usage in components:**
```tsx
{/* These all "just work" with the tokens above */}
<Button>Publish Book</Button>                           {/* uses --primary */}
<Button variant="secondary">Save Draft</Button>         {/* uses --secondary */}
<Badge variant="default">Published</Badge>               {/* uses --primary */}
<Badge className="bg-accent text-accent-foreground">In Progress</Badge>
<Alert variant="destructive">Upload failed</Alert>       {/* uses --destructive */}
```

No component needs to know the actual colour values. Change `--primary` in globals.css and every primary-coloured element updates.

---

## Common Pitfalls

**Hardcoded colours.** Never use `bg-indigo-500` or `text-[#7c3aed]` in components. Always use semantic tokens: `bg-primary`, `text-muted-foreground`, `border-border`. Hardcoded colours break theming and dark mode.

**Forgetting dark mode.** Every `:root` variable needs a `.dark` counterpart. If Design Mode does not specify dark mode tokens, ask for them or derive sensible defaults (invert background/foreground, keep primary hue but adjust lightness).

**Wrong HSL format.** shadcn expects `H S% L%` without commas and without the `hsl()` wrapper. `239, 84%, 67%` (with commas) will silently break. `hsl(239 84% 67%)` (with wrapper) will also break. Just `239 84% 67%`.

**Skipping chart variables.** Charts need their own colour palette (`--chart-1` through `--chart-5`). If you only define `--primary`, multi-series charts will all be the same colour.

**Not running shadcn init.** The tailwind.config.ts colour mapping is generated by `npx shadcn@latest init`. Do not write it from scratch. Run init, then update the CSS variable values to match tokens.
