# UI Wireframes

The shipped pages are the realized wireframes. Layout reference below; all share a left nav rail (`src/components/Sidebar.tsx`) with the Orca Coast logo and content on the right.

## Who to Contact (`/`)
```
┌ Who Should We Contact This Week? ─────────────────────────────┐
│ [Recommended][Above 80][Weighted Pipeline][Top Opp]  (stats)  │
│ ┌ Recommendation card ──────┐ ┌ Recommendation card ────────┐ │
│ │ #1 Name  [Hot]   (ring)   │ │ #2 ...                      │ │
│ │ • reasons                 │ │                             │ │
│ │ 5 score bars + lead score │ │                             │ │
│ │ Est value | Close % | DMs │ │                             │ │
│ │ Similar Orca Coast projs  │ │                             │ │
│ └───────────────────────────┘ └─────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

## Territory Manager (`/territory`)
Row per account: rank · org/website · contacts · est size + similar customer · suggested sequence + opportunity · expandable AI first-touch email.

## Lead Discovery (`/leads`)
Search bar (industry / city / region / postal) → results table (org, industry, location, main contact, data confidence, est value, opportunity, category).

## CRM Pipeline (`/pipeline`)
8 horizontal columns (New Lead → Closed Lost). Draggable cards; each column shows count + total potential.

## Campaigns (`/campaigns`)
Grid of vertical templates (focus chips + day-by-day cadence) above the interactive AI Email Studio.

## Market Expansion (`/market`)
Top recommendation banner + table (category, tier, penetration, past projects, open leads, est market, recommendation).

## Heat Map (`/heatmap`)
Region cards tinted by revenue potential; each shows potential, leads, avg opportunity, hot count.

## Analytics (`/analytics`)
Metric stat grid + horizontal pipeline-by-stage bar chart.
