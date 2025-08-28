/**
 * @fileoverview Internationalized Auth Form Templates
 * @description Auth forms with complete i18n support using next-intl
 * Replaces the previous auth forms with fully internationalized versions
 */

export const i18nLoginFormTemplate = `"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signInSchema, type SignInInput } from "@/validations/auth";
import { signIn } from "@/actions/auth";
import { Link } from "@/libs/i18n-navigation";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Translations
  const t = useTranslations('auth');
  const tErrors = useTranslations('auth_errors');
  const tCommon = useTranslations('common');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn(data);
      
      if (result.error) {
        setError(result.error);
      } else {
        // Redirect will be handled by the server action
        window.location.href = "/dashboard";
      }
    } catch (err) {
      setError(tErrors('unexpected_error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">{t('sign_in')}</CardTitle>
        <CardDescription>
          {t('welcome_back')}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              {...register("email")}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('password')}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                {...register("password")}
                disabled={isLoading}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Link
              href="/auth/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              {t('forgot_password')}
            </Link>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || isSubmitting}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('signing_in')}
              </>
            ) : (
              t('sign_in')
            )}
          </Button>
          
          <p className="text-center text-sm text-gray-600">
            {t('dont_have_account')}{" "}
            <Link
              href="/auth/signup"
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              {t('sign_up')}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
`;

export const i18nSignupFormTemplate = `"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { signUpSchema, type SignUpInput } from "@/validations/auth";
import { signUp } from "@/actions/auth";
import { Link } from "@/libs/i18n-navigation";
import { z } from "zod";

interface ExtendedSignUpInput extends SignUpInput {
  acceptTerms: boolean;
}

export function SignupForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Translations
  const t = useTranslations('auth');
  const tErrors = useTranslations('auth_errors');
  const tCommon = useTranslations('common');

  const extendedSignUpSchema = signUpSchema.extend({
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: tErrors('required_terms'),
    }),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ExtendedSignUpInput>({
    resolver: zodResolver(extendedSignUpSchema),
    defaultValues: {
      acceptTerms: false,
    },
  });

  const acceptTerms = watch("acceptTerms");

  const onSubmit = async (data: ExtendedSignUpInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const { acceptTerms, ...signUpData } = data;
      const result = await signUp(signUpData);
      
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError(tErrors('unexpected_error'));
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {t('account_created')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('account_created_description')}
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/auth/signin">
              {t('sign_in_to_account')}
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">{t('create_account')}</CardTitle>
        <CardDescription>
          {t('get_started')}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">{t('name')}</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              {...register("name")}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              {...register("email")}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('password')}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                {...register("password")}
                disabled={isLoading}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
            <p className="text-xs text-gray-500">
              {tErrors('weak_password')}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="acceptTerms"
              checked={acceptTerms}
              onCheckedChange={(checked) => setValue("acceptTerms", checked as boolean)}
              disabled={isLoading}
            />
            <Label htmlFor="acceptTerms" className="text-sm">
              {t.rich('accept_terms', {
                terms: (chunks) => (
                  <Link
                    href="/terms"
                    className="text-blue-600 hover:text-blue-500"
                    target="_blank"
                  >
                    {t('terms_of_service')}
                  </Link>
                ),
                privacy: (chunks) => (
                  <Link
                    href="/privacy"
                    className="text-blue-600 hover:text-blue-500"
                    target="_blank"
                  >
                    {t('privacy_policy')}
                  </Link>
                ),
              })}
            </Label>
          </div>
          {errors.acceptTerms && (
            <p className="text-sm text-red-500">{errors.acceptTerms.message}</p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || isSubmitting}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('creating_account')}
              </>
            ) : (
              t('create_account')
            )}
          </Button>
          
          <p className="text-center text-sm text-gray-600">
            {t('already_have_account')}{" "}
            <Link
              href="/auth/signin"
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              {t('sign_in')}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
`;

export const i18nAuthPagesTemplates = {
  signInPage: `import { useTranslations } from 'next-intl';
import { LoginForm } from "@/components/auth/login-form";

export default function SignInPage() {
  const t = useTranslations('auth');
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {t('welcome_back')}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t('sign_in')} to continue
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}`,

  signUpPage: `import { useTranslations } from 'next-intl';
import { SignupForm } from "@/components/auth/signup-form";

export default function SignUpPage() {
  const t = useTranslations('auth');
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {t('create_account')}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t('get_started')}
          </p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}`,

  rootLayout: `import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default async function RootLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}`,

  authLayout: `import { useTranslations } from 'next-intl';
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={\`\${inter.className} bg-gray-50\`}>
      {children}
    </div>
  );
}`,
};

export const languageSwitcherTemplate = `"use client";

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/libs/i18n-navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUPPORTED_LOCALES } from '@/libs/i18n-utils';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLocaleChange = (newLocale: string) => {
    router.push(pathname, { locale: newLocale });
  };

  const currentLocale = SUPPORTED_LOCALES.find(l => l.code === locale);

  return (
    <Select value={locale} onValueChange={handleLocaleChange}>
      <SelectTrigger className="w-32">
        <SelectValue>
          <span className="flex items-center gap-2">
            <span>{currentLocale?.flag}</span>
            <span>{currentLocale?.name}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_LOCALES.map((locale) => (
          <SelectItem key={locale.code} value={locale.code}>
            <span className="flex items-center gap-2">
              <span>{locale.flag}</span>
              <span>{locale.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
`;