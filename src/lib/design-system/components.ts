export const COMPONENTS: Record<string, { html: string; css?: string }> = {
  button: {
    html: `<button class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
  {{text}}
</button>`,
    css: `
.bg-primary { background-color: hsl(var(--primary)); }
.text-primary-foreground { color: hsl(var(--primary-foreground)); }
.hover\\:bg-primary\\/90:hover { opacity: 0.9; }
.h-10 { height: 2.5rem; }
.px-4 { padding-left: 1rem; padding-right: 1rem; }
.py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
.rounded-md { border-radius: calc(var(--radius) - 2px); }
.font-medium { font-weight: 500; }
.text-sm { font-size: 0.875rem; }
.transition-colors { transition: background-color 0.2s, color 0.2s; }
`
  },
  card: {
    html: `<div class="rounded-lg border bg-card text-card-foreground shadow-sm">
  <div class="flex flex-col space-y-1.5 p-6">
    <h3 class="text-2xl font-semibold leading-none tracking-tight">{{title}}</h3>
    <p class="text-sm text-muted-foreground">{{description}}</p>
  </div>
  <div class="p-6 pt-0">
    {{content}}
  </div>
</div>`,
    css: `
.bg-card { background-color: hsl(var(--card)); }
.text-card-foreground { color: hsl(var(--card-foreground)); }
.shadow-sm { box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); }
.border { border: 1px solid hsl(var(--border)); }
`
  },
  input: {
    html: `<input type="{{type}}" placeholder="{{placeholder}}" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />`,
    css: `
.border-input { border-color: hsl(var(--input)); }
.bg-background { background-color: hsl(var(--background)); }
.placeholder\\:text-muted-foreground::placeholder { color: hsl(var(--muted-foreground)); }
`
  },
  label: {
    html: `<label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
  {{text}}
</label>`
  },
  container: {
    html: `<div class="container mx-auto p-8 max-w-4xl space-y-8">
  {{content}}
</div>`,
    css: `
.container { width: 100%; margin-right: auto; margin-left: auto; }
.max-w-4xl { max-width: 56rem; }
.mx-auto { margin-left: auto; margin-right: auto; }
`
  }
};
