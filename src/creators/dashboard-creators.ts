/**
 * @fileoverview Dashboard Creator
 * @description Creates a comprehensive dashboard to showcase shadcn/ui components
 * Includes interactive examples, form components, and navigation
 */

import fs from "fs-extra";
import path from "node:path";
import { 
  dashboardPagesManifest, 
  rootLayoutUpdateTemplate, 
  homePageUpdateTemplate 
} from "../templates/dashboard-templates.js";

export interface DashboardOptions {
  includeCharts?: boolean;
  includeCalendar?: boolean;
  includeMail?: boolean;
  includeUsers?: boolean;
}

export async function createDashboardPages(
  projectPath: string, 
  options: DashboardOptions = {}
): Promise<void> {
  const {
    includeCharts = false,
    includeCalendar = false, 
    includeMail = false,
    includeUsers = false
  } = options;

  console.error(`[DEBUG] Creating dashboard pages...`);

  try {
    // Create all dashboard pages and components
    for (const page of dashboardPagesManifest) {
      const fullPath = path.join(projectPath, page.path);
      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, page.content);
      console.error(`[DEBUG] Created: ${page.path}`);
    }

    // Update root layout with theme provider
    const rootLayoutPath = path.join(projectPath, "app", "layout.tsx");
    if (await fs.pathExists(rootLayoutPath)) {
      await fs.writeFile(rootLayoutPath, rootLayoutUpdateTemplate);
      console.error(`[DEBUG] Updated: app/layout.tsx`);
    }

    // Update home page with dashboard links
    const homePagePath = path.join(projectPath, "app", "page.tsx");
    if (await fs.pathExists(homePagePath)) {
      await fs.writeFile(homePagePath, homePageUpdateTemplate);
      console.error(`[DEBUG] Updated: app/page.tsx`);
    }

    // Create placeholder pages for additional sections
    if (includeCharts) {
      await createChartsPage(projectPath);
    }

    if (includeCalendar) {
      await createCalendarPage(projectPath);
    }

    if (includeMail) {
      await createMailPage(projectPath);
    }

    if (includeUsers) {
      await createUsersPage(projectPath);
    }

    console.error(`[DEBUG] Dashboard pages created successfully`);

  } catch (error) {
    console.error(`[ERROR] Failed to create dashboard pages: ${error}`);
    throw error;
  }
}

async function createChartsPage(projectPath: string): Promise<void> {
  const chartsPageContent = `import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ChartsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Charts</h1>
        <p className="text-muted-foreground">
          Data visualization examples will be added here
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Charts Coming Soon</CardTitle>
          <CardDescription>
            Chart components will be integrated in a future update
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This section will include various chart types using libraries like Chart.js or Recharts
            integrated with shadcn/ui styling.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}`;

  const chartsPagePath = path.join(projectPath, "app", "dashboard", "charts", "page.tsx");
  await fs.ensureDir(path.dirname(chartsPagePath));
  await fs.writeFile(chartsPagePath, chartsPageContent);
  console.error(`[DEBUG] Created: app/dashboard/charts/page.tsx`);
}

async function createCalendarPage(projectPath: string): Promise<void> {
  const calendarPageContent = `import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
        <p className="text-muted-foreground">
          Calendar components and scheduling interfaces
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Calendar Coming Soon</CardTitle>
          <CardDescription>
            Interactive calendar component will be added here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This section will include a full calendar interface with event management
            using shadcn/ui components.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}`;

  const calendarPagePath = path.join(projectPath, "app", "dashboard", "calendar", "page.tsx");
  await fs.ensureDir(path.dirname(calendarPagePath));
  await fs.writeFile(calendarPagePath, calendarPageContent);
  console.error(`[DEBUG] Created: app/dashboard/calendar/page.tsx`);
}

async function createMailPage(projectPath: string): Promise<void> {
  const mailPageContent = `import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function MailPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mail</h1>
        <p className="text-muted-foreground">
          Email interface components and examples
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Mail Interface Coming Soon</CardTitle>
          <CardDescription>
            Email management interface will be added here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This section will include an email-like interface showcasing
            list management, composition, and thread display components.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}`;

  const mailPagePath = path.join(projectPath, "app", "dashboard", "mail", "page.tsx");
  await fs.ensureDir(path.dirname(mailPagePath));
  await fs.writeFile(mailPagePath, mailPageContent);
  console.error(`[DEBUG] Created: app/dashboard/mail/page.tsx`);
}

async function createUsersPage(projectPath: string): Promise<void> {
  const usersPageContent = `import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">
          User management and profile components
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>User Management Coming Soon</CardTitle>
          <CardDescription>
            User administration interface will be added here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This section will include user tables, profile cards, and management
            interfaces built with shadcn/ui components.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}`;

  const usersPagePath = path.join(projectPath, "app", "dashboard", "users", "page.tsx");
  await fs.ensureDir(path.dirname(usersPagePath));
  await fs.writeFile(usersPagePath, usersPageContent);
  console.error(`[DEBUG] Created: app/dashboard/users/page.tsx`);
}

export async function addDashboardDependencies(projectPath: string): Promise<void> {
  const packageJsonPath = path.join(projectPath, "package.json");
  
  if (await fs.pathExists(packageJsonPath)) {
    const packageJson = await fs.readJson(packageJsonPath);
    
    // Add required dependencies for dashboard functionality
    const newDependencies = {
      "next-themes": "^0.4.0",
      "date-fns": "^4.1.0",
      "lucide-react": packageJson.dependencies["lucide-react"] || "^0.468.0"
    };

    packageJson.dependencies = {
      ...packageJson.dependencies,
      ...newDependencies
    };

    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
    console.error(`[DEBUG] Added dashboard dependencies to package.json`);
  }
}

export async function createDashboardReadme(projectPath: string): Promise<void> {
  const readmeContent = `# Dashboard Demo

This project includes a comprehensive dashboard showcasing all shadcn/ui components.

## Features

- **Dashboard Home**: Overview with stats cards and activity feed
- **Components**: Interactive showcase of all shadcn/ui components organized by category
- **Forms**: Example forms with various input types and validation
- **Theme Support**: Dark/light mode toggle
- **Responsive Design**: Mobile-friendly sidebar and navigation
- **TypeScript**: Full type safety throughout

## Pages

- \`/dashboard\` - Main dashboard with overview and stats
- \`/dashboard/components\` - Component showcase with tabs
- \`/dashboard/forms\` - Form examples and interactions
- \`/dashboard/charts\` - Chart components (coming soon)
- \`/dashboard/calendar\` - Calendar interface (coming soon)
- \`/dashboard/mail\` - Email interface (coming soon)
- \`/dashboard/users\` - User management (coming soon)

## Components Used

- Cards, Buttons, Badges, Avatars
- Progress bars, Switches, Sliders
- Forms: Input, Textarea, Select, Checkbox, Radio
- Navigation: Sidebar, Sheet (mobile)
- Alerts, Separators, Tabs
- Theme Provider for dark/light mode

## Getting Started

1. Start the development server: \`pnpm dev\`
2. Open [http://localhost:3000](http://localhost:3000)
3. Navigate to the dashboard: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
4. Explore different sections to see shadcn/ui components in action

## Customization

The dashboard is fully customizable:
- Modify components in \`components/ui/\`
- Update pages in \`app/dashboard/\`
- Adjust theme settings in \`components/theme-provider.tsx\`
- Change color schemes via Tailwind CSS variables in \`globals.css\`

This dashboard serves as both a testing ground and a reference implementation for shadcn/ui components.
`;

  const readmePath = path.join(projectPath, "DASHBOARD.md");
  await fs.writeFile(readmePath, readmeContent);
  console.error(`[DEBUG] Created: DASHBOARD.md`);
}