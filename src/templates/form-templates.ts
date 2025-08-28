/**
 * @fileoverview Form Handling Templates
 * @description Templates for React Hook Form setup and form utilities
 * Includes form hooks, validation helpers, and example components
 */

export const formHooksTemplate = `import React from "react";
import { z } from "zod";
import { useForm, UseFormReturn, DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

/**
 * Generic form hook with Zod validation
 * TODO: Fix typing issues with React Hook Form + Zod resolver
 */
// export function useZodForm<T extends z.ZodSchema<any>>(
//   schema: T,
//   defaultValues?: Partial<z.infer<T>>
// ) {
//   return useForm<z.infer<T>>({
//     resolver: zodResolver(schema),
//     defaultValues,
//   });
// }

/**
 * Form state hook for server actions
 */
export function useFormState<T>(
  action: (prevState: T, formData: FormData) => Promise<T>,
  initialState: T
): [T, (formData: FormData) => void] {
  const [state, setState] = React.useState<T>(initialState);
  const [isPending, startTransition] = React.useTransition();

  const dispatch = React.useCallback(
    (formData: FormData) => {
      startTransition(async () => {
        const newState = await action(state, formData);
        setState(newState);
      });
    },
    [action, state]
  );

  return [state, dispatch];
}`;

export const formUtilsTemplate = `import { z } from "zod";
import { FieldError, FieldErrors, FieldValues } from "react-hook-form";

/**
 * Extract error message from React Hook Form field error
 */
export function getErrorMessage(error: FieldError | undefined): string | undefined {
  return error?.message;
}

/**
 * Check if form has any errors
 */
export function hasFormErrors<T extends FieldValues>(errors: FieldErrors<T>): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Get all error messages from form
 */
export function getFormErrorMessages<T extends FieldValues>(errors: FieldErrors<T>): string[] {
  return Object.values(errors)
    .map((error) => getErrorMessage(error as FieldError))
    .filter(Boolean) as string[];
}

/**
 * Common validation schemas
 */
export const validationSchemas = {
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: (password: string) =>
    z.string().refine((val) => val === password, {
      message: "Passwords do not match",
    }),
  required: (field: string) => z.string().min(1, \`\${field} is required\`),
  optionalString: z.string().optional(),
  url: z.string().url("Please enter a valid URL"),
  phone: z.string().regex(/^\\+?[1-9]\\d{1,14}$/, "Please enter a valid phone number"),
};`;

export const formComponentTemplate = `"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

interface ContactFormProps {
  onSubmit: (values: ContactFormValues) => Promise<void>;
  isLoading?: boolean;
}

export function ContactForm({ onSubmit, isLoading }: ContactFormProps) {
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      message: "",
    },
  });

  const handleSubmit = async (values: ContactFormValues) => {
    try {
      await onSubmit(values);
      form.reset();
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Your name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="your@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea placeholder="Your message..." {...field} />
              </FormControl>
              <FormDescription>
                Tell us what you'd like to discuss.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" disabled={isLoading || form.formState.isSubmitting}>
          {isLoading || form.formState.isSubmitting ? "Sending..." : "Send Message"}
        </Button>
      </form>
    </Form>
  );
}`;