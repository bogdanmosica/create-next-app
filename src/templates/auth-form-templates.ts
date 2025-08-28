/**
 * @fileoverview Authentication Form Templates
 * @description Complete login and signup form components with React Hook Form, Zod validation, and shadcn/ui
 * Adapted for JWT authentication (not Clerk)
 */

export const loginFormTemplate = `"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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
import Link from "next/link";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
        <CardDescription>
          Enter your email and password to access your account
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
            <Label htmlFor="email">Email</Label>
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
            <Label htmlFor="password">Password</Label>
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
              Forgot password?
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
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
          
          <p className="text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <Link
              href="/auth/signup"
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Sign up
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
`;

export const signupFormTemplate = `"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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
import Link from "next/link";

interface ExtendedSignUpInput extends SignUpInput {
  acceptTerms: boolean;
}

const extendedSignUpSchema = signUpSchema.extend({
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions",
  }),
});

export function SignupForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Account Created!</CardTitle>
          <CardDescription className="text-center">
            Your account has been successfully created. You can now sign in.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/auth/signin">
              Sign In to Your Account
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
        <CardDescription>
          Enter your details below to create your account
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
            <Label htmlFor="name">Full Name</Label>
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
            <Label htmlFor="email">Email</Label>
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
            <Label htmlFor="password">Password</Label>
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
              Must contain at least 8 characters with uppercase, lowercase, and number
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
              I accept the{" "}
              <Link
                href="/terms"
                className="text-blue-600 hover:text-blue-500"
                target="_blank"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="text-blue-600 hover:text-blue-500"
                target="_blank"
              >
                Privacy Policy
              </Link>
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
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
          
          <p className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              href="/auth/signin"
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
`;

export const authPagesTemplate = {
  signInPage: `import { LoginForm } from "@/components/auth/login-form";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your account to continue
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}`,

  signUpPage: `import { SignupForm } from "@/components/auth/signup-form";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Get started with your free account today
          </p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}`,

  layoutTemplate: `import { Inter } from "next/font/google";

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

// Enhanced auth actions templates
export const authActionsTemplate = `"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/libs/db";
import { users } from "@/models/user";
import { activityLogs } from "@/models/activity-log";
import { signInSchema, signUpSchema, type SignInInput, type SignUpInput } from "@/validations/auth";
import { eq } from "drizzle-orm";
import { Env } from "@/libs/env";

const key = new TextEncoder().encode(Env.AUTH_SECRET);

export async function signUp(data: SignUpInput) {
  try {
    // Validate input
    const validatedData = signUpSchema.parse(data);
    
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, validatedData.email))
      .limit(1);
    
    if (existingUser.length > 0) {
      return { error: "An account with this email already exists" };
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);
    
    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email: validatedData.email,
        hashedPassword,
        name: validatedData.name,
        emailVerified: false,
      })
      .returning();
    
    // Log activity
    await db.insert(activityLogs).values({
      userId: newUser.id,
      action: "user_signup",
      description: "User created account",
      metadata: { email: newUser.email },
    });
    
    return { success: true, user: { id: newUser.id, email: newUser.email, name: newUser.name } };
  } catch (error) {
    console.error("Sign up error:", error);
    return { error: "Failed to create account. Please try again." };
  }
}

export async function signIn(data: SignInInput) {
  try {
    // Validate input
    const validatedData = signInSchema.parse(data);
    
    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, validatedData.email))
      .limit(1);
    
    if (!user || user.isDeleted) {
      return { error: "Invalid email or password" };
    }
    
    // Verify password
    const passwordMatch = await bcrypt.compare(validatedData.password, user.hashedPassword);
    
    if (!passwordMatch) {
      return { error: "Invalid email or password" };
    }
    
    // Create JWT token
    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(key);
    
    // Set cookie (Next.js 15 compatible)
    const cookieStore = await cookies();
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    
    // Log activity
    await db.insert(activityLogs).values({
      userId: user.id,
      action: "user_signin",
      description: "User signed in",
      metadata: { email: user.email },
    });
    
    return { success: true };
  } catch (error) {
    console.error("Sign in error:", error);
    return { error: "Failed to sign in. Please try again." };
  }
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  redirect("/auth/signin");
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");
    
    if (!sessionCookie) {
      return null;
    }
    
    const { payload } = await jwtVerify(sessionCookie.value, key);
    
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatar: users.avatar,
        emailVerified: users.emailVerified,
      })
      .from(users)
      .where(eq(users.id, payload.userId as string))
      .limit(1);
    
    return user || null;
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
}`;