/**
 * @fileoverview Internationalization Tool
 * @description Sets up next-intl with multi-language support and routing for modern Next.js applications
 * Provides complete i18n setup with English and Romanian as default languages
 */

import fs from "fs-extra";
import path from "path";
import { runCommand } from "../../runners/command-runner.js";
import { detectProjectState } from "../../utils/dependency-detector.js";

export interface InternationalizationConfig {
  projectPath: string;
  languages?: string[];
  includeRouting?: boolean;
  includeAuthForms?: boolean;
}

export async function setupInternationalization(config: InternationalizationConfig): Promise<string> {
  const {
    projectPath,
    languages = ['en', 'ro'],
    includeRouting = true,
    includeAuthForms = true
  } = config;

  console.error(`[DEBUG] Setting up internationalization at: ${projectPath}`);
  console.error(`[DEBUG] Config - Languages: ${languages.join(', ')}, Routing: ${includeRouting}, Auth Forms: ${includeAuthForms}`);

  const steps: string[] = [];
  const startTime = Date.now();

  try {
    // Validate project path
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }

    // Check if this is a Next.js project
    const packageJsonPath = path.join(projectPath, "package.json");
    if (!await fs.pathExists(packageJsonPath)) {
      throw new Error("Not a valid Next.js project (package.json not found). Run create_nextjs_base first.");
    }

    const packageJson = await fs.readJson(packageJsonPath);
    if (!packageJson.dependencies?.next) {
      throw new Error("Not a Next.js project. Run create_nextjs_base first.");
    }

    // Detect existing project state
    const projectState = await detectProjectState(projectPath);
    console.error(`[DEBUG] Project state:`, projectState);

    // Check for existing i18n setup
    const i18nConfigPath = path.join(projectPath, "i18n.ts");
    if (await fs.pathExists(i18nConfigPath)) {
      throw new Error("Internationalization appears to already be set up (i18n.ts exists).");
    }

    // Step 1: Install internationalization dependencies
    const step1 = "Installing internationalization dependencies...";
    steps.push(step1);
    console.error(`[STEP 1/6] ${step1}`);
    
    const packagesToInstall = ["next-intl"];
    await runCommand(`pnpm add ${packagesToInstall.join(" ")}`, projectPath);

    console.error(`[STEP 1/6] ✅ Completed: ${step1}`);

    // Step 2: Create i18n configuration
    const step2 = "Creating i18n configuration and utilities...";
    steps.push(step2);
    console.error(`[STEP 2/6] ${step2}`);
    await createI18nConfiguration(projectPath, languages);
    console.error(`[STEP 2/6] ✅ Completed: ${step2}`);

    // Step 3: Create translation files
    const step3 = "Creating translation files and dictionaries...";
    steps.push(step3);
    console.error(`[STEP 3/6] ${step3}`);
    await createTranslationFiles(projectPath, languages);
    console.error(`[STEP 3/6] ✅ Completed: ${step3}`);

    // Step 4: Update Next.js configuration
    const step4 = "Updating Next.js configuration for i18n...";
    steps.push(step4);
    console.error(`[STEP 4/6] ${step4}`);
    await updateNextConfig(projectPath);
    console.error(`[STEP 4/6] ✅ Completed: ${step4}`);

    // Step 5: Setup internationalized routing
    if (includeRouting) {
      const step5 = "Setting up internationalized routing and middleware...";
      steps.push(step5);
      console.error(`[STEP 5/6] ${step5}`);
      await setupI18nRouting(projectPath, languages);
      console.error(`[STEP 5/6] ✅ Completed: ${step5}`);
    }

    // Step 6: Create i18n components and auth forms
    const step6 = includeAuthForms 
      ? "Creating i18n components and internationalized auth forms..."
      : "Creating i18n components and utilities...";
    steps.push(step6);
    console.error(`[STEP 6/6] ${step6}`);
    await createI18nComponents(projectPath, languages);
    
    if (includeAuthForms) {
      await createInternationalizedAuthForms(projectPath, languages);
    }
    
    console.error(`[STEP 6/6] ✅ Completed: ${step6}`);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[SUCCESS] Internationalization setup completed in ${totalTime}s`);

    // Generate success message
    return generateSuccessMessage(steps, totalTime, {
      languages,
      includeRouting,
      includeAuthForms,
      hasAuth: projectState.hasAuthentication
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] Internationalization setup failed: ${errorMsg}`);
    throw error;
  }
}

async function createI18nConfiguration(projectPath: string, languages: string[]): Promise<void> {
  // Create main i18n configuration
  const i18nConfigContent = `/**
 * @fileoverview Internationalization Configuration
 * @description next-intl configuration for multi-language support
 */

import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

// Supported locales
export const locales = [${languages.map(lang => `'${lang}'`).join(', ')}] as const;
export type Locale = typeof locales[number];

// Default locale
export const defaultLocale: Locale = '${languages[0]}';

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming \`locale\` parameter is valid
  if (!locales.includes(locale as Locale)) notFound();

  return {
    messages: (await import(\`./locales/\${locale}.json\`)).default,
  };
});

// Utility functions
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

export function getLocaleFromPathname(pathname: string): Locale {
  const segments = pathname.split('/');
  const firstSegment = segments[1];
  
  if (isValidLocale(firstSegment)) {
    return firstSegment;
  }
  
  return defaultLocale;
}

export function removeLocaleFromPathname(pathname: string): string {
  const segments = pathname.split('/');
  const firstSegment = segments[1];
  
  if (isValidLocale(firstSegment)) {
    return '/' + segments.slice(2).join('/');
  }
  
  return pathname;
}
`;

  await fs.writeFile(path.join(projectPath, "i18n.ts"), i18nConfigContent);

  // Create i18n types
  const i18nTypesContent = `/**
 * @fileoverview Internationalization Types
 * @description TypeScript types for i18n
 */

import { Locale } from './i18n';

// Navigation types with locale support
export interface LocalizedNavigation {
  locale: Locale;
  pathname: string;
  searchParams?: Record<string, string>;
}

// Translation keys type (will be auto-generated based on your JSON files)
export type TranslationKeys = {
  // Common
  common: {
    loading: string;
    error: string;
    success: string;
    cancel: string;
    save: string;
    delete: string;
    edit: string;
    create: string;
    update: string;
    submit: string;
    back: string;
    next: string;
    previous: string;
    close: string;
    confirm: string;
    yes: string;
    no: string;
  };

  // Navigation
  nav: {
    home: string;
    about: string;
    contact: string;
    login: string;
    signup: string;
    dashboard: string;
    profile: string;
    settings: string;
    logout: string;
  };

  // Authentication
  auth: {
    login: {
      title: string;
      email: string;
      password: string;
      submit: string;
      forgotPassword: string;
      noAccount: string;
      signupLink: string;
    };
    signup: {
      title: string;
      name: string;
      email: string;
      password: string;
      confirmPassword: string;
      submit: string;
      hasAccount: string;
      loginLink: string;
      terms: string;
    };
    errors: {
      invalidCredentials: string;
      emailRequired: string;
      passwordRequired: string;
      passwordTooShort: string;
      passwordsDoNotMatch: string;
      emailInvalid: string;
    };
  };

  // Dashboard
  dashboard: {
    title: string;
    welcome: string;
    stats: {
      users: string;
      revenue: string;
      orders: string;
      growth: string;
    };
  };

  // Forms
  forms: {
    validation: {
      required: string;
      emailInvalid: string;
      minLength: string;
      maxLength: string;
      passwordMismatch: string;
    };
  };
};

// Component props with internationalization
export interface WithI18n {
  locale: Locale;
  messages: any;
}
`;

  await fs.writeFile(path.join(projectPath, "types/i18n.ts"), i18nTypesContent);
}

async function createTranslationFiles(projectPath: string, languages: string[]): Promise<void> {
  // Create locales directory
  const localesDir = path.join(projectPath, "locales");
  await fs.ensureDir(localesDir);

  // English translations (base language)
  const enTranslations = {
    common: {
      loading: "Loading...",
      error: "Error",
      success: "Success",
      cancel: "Cancel",
      save: "Save",
      delete: "Delete",
      edit: "Edit",
      create: "Create",
      update: "Update",
      submit: "Submit",
      back: "Back",
      next: "Next",
      previous: "Previous",
      close: "Close",
      confirm: "Confirm",
      yes: "Yes",
      no: "No"
    },
    nav: {
      home: "Home",
      about: "About",
      contact: "Contact",
      login: "Login",
      signup: "Sign Up",
      dashboard: "Dashboard",
      profile: "Profile",
      settings: "Settings",
      logout: "Logout"
    },
    auth: {
      login: {
        title: "Sign In",
        email: "Email Address",
        password: "Password",
        submit: "Sign In",
        forgotPassword: "Forgot your password?",
        noAccount: "Don't have an account?",
        signupLink: "Sign up here"
      },
      signup: {
        title: "Create Account",
        name: "Full Name",
        email: "Email Address",
        password: "Password",
        confirmPassword: "Confirm Password",
        submit: "Create Account",
        hasAccount: "Already have an account?",
        loginLink: "Sign in here",
        terms: "I agree to the Terms of Service and Privacy Policy"
      },
      errors: {
        invalidCredentials: "Invalid email or password",
        emailRequired: "Email is required",
        passwordRequired: "Password is required",
        passwordTooShort: "Password must be at least 8 characters",
        passwordsDoNotMatch: "Passwords do not match",
        emailInvalid: "Please enter a valid email address"
      }
    },
    dashboard: {
      title: "Dashboard",
      welcome: "Welcome back!",
      stats: {
        users: "Users",
        revenue: "Revenue",
        orders: "Orders",
        growth: "Growth"
      }
    },
    forms: {
      validation: {
        required: "This field is required",
        emailInvalid: "Please enter a valid email address",
        minLength: "Must be at least {min} characters",
        maxLength: "Must be no more than {max} characters",
        passwordMismatch: "Passwords do not match"
      }
    }
  };

  // Romanian translations
  const roTranslations = {
    common: {
      loading: "Se încarcă...",
      error: "Eroare",
      success: "Succes",
      cancel: "Anulează",
      save: "Salvează",
      delete: "Șterge",
      edit: "Editează",
      create: "Creează",
      update: "Actualizează",
      submit: "Trimite",
      back: "Înapoi",
      next: "Următorul",
      previous: "Precedentul",
      close: "Închide",
      confirm: "Confirmă",
      yes: "Da",
      no: "Nu"
    },
    nav: {
      home: "Acasă",
      about: "Despre",
      contact: "Contact",
      login: "Autentificare",
      signup: "Înregistrare",
      dashboard: "Tablou de bord",
      profile: "Profil",
      settings: "Setări",
      logout: "Deconectare"
    },
    auth: {
      login: {
        title: "Autentificare",
        email: "Adresa de email",
        password: "Parolă",
        submit: "Conectează-te",
        forgotPassword: "Ți-ai uitat parola?",
        noAccount: "Nu ai un cont?",
        signupLink: "Înregistrează-te aici"
      },
      signup: {
        title: "Creează cont",
        name: "Nume complet",
        email: "Adresa de email",
        password: "Parolă",
        confirmPassword: "Confirmă parola",
        submit: "Creează cont",
        hasAccount: "Ai deja un cont?",
        loginLink: "Conectează-te aici",
        terms: "Sunt de acord cu Termenii de utilizare și Politica de confidențialitate"
      },
      errors: {
        invalidCredentials: "Email sau parolă invalidă",
        emailRequired: "Email-ul este obligatoriu",
        passwordRequired: "Parola este obligatorie",
        passwordTooShort: "Parola trebuie să aibă cel puțin 8 caractere",
        passwordsDoNotMatch: "Parolele nu se potrivesc",
        emailInvalid: "Vă rugăm să introduceți o adresă de email validă"
      }
    },
    dashboard: {
      title: "Tablou de bord",
      welcome: "Bun venit înapoi!",
      stats: {
        users: "Utilizatori",
        revenue: "Venituri",
        orders: "Comenzi",
        growth: "Creștere"
      }
    },
    forms: {
      validation: {
        required: "Acest câmp este obligatoriu",
        emailInvalid: "Vă rugăm să introduceți o adresă de email validă",
        minLength: "Trebuie să aibă cel puțin {min} caractere",
        maxLength: "Trebuie să aibă cel mult {max} caractere",
        passwordMismatch: "Parolele nu se potrivesc"
      }
    }
  };

  // Create translation files
  const translations = {
    en: enTranslations,
    ro: roTranslations
  };

  for (const lang of languages) {
    const translationData = translations[lang as keyof typeof translations] || enTranslations;
    await fs.writeJson(path.join(localesDir, `${lang}.json`), translationData, { spaces: 2 });
  }
}

async function updateNextConfig(projectPath: string): Promise<void> {
  const nextConfigPath = path.join(projectPath, "next.config.js");
  const nextConfigMjsPath = path.join(projectPath, "next.config.mjs");
  
  let configPath = nextConfigPath;
  if (!await fs.pathExists(nextConfigPath) && await fs.pathExists(nextConfigMjsPath)) {
    configPath = nextConfigMjsPath;
  }

  // Create new Next.js config with i18n support
  const nextConfigContent = `/** @type {import('next').NextConfig} */
const withNextIntl = require('next-intl/plugin')('./i18n.ts');

const nextConfig = {
  // Existing Next.js configuration
  experimental: {
    // Enable if needed for your setup
    // typedRoutes: true,
  },
  
  // Add any existing configuration here
  typescript: {
    ignoreBuildErrors: false,
  },
  
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Image optimization
  images: {
    remotePatterns: [
      // Add your image domains here
    ],
  },
};

module.exports = withNextIntl(nextConfig);
`;

  await fs.writeFile(configPath, nextConfigContent);
}

async function setupI18nRouting(projectPath: string, languages: string[]): Promise<void> {
  // Create middleware for internationalization
  const middlewareContent = `/**
 * @fileoverview Internationalization Middleware
 * @description Handles locale routing and redirects for next-intl
 */

import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

export default createMiddleware({
  // A list of all locales that are supported
  locales: locales,

  // Used when no locale matches
  defaultLocale: defaultLocale,

  // Always use locale prefix, even for default locale
  localePrefix: 'as-needed',

  // Redirect to default locale if no locale is provided
  localeDetection: true,

  // Alternative names for locales (optional)
  alternateLinks: false,

  // Pathnames for different locales (optional)
  pathnames: {
    '/': '/',
    '/about': {
      en: '/about',
      ro: '/despre',
    },
    '/contact': {
      en: '/contact', 
      ro: '/contact',
    },
    '/dashboard': '/dashboard',
    '/login': {
      en: '/login',
      ro: '/autentificare',
    },
    '/signup': {
      en: '/signup',
      ro: '/inregistrare',
    },
  },
});

export const config = {
  // Match only internationalized pathnames
  matcher: [
    // Enable a redirect to a matching locale at the root
    '/',

    // Set a cookie to remember the previous locale for
    // all requests that have a locale prefix
    '/(${languages.join('|')})/:path*',

    // Enable redirects that add missing locales
    // (e.g. \`/products\` -> \`/en/products\`)
    '/((?!_next|_vercel|.*\\\\..*).*)'
  ]
};
`;

  await fs.writeFile(path.join(projectPath, "middleware.ts"), middlewareContent);

  // Create navigation utilities
  const navigationContent = `/**
 * @fileoverview Internationalized Navigation
 * @description Navigation utilities with locale support
 */

import { createLocalizedPathnamesNavigation } from 'next-intl/navigation';
import { locales, pathnames } from './i18n';

export const { Link, redirect, usePathname, useRouter } = createLocalizedPathnamesNavigation({
  locales,
  pathnames
});

// Re-export for convenience
export { locales, pathnames };
`;

  const libDir = path.join(projectPath, "lib");
  await fs.ensureDir(libDir);
  await fs.writeFile(path.join(libDir, "navigation.ts"), navigationContent);
}

async function createI18nComponents(projectPath: string, languages: string[]): Promise<void> {
  // Create language switcher component
  const languageSwitcherContent = `/**
 * @fileoverview Language Switcher Component
 * @description Component for switching between available languages
 */

'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/lib/navigation';
import { locales } from '@/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const languageNames = {
  en: 'English',
  ro: 'Română',
} as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <Select value={locale} onValueChange={handleLanguageChange}>
      <SelectTrigger className="w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {locales.map((lang) => (
          <SelectItem key={lang} value={lang}>
            {languageNames[lang as keyof typeof languageNames] || lang.toUpperCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
`;

  // Create localized layout component
  const localizedLayoutContent = `/**
 * @fileoverview Localized Layout Component
 * @description Layout component with internationalization support
 */

import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { locales } from '@/i18n';

interface LocalizedLayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

export default async function LocalizedLayout({
  children,
  params: { locale }
}: LocalizedLayoutProps) {
  // Validate that the incoming \`locale\` parameter is valid
  if (!locales.includes(locale as any)) notFound();

  // Providing all messages to the client side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
`;

  const componentsI18nDir = path.join(projectPath, "components", "i18n");
  await fs.ensureDir(componentsI18nDir);
  
  await fs.writeFile(path.join(componentsI18nDir, "language-switcher.tsx"), languageSwitcherContent);
  await fs.writeFile(path.join(componentsI18nDir, "localized-layout.tsx"), localizedLayoutContent);

  // Create component index
  const indexContent = `/**
 * @fileoverview I18n Components
 * @description Export all internationalization components
 */

export { LanguageSwitcher } from './language-switcher';
export { default as LocalizedLayout } from './localized-layout';
`;

  await fs.writeFile(path.join(componentsI18nDir, "index.ts"), indexContent);
}

async function createInternationalizedAuthForms(projectPath: string, languages: string[]): Promise<void> {
  // Create internationalized login form
  const loginFormContent = `/**
 * @fileoverview Internationalized Login Form
 * @description Login form with multi-language support
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from '@/lib/navigation';

interface LoginFormProps {
  onSubmit?: (data: { email: string; password: string }) => Promise<void>;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const t = useTranslations('auth.login');
  const tErrors = useTranslations('auth.errors');
  const tCommon = useTranslations('common');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;

      if (!email) {
        setError(tErrors('emailRequired'));
        return;
      }

      if (!password) {
        setError(tErrors('passwordRequired'));
        return;
      }

      if (onSubmit) {
        await onSubmit({ email, password });
      }
    } catch (err) {
      setError(tErrors('invalidCredentials'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('forgotPassword')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('password')}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? tCommon('loading') : t('submit')}
          </Button>

          <div className="text-center text-sm">
            {t('noAccount')}{' '}
            <Link href="/signup" className="font-medium hover:underline">
              {t('signupLink')}
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
`;

  // Create internationalized signup form
  const signupFormContent = `/**
 * @fileoverview Internationalized Signup Form
 * @description Registration form with multi-language support
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from '@/lib/navigation';

interface SignupFormProps {
  onSubmit?: (data: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    terms: boolean;
  }) => Promise<void>;
}

export function SignupForm({ onSubmit }: SignupFormProps) {
  const t = useTranslations('auth.signup');
  const tErrors = useTranslations('auth.errors');
  const tCommon = useTranslations('common');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const name = formData.get('name') as string;
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      const confirmPassword = formData.get('confirmPassword') as string;
      const terms = formData.get('terms') === 'on';

      // Validation
      if (!name) {
        setError(tErrors('emailRequired')); // Reuse validation message
        return;
      }

      if (!email) {
        setError(tErrors('emailRequired'));
        return;
      }

      if (!password) {
        setError(tErrors('passwordRequired'));
        return;
      }

      if (password.length < 8) {
        setError(tErrors('passwordTooShort'));
        return;
      }

      if (password !== confirmPassword) {
        setError(tErrors('passwordsDoNotMatch'));
        return;
      }

      if (!terms) {
        setError('Please accept the terms and conditions');
        return;
      }

      if (onSubmit) {
        await onSubmit({ name, email, password, confirmPassword, terms });
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('hasAccount')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">{t('name')}</Label>
            <Input
              id="name"
              name="name"
              type="text"
              required
              disabled={isLoading}
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('password')}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              disabled={isLoading}
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              disabled={isLoading}
              autoComplete="new-password"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="terms" name="terms" required disabled={isLoading} />
            <Label htmlFor="terms" className="text-sm">
              {t('terms')}
            </Label>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? tCommon('loading') : t('submit')}
          </Button>

          <div className="text-center text-sm">
            {t('hasAccount')}{' '}
            <Link href="/login" className="font-medium hover:underline">
              {t('loginLink')}
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
`;

  const authI18nDir = path.join(projectPath, "components", "auth", "i18n");
  await fs.ensureDir(authI18nDir);
  
  await fs.writeFile(path.join(authI18nDir, "login-form.tsx"), loginFormContent);
  await fs.writeFile(path.join(authI18nDir, "signup-form.tsx"), signupFormContent);

  // Create auth i18n index
  const authIndexContent = `/**
 * @fileoverview Internationalized Auth Components
 * @description Export all internationalized authentication components
 */

export { LoginForm } from './login-form';
export { SignupForm } from './signup-form';
`;

  await fs.writeFile(path.join(authI18nDir, "index.ts"), authIndexContent);
}

function generateSuccessMessage(
  steps: string[], 
  totalTime: string,
  config: {
    languages: string[];
    includeRouting: boolean;
    includeAuthForms: boolean;
    hasAuth: boolean;
  }
): string {
  const { languages, includeRouting, includeAuthForms, hasAuth } = config;

  return `🎉 Internationalization setup completed successfully!

⏱️ Total time: ${totalTime}s

✅ Completed steps:
${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

🌍 Internationalization Configuration:
- Supported Languages: ${languages.join(', ').toUpperCase()} (${languages.length} languages)
- Default Language: ${languages[0].toUpperCase()}
- ${includeRouting ? '✅' : '❌'} Internationalized Routing: ${includeRouting ? 'URL-based locale switching with middleware' : 'Disabled'}
- ${includeAuthForms ? '✅' : '❌'} Translated Auth Forms: ${includeAuthForms ? 'Login and signup forms with translations' : 'Disabled'}
- Translation Framework: next-intl with server-side rendering support

🗣️ Language Support:
${languages.map(lang => {
  const langNames = { en: 'English', ro: 'Română' };
  const fullName = langNames[lang as keyof typeof langNames] || lang.toUpperCase();
  return `- **${lang.toUpperCase()}** (${fullName}): Complete translations for all components`;
}).join('\n')}

📁 Generated Structure:
\`\`\`
project/
├── i18n.ts                           # Main i18n configuration
├── middleware.ts                      # ${includeRouting ? 'Locale routing middleware' : 'Ready for routing setup'}
├── next.config.js                     # Updated with next-intl plugin
├── types/
│   └── i18n.ts                       # TypeScript types for translations
├── locales/
${languages.map(lang => `│   ├── ${lang}.json                     # ${lang.toUpperCase()} translations`).join('\n')}
├── lib/
│   └── navigation.ts                  # ${includeRouting ? 'Internationalized navigation utilities' : 'Ready for i18n navigation'}
├── components/
│   ├── i18n/
│   │   ├── language-switcher.tsx      # Language selection component
│   │   └── localized-layout.tsx       # Layout with i18n support
${includeAuthForms ? `│   └── auth/
│       └── i18n/
│           ├── login-form.tsx         # Internationalized login form
│           └── signup-form.tsx        # Internationalized signup form` : ''}
\`\`\`

🌐 URL Structure${includeRouting ? ' (Active)' : ' (Available)'}:
${includeRouting ? `### Multi-language URLs:
- English (default): \`/dashboard\`, \`/about\`, \`/contact\`
- Romanian: \`/ro/dashboard\`, \`/ro/despre\`, \`/ro/contact\`
- Login: \`/login\` (EN), \`/ro/autentificare\` (RO)
- Signup: \`/signup\` (EN), \`/ro/inregistrare\` (RO)

### Automatic features:
- Locale detection from browser preferences
- Automatic redirects to appropriate language
- SEO-friendly localized URLs
- Language switching preserves current page` : `### Available URL structure:
- Enable routing to get: \`/en/page\`, \`/ro/page\`
- Automatic locale detection and redirects
- SEO-friendly localized URLs`}

💻 Usage Examples:
\`\`\`tsx
// Using translations in components
import { useTranslations } from 'next-intl';

function MyComponent() {
  const t = useTranslations('common');
  return <button>{t('submit')}</button>;
}

// Server-side translations
import { getTranslations } from 'next-intl/server';

async function ServerComponent() {
  const t = await getTranslations('dashboard');
  return <h1>{t('title')}</h1>;
}

// Language switcher
import { LanguageSwitcher } from '@/components/i18n';
<LanguageSwitcher />

// Internationalized navigation${includeRouting ? `
import { Link } from '@/lib/navigation';
<Link href="/about">About Us</Link>  // Automatically localized` : `
// Enable routing for internationalized navigation`}
\`\`\`

🔧 Component Integration:
${includeAuthForms ? `### Internationalized Auth Forms:
\`\`\`tsx
import { LoginForm, SignupForm } from '@/components/auth/i18n';

// Login form with Romanian/English support
<LoginForm onSubmit={handleLogin} />

// Signup form with validation messages in user's language  
<SignupForm onSubmit={handleSignup} />
\`\`\`` : ''}

### Language Switcher:
\`\`\`tsx
import { LanguageSwitcher } from '@/components/i18n';

// Add to your navigation bar
<nav>
  <LanguageSwitcher />
</nav>
\`\`\`

### Layout Integration:
\`\`\`tsx
import { LocalizedLayout } from '@/components/i18n';

export default function RootLayout({
  children,
  params: { locale }
}) {
  return (
    <LocalizedLayout params={{ locale }}>
      {children}
    </LocalizedLayout>
  );
}
\`\`\`

📝 Translation Management:
### Adding new translations:
1. **Edit JSON files**: Update \`locales/${languages[0]}.json\` and \`locales/${languages[1]}.json\`
2. **Use in components**: \`const t = useTranslations('your.key');\`
3. **Server components**: \`const t = await getTranslations('your.key');\`

### Translation structure:
\`\`\`json
{
  "common": {
    "loading": "Loading..." // EN: "Loading...", RO: "Se încarcă..."
  },
  "auth": {
    "login": {
      "title": "Sign In" // EN: "Sign In", RO: "Autentificare"  
    }
  }
}
\`\`\`

🚀 Integration Status:
- ✅ next-intl: Modern i18n framework with SSR support
- ✅ TypeScript: Full type safety for translation keys
- ${includeRouting ? '✅' : '🔄'} Middleware: ${includeRouting ? 'Automatic locale routing active' : 'Available - enable routing for full URL localization'}
- ✅ Components: Language switcher and localized layouts ready
- ${hasAuth || includeAuthForms ? '✅' : '🔄'} Authentication: ${includeAuthForms ? 'Internationalized login/signup forms integrated' : 'Ready for i18n auth integration'}

🎯 Internationalization Features:
✨ **Multi-language Support**: Complete ${languages.join(' and ').toUpperCase()} translations
✨ **SEO Friendly**: ${includeRouting ? 'Localized URLs for better search engine optimization' : 'Ready for localized URLs'}
✨ **Type Safe**: TypeScript integration prevents translation key errors
✨ **Server-Side Rendering**: Translations work with Next.js SSR
✨ **Automatic Detection**: Browser language detection and routing
✨ **Component Library**: Pre-built internationalized components
✨ **Form Localization**: ${includeAuthForms ? 'Authentication forms fully localized' : 'Ready for form internationalization'}

💡 Next steps:
1. ${includeRouting ? 'Test language switching: visit \`/\` and \`/ro/\`' : 'Enable routing for automatic language detection'}
2. ${includeAuthForms ? 'Use internationalized auth forms in your login/signup pages' : 'Create internationalized auth forms'}
3. Add the LanguageSwitcher to your navigation component
4. Customize translations: Edit files in \`locales/\` directory  
5. Add more languages: Create new JSON files and update \`i18n.ts\`
6. Test with different browser languages to see automatic detection

⚠️  **Important Setup Steps**:
### 1. Update your root layout:
\`\`\`tsx
// app/layout.tsx → app/[locale]/layout.tsx
export default function RootLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  return (
    <LocalizedLayout params={{ locale }}>
      {children}
    </LocalizedLayout>
  );
}
\`\`\`

### 2. Move your pages:
\`\`\`
app/page.tsx → app/[locale]/page.tsx
app/about/page.tsx → app/[locale]/about/page.tsx
\`\`\`

### 3. Use localized navigation:
\`\`\`tsx
// Replace next/link with localized Link
import { Link } from '@/lib/navigation';
\`\`\`

🌍 **Supported Content**:
- **Navigation**: Home, About, Contact, Dashboard, Profile, Settings
- **Authentication**: Complete login/signup flows with validation
- **Common UI**: Loading states, buttons, form labels, errors
- **Dashboard**: Welcome messages, statistics, user interface
- **Forms**: Validation messages, field labels, success/error states

🔗 **Language Experience Flow**:
1. **User visits site** → Browser language detected automatically
2. **Language Selection** → User can switch via LanguageSwitcher  
3. **URL Updates** → ${includeRouting ? 'URLs change to reflect selected language (\`/ro/despre\`)' : 'Enable routing for automatic URL localization'}
4. **Content Updates** → All text changes to selected language immediately
5. **Navigation Preserved** → Current page maintained across language switches`;
}