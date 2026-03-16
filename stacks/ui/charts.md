# Charts — UI Toolkit

Recharts patterns for data visualisation in factory web projects.

---

## Why Recharts

**React-native.** Components are JSX. No imperative API, no canvas manipulation, no separate rendering pipeline.

**Declarative.** You describe the chart shape and pass data. Recharts handles scales, axes, transitions, and tooltips.

**AI-friendly.** Claude and v0 generate correct Recharts code reliably. The API surface is small and well-documented.

**SSR-compatible.** Works with Next.js server components when wrapped in a client boundary.

---

## Core Pattern: Always Use ResponsiveContainer

Every chart must be wrapped in `ResponsiveContainer`. Without it, charts render at 0 width or a hardcoded size.

```tsx
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

function RevenueChart({ data }: { data: DataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

**Never set explicit pixel widths on the chart itself.** Let ResponsiveContainer handle it. Set height on ResponsiveContainer, width always `"100%"`.

---

## Chart Types

### LineChart

**When to use:** Trends over time. Revenue, user growth, performance metrics.

- Use `type="monotone"` for smooth curves on continuous data.
- Use `type="linear"` for discrete data points where interpolation would mislead.
- Multiple lines: use distinct colors from the theme palette, add a `<Legend />`.

### BarChart

**When to use:** Comparing discrete categories. Monthly totals, feature usage counts, A/B test results.

- Vertical bars (default) for time series or ordered categories.
- Horizontal bars (`layout="vertical"`) when category labels are long.
- Stacked bars: use `stackId="a"` on related Bar components.

### AreaChart

**When to use:** Same as LineChart but when the magnitude (area under the curve) matters. Cumulative totals, capacity utilisation.

- Use `fillOpacity={0.1}` to `{0.3}` — heavy fills obscure overlapping areas.
- Stacked areas: useful for showing composition over time (e.g. revenue by source).

### PieChart

**When to use:** Part-to-whole relationships. Budget allocation, category distribution.

- Limit to 5–7 slices. More than that is unreadable — group the rest into "Other".
- Add labels or a Legend. Pie charts without labels are decorative, not informative.
- Prefer a horizontal BarChart if precision matters — humans compare lengths better than angles.

---

## Design Token Color Mapping

Use CSS variables from the Tailwind theme so charts respect light/dark mode and project branding.

```tsx
// Reference theme colors via CSS variables
<Line stroke="hsl(var(--primary))" />
<Bar fill="hsl(var(--primary))" />
<Area fill="hsl(var(--primary))" fillOpacity={0.2} stroke="hsl(var(--primary))" />
```

For multiple series, define a chart palette in CSS variables:

```css
/* globals.css */
:root {
  --chart-1: 221 83% 53%;   /* blue */
  --chart-2: 142 76% 36%;   /* green */
  --chart-3: 38 92% 50%;    /* amber */
  --chart-4: 280 67% 49%;   /* purple */
  --chart-5: 0 84% 60%;     /* red */
}
```

```tsx
<Line dataKey="sales" stroke="hsl(var(--chart-1))" />
<Line dataKey="returns" stroke="hsl(var(--chart-5))" />
```

This pattern keeps chart colours consistent with the rest of the UI and ensures dark mode compatibility.

---

## Mobile Adaptation

Charts on small screens need deliberate handling. A desktop dashboard chart does not magically work at 320px.

**Simplified axes.** Reduce XAxis tick count on mobile. Use `<XAxis tick={{ fontSize: 12 }} interval="preserveStartEnd" />` to show only first and last labels.

**Reduced height.** Drop from 300px to 200px on mobile. Use a responsive height value or media query.

**Horizontal scroll for bar charts.** When there are many bars, wrap the chart container in `overflow-x-auto` and give the chart a minimum width wider than the viewport.

**Hide on mobile if non-essential.** If the chart is supplementary (e.g. a sparkline in a dashboard card), hide it below `md` breakpoint: `<div className="hidden md:block">`.

**Touch tooltips.** Recharts tooltips work on tap. No special handling needed, but test on actual mobile viewports.

---

## Dashboard Chart Pattern

A standard dashboard card with a chart, used across factory projects:

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

function MetricChart({ title, description, data }: MetricChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "var(--radius)",
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--popover))",
                color: "hsl(var(--popover-foreground))",
              }}
            />
            <Bar
              dataKey="value"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

Key details:
- `tickLine={false}` and `axisLine={false}` for a clean, modern look.
- Tooltip styled with theme CSS variables so it matches Card styling.
- Bar `radius` rounds the top corners for visual consistency with `--radius` token.
- Chart lives inside CardContent, not as a standalone component.
