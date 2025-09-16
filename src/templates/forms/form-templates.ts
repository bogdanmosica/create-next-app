/**
 * @fileoverview Form Handling Templates
 * @description Templates for React Hook Form setup and form utilities
 * Includes form hooks, validation helpers, and example components
 */

export const formHooksTemplate = `'use client';

import { useForm, UseFormProps, UseFormReturn, FieldValues, Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { useState, useCallback } from 'react';

// Enhanced useForm hook with Zod validation
export function useZodForm<T extends FieldValues, TContext = any>(
  schema: z.ZodSchema<T>,
  options?: any
): any {
  return useForm({
    resolver: zodResolver(schema as any),
    ...options,
  } as any);
}

// Form state management hook
export function useFormState<T = any>(initialState?: T) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setError(null);
    setSuccess(null);
    setIsLoading(false);
  }, []);

  const setLoadingState = useCallback((loading: boolean) => {
    if (loading) {
      setError(null);
      setSuccess(null);
    }
    setIsLoading(loading);
  }, []);

  const setErrorState = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setSuccess(null);
    setIsLoading(false);
  }, []);

  const setSuccessState = useCallback((successMessage: string) => {
    setSuccess(successMessage);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    isLoading,
    error,
    success,
    resetState,
    setLoadingState,
    setErrorState,
    setSuccessState,
  };
}

// Multi-step form hook
export function useMultiStepForm<T extends Record<string, any>>(steps: Array<keyof T>) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<T>>({});

  const next = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  }, [steps.length]);

  const prev = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(Math.max(0, Math.min(step, steps.length - 1)));
  }, [steps.length]);

  const updateData = useCallback((data: Partial<T>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  }, []);

  const resetForm = useCallback(() => {
    setCurrentStep(0);
    setFormData({});
  }, []);

  return {
    currentStep,
    currentStepKey: steps[currentStep],
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === steps.length - 1,
    totalSteps: steps.length,
    formData,
    next,
    prev,
    goToStep,
    updateData,
    resetForm,
  };
}

// Field array helpers
export function useFieldArrayHelpers<T extends FieldValues, K extends Path<T>>(
  form: UseFormReturn<T>,
  name: K
) {
  const fieldArray = form.watch(name) as Array<any> || [];

  const append = useCallback((value: any) => {
    const newArray = [...fieldArray, value];
    form.setValue(name, newArray as any);
  }, [form, name, fieldArray]);

  const remove = useCallback((index: number) => {
    const newArray = fieldArray.filter((_, i) => i !== index);
    form.setValue(name, newArray as any);
  }, [form, name, fieldArray]);

  const move = useCallback((from: number, to: number) => {
    const newArray = [...fieldArray];
    const [removed] = newArray.splice(from, 1);
    newArray.splice(to, 0, removed);
    form.setValue(name, newArray as any);
  }, [form, name, fieldArray]);

  return {
    fields: fieldArray,
    append,
    remove,
    move,
  };
}

// Form mutation hook with React Query
export function useFormMutation<TData = any, TError = Error, TVariables = any, TContext = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, TError, TVariables, TContext>
) {
  const formState = useFormState();

  const mutation = useMutation({
    mutationFn,
    onMutate: () => {
      formState.setLoadingState(true);
      return undefined;
    },
    onError: (error: TError) => {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      formState.setErrorState(errorMessage);
    },
    onSuccess: (data, variables, context) => {
      formState.setSuccessState('Operation completed successfully');
      (options?.onSuccess as any)?.(data, variables, context);
    },
    ...options,
  });

  return {
    ...mutation,
    ...formState,
  };
}

// Form query hook
export function useFormQuery<TQueryFnData = unknown, TError = Error, TData = TQueryFnData>(
  key: any[],
  queryFn: () => Promise<TQueryFnData>,
  options?: UseQueryOptions<TQueryFnData, TError, TData>
) {
  const query = useQuery({
    queryKey: key,
    queryFn,
    ...options,
  });

  return {
    ...query,
    isLoading: query.isLoading,
    error: (query.error as Error)?.message || null,
  };
}

// Debounced input hook
export function useDebouncedValue<T>(value: T, delay: number = 300) {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  const updateDebouncedValue = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (newValue: T) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => setDebouncedValue(newValue), delay);
      };
    })(),
    [delay]
  );

  // Update debounced value when the actual value changes
  useState(() => {
    updateDebouncedValue(value);
  });

  return debouncedValue;
}

// Form persistence hook (localStorage)
export function useFormPersistence<T extends FieldValues>(
  key: string,
  form: UseFormReturn<T>,
  options: { debounceMs?: number; exclude?: Path<T>[] } = {}
) {
  const { debounceMs = 1000, exclude = [] } = options;
  const formValues = form.watch();

  // Load persisted data on mount
  useState(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const data = JSON.parse(saved);
        Object.keys(data).forEach((fieldName) => {
          if (!exclude.includes(fieldName as Path<T>)) {
            form.setValue(fieldName as Path<T>, data[fieldName]);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load persisted form data:', error);
    }
  });

  // Debounced save to localStorage
  const debouncedValues = useDebouncedValue(formValues, debounceMs);

  useState(() => {
    try {
      const dataToSave = { ...debouncedValues };
      exclude.forEach(field => {
        delete dataToSave[field];
      });
      localStorage.setItem(key, JSON.stringify(dataToSave));
    } catch (error) {
      console.warn('Failed to persist form data:', error);
    }
  });

  const clearPersistedData = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to clear persisted form data:', error);
    }
  }, [key]);

  return {
    clearPersistedData,
  };
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
  optionalString: z.string().optional().or(z.literal("")),
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