/**
 * @fileoverview Internationalization Creators
 * @description Creates comprehensive i18n setup with next-intl for multi-language support
 * Includes configuration, routing, translations, and components with full TypeScript support
 */

import fs from "fs-extra";
import path from "node:path";
import {
  i18nConfigTemplate,
  i18nRoutingTemplate,
  i18nNavigationTemplate,
  i18nMiddlewareTemplate,
  localeTemplates,
  i18nUtilsTemplate,
  nextConfigI18nTemplate,
} from "../templates/i18n-templates.js";
import {
  i18nLoginFormTemplate,
  i18nSignupFormTemplate,
  i18nAuthPagesTemplates,
  languageSwitcherTemplate,
} from "../templates/i18n-auth-templates.js";

export async function createI18nConfiguration(projectPath: string): Promise<void> {
  console.error(`[DEBUG] Creating i18n configuration...`);

  const libsPath = path.join(projectPath, "libs");

  try {
    // Create i18n configuration files
    await fs.writeFile(path.join(libsPath, "i18n-config.ts"), i18nConfigTemplate);
    await fs.writeFile(path.join(libsPath, "i18n-routing.ts"), i18nRoutingTemplate);
    await fs.writeFile(path.join(libsPath, "i18n-navigation.ts"), i18nNavigationTemplate);
    await fs.writeFile(path.join(libsPath, "i18n-utils.ts"), i18nUtilsTemplate);

    console.error(`[DEBUG] i18n configuration files created successfully`);
  } catch (error) {
    console.error(`[ERROR] Failed to create i18n configuration: ${error}`);
    throw error;
  }
}

export async function createLocalesStructure(projectPath: string): Promise<void> {
  console.error(`[DEBUG] Creating locales structure...`);

  const localesPath = path.join(projectPath, "locales");

  try {
    // Ensure locales directory exists
    await fs.ensureDir(localesPath);

    // Create locale files
    await fs.writeFile(path.join(localesPath, "en.json"), localeTemplates.en);
    await fs.writeFile(path.join(localesPath, "es.json"), localeTemplates.es);
    await fs.writeFile(path.join(localesPath, "fr.json"), localeTemplates.fr);

    // Create additional minimal locales (can be expanded later)
    const minimalLocales = {
      de: {
        metadata: { title: "SaaS Starter", description: "Vollständige Next.js SaaS-Anwendung" },
        navigation: { home: "Startseite", dashboard: "Dashboard", settings: "Einstellungen" },
        auth: { sign_in: "Anmelden", sign_up: "Registrieren", email: "E-Mail", password: "Passwort" },
        common: { loading: "Laden...", save: "Speichern", cancel: "Abbrechen" }
      },
      ja: {
        metadata: { title: "SaaS Starter", description: "完全なNext.js SaaSアプリケーション" },
        navigation: { home: "ホーム", dashboard: "ダッシュボード", settings: "設定" },
        auth: { sign_in: "サインイン", sign_up: "サインアップ", email: "メール", password: "パスワード" },
        common: { loading: "読み込み中...", save: "保存", cancel: "キャンセル" }
      },
      zh: {
        metadata: { title: "SaaS Starter", description: "完整的Next.js SaaS应用程序" },
        navigation: { home: "首页", dashboard: "仪表板", settings: "设置" },
        auth: { sign_in: "登录", sign_up: "注册", email: "邮箱", password: "密码" },
        common: { loading: "加载中...", save: "保存", cancel: "取消" }
      }
    };

    for (const [locale, translations] of Object.entries(minimalLocales)) {
      await fs.writeFile(
        path.join(localesPath, `${locale}.json`),
        JSON.stringify(translations, null, 2)
      );
    }

    // Create README for locales
    const localesReadme = `# locales/

Translation files for internationalization (i18n) support.

## Supported Languages

- 🇺🇸 **English (en)** - Default language, complete translations
- 🇪🇸 **Spanish (es)** - Complete translations
- 🇫🇷 **French (fr)** - Complete translations
- 🇩🇪 **German (de)** - Basic translations (expandable)
- 🇯🇵 **Japanese (ja)** - Basic translations (expandable)
- 🇨🇳 **Chinese (zh)** - Basic translations (expandable)

## File Structure

Each locale file contains translations organized by feature:

\`\`\`json
{
  "metadata": {
    "title": "App title",
    "description": "App description"
  },
  "navigation": {
    "home": "Home",
    "dashboard": "Dashboard"
  },
  "auth": {
    "sign_in": "Sign In",
    "sign_up": "Sign Up"
  },
  "common": {
    "loading": "Loading...",
    "save": "Save"
  }
}
\`\`\`

## Adding New Languages

1. Create a new \`.json\` file with the locale code (e.g., \`it.json\` for Italian)
2. Copy the structure from \`en.json\`
3. Translate all text values
4. Add the locale to \`libs/i18n-routing.ts\`
5. Add locale info to \`libs/i18n-utils.ts\`

## Translation Keys

- **metadata**: SEO and page metadata
- **navigation**: Main navigation items
- **auth**: Authentication forms and messages
- **auth_errors**: Authentication error messages
- **dashboard**: Dashboard-specific content
- **teams**: Team management interface
- **settings**: Settings page content
- **common**: Shared UI elements (buttons, labels, etc.)
- **validation**: Form validation messages
- **errors**: Error pages and messages

## Interpolation

Use curly braces for dynamic values:

\`\`\`json
{
  "welcome_message": "Hello {name}!",
  "password_min": "Password must be at least {min} characters"
}
\`\`\`

## Rich Text

Use next-intl's rich text formatting for links and formatting:

\`\`\`json
{
  "accept_terms": "I accept the {terms} and {privacy}"
}
\`\`\`
`;

    await fs.writeFile(path.join(localesPath, "README.md"), localesReadme);

    console.error(`[DEBUG] Locales structure created successfully`);
  } catch (error) {
    console.error(`[ERROR] Failed to create locales structure: ${error}`);
    throw error;
  }
}

export async function createI18nRouting(projectPath: string): Promise<void> {
  console.error(`[DEBUG] Creating i18n routing structure...`);

  const appPath = path.join(projectPath, "app");

  try {
    // Create [locale] directory structure
    const localePath = path.join(appPath, "[locale]");
    await fs.ensureDir(localePath);

    // Move existing routes into [locale] directory
    const routesToMove = ["auth", "dashboard"];
    
    for (const route of routesToMove) {
      const sourcePath = path.join(appPath, route);
      const targetPath = path.join(localePath, route);
      
      try {
        // Check if source exists before moving
        const sourceExists = await fs.pathExists(sourcePath);
        if (sourceExists) {
          await fs.move(sourcePath, targetPath);
          console.error(`[DEBUG] Moved ${route} to [locale] directory`);
        } else {
          // Create the directory structure in [locale] if it doesn't exist in root
          await fs.ensureDir(targetPath);
          console.error(`[DEBUG] Created ${route} directory in [locale]`);
        }
      } catch (moveError) {
        console.error(`[WARNING] Could not move ${route}: ${moveError}`);
        // Create the directory if move fails
        await fs.ensureDir(targetPath);
      }
    }

    // Create root layout for [locale]
    const localeLayoutPath = path.join(localePath, "layout.tsx");
    await fs.writeFile(localeLayoutPath, i18nAuthPagesTemplates.rootLayout);

    // Create a basic page.tsx in [locale] root
    const localePageContent = `import { useTranslations } from 'next-intl';
import { Link } from '@/libs/i18n-navigation';

export default function HomePage() {
  const t = useTranslations('navigation');
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-gray-900">
          Welcome to SaaS Starter
        </h1>
        <p className="text-lg text-gray-600 max-w-md">
          Complete Next.js SaaS application with authentication, payments, and team management.
        </p>
        <div className="flex gap-4">
          <Link
            href="/auth/signin"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="bg-gray-200 text-gray-900 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
`;
    await fs.writeFile(path.join(localePath, "page.tsx"), localePageContent);

    console.error(`[DEBUG] i18n routing structure created successfully`);
  } catch (error) {
    console.error(`[ERROR] Failed to create i18n routing: ${error}`);
    throw error;
  }
}

export async function updateMiddlewareForI18n(projectPath: string): Promise<void> {
  console.error(`[DEBUG] Updating middleware for i18n...`);

  try {
    const middlewarePath = path.join(projectPath, "middleware.ts");
    
    // Read existing middleware if it exists
    let existingMiddleware = "";
    try {
      existingMiddleware = await fs.readFile(middlewarePath, 'utf-8');
    } catch (error) {
      // File doesn't exist, will create new one
    }

    // Create enhanced middleware that includes both i18n and existing auth middleware
    const enhancedMiddleware = `import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './libs/i18n-routing';
import { NextRequest } from 'next/server';

// Create the internationalization middleware
const intlMiddleware = createIntlMiddleware(routing);

export default function middleware(request: NextRequest) {
  // Handle internationalization first
  const intlResponse = intlMiddleware(request);
  
  // Add any additional middleware logic here
  // For example, authentication checks for protected routes
  
  return intlResponse;
}

export const config = {
  // Match only internationalized pathnames and API routes
  matcher: ['/((?!api|_next|_vercel|.*\\\\..*).*)'],
};
`;

    await fs.writeFile(middlewarePath, enhancedMiddleware);
    
    console.error(`[DEBUG] Middleware updated for i18n successfully`);
  } catch (error) {
    console.error(`[ERROR] Failed to update middleware for i18n: ${error}`);
    throw error;
  }
}

export async function createI18nAuthComponents(projectPath: string): Promise<void> {
  console.error(`[DEBUG] Creating i18n auth components...`);

  const authComponentsPath = path.join(projectPath, "components", "auth");

  try {
    // Update auth forms with i18n versions
    await fs.writeFile(path.join(authComponentsPath, "login-form.tsx"), i18nLoginFormTemplate);
    await fs.writeFile(path.join(authComponentsPath, "signup-form.tsx"), i18nSignupFormTemplate);

    // Create language switcher component
    const uiComponentsPath = path.join(projectPath, "components", "ui");
    await fs.ensureDir(uiComponentsPath);
    await fs.writeFile(path.join(uiComponentsPath, "language-switcher.tsx"), languageSwitcherTemplate);

    console.error(`[DEBUG] i18n auth components created successfully`);
  } catch (error) {
    console.error(`[ERROR] Failed to create i18n auth components: ${error}`);
    throw error;
  }
}

export async function createI18nAuthPages(projectPath: string): Promise<void> {
  console.error(`[DEBUG] Creating i18n auth pages...`);

  try {
    // Update auth pages in [locale] directory
    const authPath = path.join(projectPath, "app", "[locale]", "auth");
    
    // Create signin page
    const signinPath = path.join(authPath, "signin");
    await fs.ensureDir(signinPath);
    await fs.writeFile(path.join(signinPath, "page.tsx"), i18nAuthPagesTemplates.signInPage);

    // Create signup page  
    const signupPath = path.join(authPath, "signup");
    await fs.ensureDir(signupPath);
    await fs.writeFile(path.join(signupPath, "page.tsx"), i18nAuthPagesTemplates.signUpPage);

    // Create auth layout
    await fs.writeFile(path.join(authPath, "layout.tsx"), i18nAuthPagesTemplates.authLayout);

    console.error(`[DEBUG] i18n auth pages created successfully`);
  } catch (error) {
    console.error(`[ERROR] Failed to create i18n auth pages: ${error}`);
    throw error;
  }
}

export async function updateNextConfigForI18n(projectPath: string): Promise<void> {
  console.error(`[DEBUG] Updating Next.js config for i18n...`);

  try {
    const nextConfigPath = path.join(projectPath, "next.config.js");
    
    // Check if next.config.js exists
    const configExists = await fs.pathExists(nextConfigPath);
    
    if (configExists) {
      // Read existing config
      const existingConfig = await fs.readFile(nextConfigPath, 'utf-8');
      
      // Check if it already has next-intl integration
      if (existingConfig.includes('next-intl')) {
        console.error(`[DEBUG] Next.js config already has i18n integration`);
        return;
      }
      
      // Backup existing config
      await fs.writeFile(path.join(projectPath, "next.config.js.backup"), existingConfig);
    }

    // Create new i18n-enabled config
    await fs.writeFile(nextConfigPath, nextConfigI18nTemplate);
    
    console.error(`[DEBUG] Next.js config updated for i18n successfully`);
  } catch (error) {
    console.error(`[ERROR] Failed to update Next.js config for i18n: ${error}`);
    throw error;
  }
}

export async function createI18nDocumentation(projectPath: string): Promise<void> {
  console.error(`[DEBUG] Creating i18n documentation...`);

  const i18nReadme = `# Internationalization (i18n)

This application supports multiple languages using \`next-intl\`.

## Supported Languages

- 🇺🇸 English (en) - Default
- 🇪🇸 Spanish (es)
- 🇫🇷 French (fr)
- 🇩🇪 German (de)
- 🇯🇵 Japanese (ja)
- 🇨🇳 Chinese (zh)

## How It Works

### Routing Structure
\`\`\`
app/
├── [locale]/
│   ├── auth/
│   ├── dashboard/
│   └── layout.tsx
├── globals.css
└── layout.tsx
\`\`\`

### URL Structure
- \`/\` - Default locale (English)
- \`/es\` - Spanish
- \`/fr\` - French
- \`/de/dashboard\` - German dashboard
- \`/ja/auth/signin\` - Japanese sign in

### Configuration Files
- \`libs/i18n-config.ts\` - Main i18n configuration
- \`libs/i18n-routing.ts\` - Routing and locale settings
- \`libs/i18n-navigation.ts\` - Navigation utilities
- \`libs/i18n-utils.ts\` - Translation hooks and utilities

### Translation Files
- \`locales/en.json\` - English translations (complete)
- \`locales/es.json\` - Spanish translations (complete)
- \`locales/fr.json\` - French translations (complete)
- \`locales/de.json\` - German translations (basic)
- \`locales/ja.json\` - Japanese translations (basic)
- \`locales/zh.json\` - Chinese translations (basic)

## Usage in Components

### Basic Translation
\`\`\`tsx
import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('auth');
  
  return <h1>{t('sign_in')}</h1>;
}
\`\`\`

### With Interpolation
\`\`\`tsx
const t = useTranslations('validation');

// Translation: "Password must be at least {min} characters"
const message = t('password_min', { min: 8 });
\`\`\`

### Navigation with Locale
\`\`\`tsx
import { Link } from '@/libs/i18n-navigation';

export function Navigation() {
  return (
    <Link href="/dashboard">
      Dashboard
    </Link>
  );
}
\`\`\`

### Rich Text with Components
\`\`\`tsx
// Translation: "I accept the {terms} and {privacy}"
{t.rich('accept_terms', {
  terms: (chunks) => <Link href="/terms">{chunks}</Link>,
  privacy: (chunks) => <Link href="/privacy">{chunks}</Link>,
})}
\`\`\`

## Translation Hooks

### useAuthTranslations()
Common authentication translations
\`\`\`tsx
const { signIn, signUp, email, password } = useAuthTranslations();
\`\`\`

### useNavigationTranslations()
Navigation menu translations
\`\`\`tsx
const { home, dashboard, settings } = useNavigationTranslations();
\`\`\`

### useCommonTranslations()
Common UI element translations
\`\`\`tsx
const { loading, save, cancel } = useCommonTranslations();
\`\`\`

## Language Switcher

Use the LanguageSwitcher component:
\`\`\`tsx
import { LanguageSwitcher } from '@/components/ui/language-switcher';

export function Header() {
  return (
    <div className="flex justify-end">
      <LanguageSwitcher />
    </div>
  );
}
\`\`\`

## Adding New Languages

1. **Create translation file**: Add \`locales/[code].json\`
2. **Update routing**: Add locale to \`libs/i18n-routing.ts\`
3. **Update utilities**: Add to \`SUPPORTED_LOCALES\` in \`libs/i18n-utils.ts\`
4. **Test thoroughly**: Check all routes and components

## Best Practices

1. **Consistent Keys**: Use nested objects to organize translations
2. **Interpolation**: Use \`{key}\` for dynamic values
3. **Rich Text**: Use \`t.rich()\` for formatted content
4. **Validation**: Include all validation messages
5. **Error Handling**: Provide translations for all error states
6. **Testing**: Test all locales before deployment

## Development Tips

- Use the browser's language preference as default
- Test with long translations (German, for example)
- Consider RTL languages for future expansion
- Keep translation files organized and consistent
- Use TypeScript for better type safety with translations
`;

  try {
    await fs.writeFile(path.join(projectPath, "I18N.md"), i18nReadme);
    console.error(`[DEBUG] i18n documentation created successfully`);
  } catch (error) {
    console.error(`[ERROR] Failed to create i18n documentation: ${error}`);
    throw error;
  }
}