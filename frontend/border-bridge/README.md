# Border Bridge Refugee Intake System

A comprehensive multi-step form application for refugee intake processing, built with React, Vite, and modern UI components.

## Features

- **Multi-Step Wizard Form**: 4-section intake process (Core Identity, Voice Narrative, Family Relationships, Service Tracking)
- **Form Validation**: Zod schema validation with React Hook Form
- **Responsive Design**: Tailwind CSS with custom brand color palette
- **Accessible Components**: shadcn/ui component library
- **Type-Safe**: Full TypeScript support

## Tech Stack

- **Frontend**: React 19.2.4 with Vite
- **Styling**: Tailwind CSS with custom brand colors
- **Components**: shadcn/ui (Button, Input, Select, Textarea, Checkbox)
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Routing**: React Router DOM

## Brand Color System

The application uses a custom brand color palette that automatically updates all shadcn/ui components:

- **Primary**: Trustworthy blue (`--brand-primary`) - Main brand color
- **Secondary**: Warm brown (`--brand-secondary`) - Supporting elements
- **Accent**: Hopeful green (`--brand-accent`) - Highlights and success states

### Usage

```css
/* CSS Variables (defined in src/globals.css) */
--brand-primary: 221.2 83.2% 53.3%;    /* Blue */
--brand-secondary: 142.1 76.2% 36.3%;   /* Brown */
--brand-accent: 158.1 64.4% 51.6%;     /* Green */
```

```jsx
// Tailwind Classes
<div className="bg-brand-primary text-brand-secondary border-brand-accent">
  {/* All shadcn components automatically use brand colors */}
</div>
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
src/
├── components/ui/          # shadcn/ui components
├── pages/                  # Page components
│   └── Intake.jsx         # Main intake form
├── types/                  # TypeScript types and schemas
│   └── formSchema.js      # Zod validation schema
├── App.jsx                 # Main app component
└── main.jsx               # App entry point
```

## Form Sections

1. **Core Identity**: Personal information and basic details
2. **Voice Narrative**: Refugee story and experiences
3. **Family Relationships**: Family member information
4. **Service Tracking**: Service requests and follow-up needs

## Contributing

This application is designed for humanitarian use. Please ensure all changes maintain accessibility standards and respect user privacy.
