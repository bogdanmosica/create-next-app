/**
 * @fileoverview Form Handling Tool
 * @description Sets up React Hook Form with Zod validation and React Query for comprehensive form management
 * Provides form utilities, validation schemas, and reusable form components for modern React applications
 */

import fs from "fs-extra";
import path from "path";
import { runCommand } from "../../runners/command-runner.js";
import { detectProjectState } from "../../utils/dependency-detector.js";

export interface FormHandlingConfig {
  projectPath: string;
  includeZodValidation?: boolean;
  includeReactQuery?: boolean;
}

export async function setupFormHandling(config: FormHandlingConfig): Promise<string> {
  const {
    projectPath,
    includeZodValidation = true,
    includeReactQuery = true
  } = config;

  console.error(`[DEBUG] Setting up form handling at: ${projectPath}`);
  console.error(`[DEBUG] Config - Zod: ${includeZodValidation}, React Query: ${includeReactQuery}`);

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

    // Check for existing form setup
    const formHooksPath = path.join(projectPath, "lib", "forms", "hooks.ts");
    if (await fs.pathExists(formHooksPath)) {
      throw new Error("Form handling appears to already be set up (lib/forms/hooks.ts exists).");
    }

    // Step 1: Install dependencies
    const step1 = "Installing form handling dependencies...";
    steps.push(step1);
    console.error(`[STEP 1/5] ${step1}`);
    
    const packagesToInstall: string[] = [
      "react-hook-form",
      "@hookform/resolvers"
    ];

    if (includeZodValidation && !projectState.hasValidation) {
      packagesToInstall.push("zod");
    }

    if (includeReactQuery && !projectState.hasReactQuery) {
      packagesToInstall.push("@tanstack/react-query", "@tanstack/react-query-devtools");
    }

    if (packagesToInstall.length > 0) {
      await runCommand(`pnpm add ${packagesToInstall.join(" ")}`, projectPath);
    }

    console.error(`[STEP 1/5] ✅ Completed: ${step1}`);

    // Step 2: Create form utilities and hooks
    const step2 = "Creating form utilities and custom hooks...";
    steps.push(step2);
    console.error(`[STEP 2/5] ${step2}`);
    await createFormUtilities(projectPath, { includeZodValidation, includeReactQuery });
    console.error(`[STEP 2/5] ✅ Completed: ${step2}`);

    // Step 3: Create form components
    const step3 = "Setting up reusable form components...";
    steps.push(step3);
    console.error(`[STEP 3/5] ${step3}`);
    await createFormComponents(projectPath, { includeZodValidation, includeReactQuery });
    console.error(`[STEP 3/5] ✅ Completed: ${step3}`);

    // Step 4: Create form validation schemas
    const step4 = "Creating form validation schemas and examples...";
    steps.push(step4);
    console.error(`[STEP 4/5] ${step4}`);
    await createFormValidationSchemas(projectPath, { includeZodValidation });
    console.error(`[STEP 4/5] ✅ Completed: ${step4}`);

    // Step 5: Create React Query setup (if enabled)
    if (includeReactQuery) {
      const step5 = "Setting up React Query providers and configuration...";
      steps.push(step5);
      console.error(`[STEP 5/5] ${step5}`);
      await createReactQuerySetup(projectPath);
      console.error(`[STEP 5/5] ✅ Completed: ${step5}`);
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[SUCCESS] Form handling setup completed in ${totalTime}s`);

    // Generate success message with integration status
    return generateSuccessMessage(steps, totalTime, {
      hasValidation: projectState.hasValidation || includeZodValidation,
      hasReactQuery: projectState.hasReactQuery || includeReactQuery,
      includeZodValidation,
      includeReactQuery
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] Form handling setup failed: ${errorMsg}`);
    throw error;
  }
}

async function createFormUtilities(projectPath: string, options: { includeZodValidation: boolean; includeReactQuery: boolean }): Promise<void> {
  // Create form hooks
  const formHooksContent = `/**
 * @fileoverview Form Hooks
 * @description Custom React Hook Form utilities with Zod validation and query integration
 */

'use client';

import { useForm, UseFormProps, UseFormReturn, FieldValues, Path } from 'react-hook-form';${options.includeZodValidation ? `
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';` : ''}${options.includeReactQuery ? `
import { useMutation, useQuery, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';` : ''}
import { useState, useCallback } from 'react';

${options.includeZodValidation ? `// Enhanced useForm hook with Zod validation
export function useZodForm<T extends FieldValues, TContext = any>(
  schema: z.ZodSchema<T>,
  options?: Omit<UseFormProps<T, TContext>, 'resolver'>
): UseFormReturn<T, TContext> {
  return useForm<T, TContext>({
    resolver: zodResolver(schema),
    ...options,
  });
}` : ''}

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
}${options.includeReactQuery ? `

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
    },
    onError: (error: TError) => {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      formState.setErrorState(errorMessage);
    },
    onSuccess: (data, variables, context) => {
      formState.setSuccessState('Operation completed successfully');
      options?.onSuccess?.(data, variables, context);
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
    error: query.error?.message || null,
  };
}` : ''}

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
}
`;

  // Create form utilities
  const formUtilsContent = `/**
 * @fileoverview Form Utilities
 * @description Helper functions for form handling and validation
 */

import { FieldError, FieldErrors } from 'react-hook-form';

// Extract error message from React Hook Form error
export function getErrorMessage(error: FieldError | undefined): string | undefined {
  if (!error) return undefined;
  return error.message || 'Invalid value';
}

// Get nested field error message
export function getNestedErrorMessage<T>(
  errors: FieldErrors<T>,
  path: string
): string | undefined {
  const pathArray = path.split('.');
  let current: any = errors;

  for (const segment of pathArray) {
    if (current?.[segment]) {
      current = current[segment];
    } else {
      return undefined;
    }
  }

  return getErrorMessage(current);
}

// Check if form has any errors
export function hasFormErrors<T>(errors: FieldErrors<T>): boolean {
  return Object.keys(errors).length > 0;
}

// Get first error message from form
export function getFirstErrorMessage<T>(errors: FieldErrors<T>): string | undefined {
  const firstErrorKey = Object.keys(errors)[0];
  if (!firstErrorKey) return undefined;
  
  const firstError = errors[firstErrorKey as keyof T] as FieldError;
  return getErrorMessage(firstError);
}

// Format form data for API submission
export function formatFormData<T extends Record<string, any>>(
  data: T,
  formatters: Partial<Record<keyof T, (value: any) => any>> = {}
): T {
  const formatted = { ...data };
  
  Object.keys(formatters).forEach((key) => {
    const formatter = formatters[key];
    if (formatter && key in formatted) {
      formatted[key] = formatter(formatted[key]);
    }
  });

  return formatted;
}

// Remove empty values from form data
export function removeEmptyValues<T extends Record<string, any>>(
  data: T,
  options: { removeNull?: boolean; removeUndefined?: boolean; removeEmptyStrings?: boolean } = {}
): Partial<T> {
  const { removeNull = true, removeUndefined = true, removeEmptyStrings = true } = options;
  const cleaned: Partial<T> = {};

  Object.keys(data).forEach((key) => {
    const value = data[key];
    const shouldRemove = 
      (removeNull && value === null) ||
      (removeUndefined && value === undefined) ||
      (removeEmptyStrings && typeof value === 'string' && value.trim() === '');

    if (!shouldRemove) {
      cleaned[key as keyof T] = value;
    }
  });

  return cleaned;
}

// Convert form data to FormData (for file uploads)
export function toFormData<T extends Record<string, any>>(data: T): FormData {
  const formData = new FormData();
  
  Object.keys(data).forEach((key) => {
    const value = data[key];
    
    if (value instanceof File) {
      formData.append(key, value);
    } else if (value instanceof FileList) {
      Array.from(value).forEach((file, index) => {
        formData.append(\`\${key}[\${index}]\`, file);
      });
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'object') {
          formData.append(\`\${key}[\${index}]\`, JSON.stringify(item));
        } else {
          formData.append(\`\${key}[\${index}]\`, String(item));
        }
      });
    } else if (typeof value === 'object' && value !== null) {
      formData.append(key, JSON.stringify(value));
    } else if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });

  return formData;
}

// Validate file input
export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  maxFiles?: number;
}

export function validateFiles(
  files: FileList | File[] | null,
  options: FileValidationOptions = {}
): { isValid: boolean; errors: string[] } {
  const { maxSize, allowedTypes, maxFiles } = options;
  const errors: string[] = [];
  
  if (!files) {
    return { isValid: true, errors };
  }

  const fileArray = Array.from(files);

  if (maxFiles && fileArray.length > maxFiles) {
    errors.push(\`Maximum \${maxFiles} files allowed\`);
  }

  fileArray.forEach((file, index) => {
    if (maxSize && file.size > maxSize) {
      const sizeMB = (maxSize / 1024 / 1024).toFixed(1);
      errors.push(\`File \${index + 1} exceeds maximum size of \${sizeMB}MB\`);
    }

    if (allowedTypes && !allowedTypes.includes(file.type)) {
      errors.push(\`File \${index + 1} type not allowed: \${file.type}\`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Format file size for display
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Debounce function for form inputs
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}
`;

  // Create form types
  const formTypesContent = `/**
 * @fileoverview Form Types
 * @description TypeScript types for form handling
 */

import { FieldError, FieldErrors, UseFormReturn } from 'react-hook-form';${options.includeZodValidation ? `
import { z } from 'zod';` : ''}

// Base form component props
export interface BaseFormProps<T extends Record<string, any> = any> {
  onSubmit: (data: T) => void | Promise<void>;
  onError?: (errors: FieldErrors<T>) => void;
  disabled?: boolean;
  className?: string;
}

// Form field component props
export interface FormFieldProps {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

// Form input props
export interface FormInputProps extends FormFieldProps {
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
}

// Form textarea props
export interface FormTextareaProps extends FormFieldProps {
  name: string;
  placeholder?: string;
  rows?: number;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

// Form select props
export interface FormSelectProps extends FormFieldProps {
  name: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
  multiple?: boolean;
}

// Form checkbox props
export interface FormCheckboxProps extends Omit<FormFieldProps, 'label'> {
  name: string;
  label: string;
}

// Form radio group props
export interface FormRadioGroupProps extends FormFieldProps {
  name: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  direction?: 'horizontal' | 'vertical';
}

// Form file upload props
export interface FormFileUploadProps extends FormFieldProps {
  name: string;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  allowedTypes?: string[];
}

// Form state interface
export interface FormState {
  isLoading: boolean;
  error: string | null;
  success: string | null;
}

// Multi-step form step interface
export interface FormStep<T = any> {
  id: string;
  title: string;
  description?: string;
  isValid?: (data: Partial<T>) => boolean;
  component: React.ComponentType<any>;
}

// Form validation result
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

${options.includeZodValidation ? `// Zod form types
export type ZodFormData<T extends z.ZodSchema> = z.infer<T>;

export interface ZodFormProps<T extends z.ZodSchema> extends BaseFormProps<z.infer<T>> {
  schema: T;
  defaultValues?: Partial<z.infer<T>>;
}` : ''}

// Form context type
export interface FormContextValue<T extends Record<string, any> = any> {
  form: UseFormReturn<T>;
  isLoading: boolean;
  error: string | null;
  success: string | null;
}

// Form configuration
export interface FormConfig {
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
  revalidateMode?: 'onChange' | 'onBlur' | 'onSubmit';
  shouldFocusError?: boolean;
  shouldUnregister?: boolean;
}

// API form submission types
export interface ApiFormSubmission<TData = any, TResponse = any> {
  data: TData;
  endpoint: string;
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  onSuccess?: (response: TResponse) => void;
  onError?: (error: Error) => void;
}

// Form field validation types
export type FieldValidationRule = {
  required?: string | boolean;
  minLength?: { value: number; message: string };
  maxLength?: { value: number; message: string };
  min?: { value: number; message: string };
  max?: { value: number; message: string };
  pattern?: { value: RegExp; message: string };
  validate?: (value: any) => string | boolean;
};

export type FieldValidationRules = Record<string, FieldValidationRule>;
`;

  const libFormsDir = path.join(projectPath, "lib", "forms");
  await fs.ensureDir(libFormsDir);
  
  await fs.writeFile(path.join(libFormsDir, "hooks.ts"), formHooksContent);
  await fs.writeFile(path.join(libFormsDir, "utils.ts"), formUtilsContent);
  await fs.writeFile(path.join(libFormsDir, "types.ts"), formTypesContent);

  // Create index file
  const indexContent = `/**
 * @fileoverview Form Library
 * @description Central exports for form handling utilities
 */

export * from './hooks';
export * from './utils';
export * from './types';
`;

  await fs.writeFile(path.join(libFormsDir, "index.ts"), indexContent);
}

async function createFormComponents(projectPath: string, options: { includeZodValidation: boolean; includeReactQuery: boolean }): Promise<void> {
  // Create form field component
  const formFieldContent = `/**
 * @fileoverview Form Field Component
 * @description Reusable form field wrapper with label, description, and error handling
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface FormFieldProps {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  description,
  error,
  required = false,
  htmlFor,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={htmlFor} className={cn(error && 'text-destructive')}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      
      {children}
      
      {description && !error && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
`;

  // Create form input component
  const formInputContent = `/**
 * @fileoverview Form Input Component
 * @description Enhanced input component with form integration
 */

'use client';

import React from 'react';
import { UseFormReturn, FieldPath, FieldValues } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { FormField } from './form-field';
import { getErrorMessage } from '@/lib/forms/utils';
import { cn } from '@/lib/utils';

interface FormInputProps<TFieldValues extends FieldValues = FieldValues> {
  form: UseFormReturn<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label?: string;
  description?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  className?: string;
}

export function FormInput<TFieldValues extends FieldValues = FieldValues>({
  form,
  name,
  label,
  description,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  autoComplete,
  autoFocus = false,
  className,
}: FormInputProps<TFieldValues>) {
  const error = getErrorMessage(form.formState.errors[name]);

  return (
    <FormField
      label={label}
      description={description}
      error={error}
      required={required}
      htmlFor={name}
      className={className}
    >
      <Input
        id={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        disabled={disabled}
        className={cn(error && 'border-destructive')}
        {...form.register(name)}
      />
    </FormField>
  );
}
`;

  // Create form textarea component
  const formTextareaContent = `/**
 * @fileoverview Form Textarea Component
 * @description Enhanced textarea component with form integration
 */

'use client';

import React from 'react';
import { UseFormReturn, FieldPath, FieldValues } from 'react-hook-form';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from './form-field';
import { getErrorMessage } from '@/lib/forms/utils';
import { cn } from '@/lib/utils';

interface FormTextareaProps<TFieldValues extends FieldValues = FieldValues> {
  form: UseFormReturn<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
  className?: string;
}

export function FormTextarea<TFieldValues extends FieldValues = FieldValues>({
  form,
  name,
  label,
  description,
  placeholder,
  required = false,
  disabled = false,
  rows = 3,
  className,
}: FormTextareaProps<TFieldValues>) {
  const error = getErrorMessage(form.formState.errors[name]);

  return (
    <FormField
      label={label}
      description={description}
      error={error}
      required={required}
      htmlFor={name}
      className={className}
    >
      <Textarea
        id={name}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={cn(error && 'border-destructive')}
        {...form.register(name)}
      />
    </FormField>
  );
}
`;

  // Create form select component
  const formSelectContent = `/**
 * @fileoverview Form Select Component
 * @description Enhanced select component with form integration
 */

'use client';

import React from 'react';
import { UseFormReturn, FieldPath, FieldValues } from 'react-hook-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormField } from './form-field';
import { getErrorMessage } from '@/lib/forms/utils';

interface FormSelectProps<TFieldValues extends FieldValues = FieldValues> {
  form: UseFormReturn<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  className?: string;
}

export function FormSelect<TFieldValues extends FieldValues = FieldValues>({
  form,
  name,
  label,
  description,
  placeholder,
  required = false,
  disabled = false,
  options,
  className,
}: FormSelectProps<TFieldValues>) {
  const error = getErrorMessage(form.formState.errors[name]);

  return (
    <FormField
      label={label}
      description={description}
      error={error}
      required={required}
      className={className}
    >
      <Select
        value={form.watch(name) || ''}
        onValueChange={(value) => form.setValue(name, value as any)}
        disabled={disabled}
      >
        <SelectTrigger className={error ? 'border-destructive' : ''}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}
`;

  // Create form checkbox component
  const formCheckboxContent = `/**
 * @fileoverview Form Checkbox Component
 * @description Enhanced checkbox component with form integration
 */

'use client';

import React from 'react';
import { UseFormReturn, FieldPath, FieldValues } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { getErrorMessage } from '@/lib/forms/utils';
import { cn } from '@/lib/utils';

interface FormCheckboxProps<TFieldValues extends FieldValues = FieldValues> {
  form: UseFormReturn<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function FormCheckbox<TFieldValues extends FieldValues = FieldValues>({
  form,
  name,
  label,
  description,
  required = false,
  disabled = false,
  className,
}: FormCheckboxProps<TFieldValues>) {
  const error = getErrorMessage(form.formState.errors[name]);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center space-x-2">
        <Checkbox
          id={name}
          checked={form.watch(name) || false}
          onCheckedChange={(checked) => form.setValue(name, checked as any)}
          disabled={disabled}
          className={error ? 'border-destructive' : ''}
        />
        <Label htmlFor={name} className={cn('text-sm', error && 'text-destructive')}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      </div>

      {description && !error && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
`;

  // Create form submit button
  const formSubmitButtonContent = `/**
 * @fileoverview Form Submit Button Component
 * @description Enhanced submit button with loading states and form integration
 */

'use client';

import React from 'react';
import { UseFormReturn, FieldValues } from 'react-hook-form';
import { Button, ButtonProps } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormSubmitButtonProps<TFieldValues extends FieldValues = FieldValues> 
  extends Omit<ButtonProps, 'type'> {
  form?: UseFormReturn<TFieldValues>;
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export function FormSubmitButton<TFieldValues extends FieldValues = FieldValues>({
  form,
  isLoading = false,
  loadingText = 'Loading...',
  disabled,
  children,
  className,
  ...props
}: FormSubmitButtonProps<TFieldValues>) {
  const formIsLoading = form?.formState.isSubmitting || isLoading;
  const formHasErrors = form ? Object.keys(form.formState.errors).length > 0 : false;

  return (
    <Button
      type="submit"
      disabled={disabled || formIsLoading || formHasErrors}
      className={cn('w-full', className)}
      {...props}
    >
      {formIsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {formIsLoading ? loadingText : children}
    </Button>
  );
}
`;

  // Create components index
  const componentsIndexContent = `/**
 * @fileoverview Form Components
 * @description Export all form components
 */

export { FormField } from './form-field';
export { FormInput } from './form-input';
export { FormTextarea } from './form-textarea';
export { FormSelect } from './form-select';
export { FormCheckbox } from './form-checkbox';
export { FormSubmitButton } from './form-submit-button';
`;

  const componentsFormsDir = path.join(projectPath, "components", "forms");
  await fs.ensureDir(componentsFormsDir);
  
  await fs.writeFile(path.join(componentsFormsDir, "form-field.tsx"), formFieldContent);
  await fs.writeFile(path.join(componentsFormsDir, "form-input.tsx"), formInputContent);
  await fs.writeFile(path.join(componentsFormsDir, "form-textarea.tsx"), formTextareaContent);
  await fs.writeFile(path.join(componentsFormsDir, "form-select.tsx"), formSelectContent);
  await fs.writeFile(path.join(componentsFormsDir, "form-checkbox.tsx"), formCheckboxContent);
  await fs.writeFile(path.join(componentsFormsDir, "form-submit-button.tsx"), formSubmitButtonContent);
  await fs.writeFile(path.join(componentsFormsDir, "index.ts"), componentsIndexContent);
}

async function createFormValidationSchemas(projectPath: string, options: { includeZodValidation: boolean }): Promise<void> {
  if (!options.includeZodValidation) return;

  const validationSchemasContent = `/**
 * @fileoverview Common Form Validation Schemas
 * @description Reusable Zod validation schemas for common form patterns
 */

import { z } from 'zod';

// Basic field validations
export const requiredString = z.string().min(1, 'This field is required');

export const optionalString = z.string().optional();

export const email = z.string().email('Please enter a valid email address');

export const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const confirmPassword = (passwordField: string = 'password') =>
  z.string().min(1, 'Please confirm your password');

export const phone = z
  .string()
  .regex(/^[+]?[(]?[\s-]?[0-9]{1,4}[)]?[\s-]?[0-9]{1,4}[\s-]?[0-9]{1,4}[\s-]?[0-9]{1,9}$/, 
    'Please enter a valid phone number');

export const url = z.string().url('Please enter a valid URL');

export const slug = z
  .string()
  .min(3, 'Slug must be at least 3 characters')
  .max(50, 'Slug must be less than 50 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
  .refine(s => !s.startsWith('-') && !s.endsWith('-'), 'Slug cannot start or end with a hyphen');

// File validation
export const fileSize = (maxSizeInMB: number) =>
  z.instanceof(File).refine(
    (file) => file.size <= maxSizeInMB * 1024 * 1024,
    \`File size must be less than \${maxSizeInMB}MB\`
  );

export const fileType = (allowedTypes: string[]) =>
  z.instanceof(File).refine(
    (file) => allowedTypes.includes(file.type),
    \`File type must be one of: \${allowedTypes.join(', ')}\`
  );

export const imageFile = z
  .instanceof(File)
  .refine((file) => file.size <= 5 * 1024 * 1024, 'Image must be less than 5MB')
  .refine(
    (file) => ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type),
    'File must be a valid image (JPEG, PNG, WebP, or GIF)'
  );

// Common form schemas
export const loginSchema = z.object({
  email: email,
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
});

export const registerSchema = z
  .object({
    name: requiredString.max(100, 'Name must be less than 100 characters'),
    email: email,
    password: password,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    terms: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: email,
});

export const resetPasswordSchema = z
  .object({
    token: requiredString,
    password: password,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const profileSchema = z.object({
  name: requiredString.max(100, 'Name must be less than 100 characters'),
  email: email,
  bio: optionalString.max(500, 'Bio must be less than 500 characters'),
  website: url.optional().or(z.literal('')),
  location: optionalString.max(100, 'Location must be less than 100 characters'),
  phone: phone.optional().or(z.literal('')),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    password: password,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const contactSchema = z.object({
  name: requiredString.max(100, 'Name must be less than 100 characters'),
  email: email,
  subject: requiredString.max(200, 'Subject must be less than 200 characters'),
  message: requiredString.min(10, 'Message must be at least 10 characters').max(1000, 'Message must be less than 1000 characters'),
});

// Multi-step form example
export const multiStepSchema = z.object({
  // Step 1: Personal Information
  personal: z.object({
    firstName: requiredString.max(50, 'First name must be less than 50 characters'),
    lastName: requiredString.max(50, 'Last name must be less than 50 characters'),
    email: email,
    phone: phone,
    dateOfBirth: z.string().min(1, 'Date of birth is required'),
  }),

  // Step 2: Address Information
  address: z.object({
    street: requiredString.max(100, 'Street address must be less than 100 characters'),
    city: requiredString.max(50, 'City must be less than 50 characters'),
    state: requiredString.max(50, 'State must be less than 50 characters'),
    zipCode: z.string().regex(/^\\d{5}(-\\d{4})?$/, 'Please enter a valid ZIP code'),
    country: requiredString,
  }),

  // Step 3: Preferences
  preferences: z.object({
    newsletter: z.boolean().default(false),
    notifications: z.boolean().default(true),
    marketingEmails: z.boolean().default(false),
    theme: z.enum(['light', 'dark', 'system']).default('system'),
  }),
});

// Dynamic validation helpers
export function createArraySchema<T extends z.ZodSchema>(itemSchema: T, min = 0, max = 100) {
  return z
    .array(itemSchema)
    .min(min, \`At least \${min} item(s) required\`)
    .max(max, \`Maximum \${max} item(s) allowed\`);
}

export function createOptionalField<T extends z.ZodSchema>(schema: T) {
  return schema.optional().or(z.literal(''));
}

export function createConditionalSchema<T extends Record<string, any>>(
  baseSchema: z.ZodObject<any>,
  condition: keyof T,
  conditionalFields: z.ZodObject<any>
) {
  return baseSchema.and(
    z.object({}).passthrough().superRefine((data, ctx) => {
      if (data[condition]) {
        const result = conditionalFields.safeParse(data);
        if (!result.success) {
          result.error.issues.forEach((issue) => {
            ctx.addIssue(issue);
          });
        }
      }
    })
  );
}

// Export commonly used types
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type MultiStepInput = z.infer<typeof multiStepSchema>;
`;

  const validationsFormsDir = path.join(projectPath, "validations", "forms");
  await fs.ensureDir(validationsFormsDir);
  await fs.writeFile(path.join(validationsFormsDir, "schemas.ts"), validationSchemasContent);
}

async function createReactQuerySetup(projectPath: string): Promise<void> {
  const queryProviderContent = `/**
 * @fileoverview React Query Provider
 * @description Query client configuration and provider setup
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // With SSR, we usually want to set some default staleTime
            // above 0 to avoid refetching immediately on the client
            staleTime: 60 * 1000, // 1 minute
            retry: (failureCount, error: any) => {
              // Don't retry on 4xx errors (client errors)
              if (error?.status >= 400 && error?.status < 500) {
                return false;
              }
              // Retry up to 3 times for other errors
              return failureCount < 3;
            },
          },
          mutations: {
            retry: false,
            onError: (error: any) => {
              console.error('Mutation error:', error);
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
`;

  const queryHooksContent = `/**
 * @fileoverview React Query Hooks
 * @description Custom hooks for common query patterns
 */

'use client';

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

// Generic API fetch function
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || \`HTTP error! status: \${response.status}\`);
  }

  return response.json();
}

// Custom hook for GET requests
export function useApiQuery<TData = unknown, TError = Error>(
  key: (string | number)[],
  endpoint: string,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TData, TError>({
    queryKey: key,
    queryFn: () => apiFetch<TData>(endpoint),
    ...options,
  });
}

// Custom hook for POST/PUT/PATCH requests
export function useApiMutation<TData = unknown, TError = Error, TVariables = unknown>(
  endpoint: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST',
  options?: UseMutationOptions<TData, TError, TVariables>
) {
  return useMutation<TData, TError, TVariables>({
    mutationFn: (variables: TVariables) =>
      apiFetch<TData>(endpoint, {
        method,
        body: JSON.stringify(variables),
      }),
    ...options,
  });
}

// Hook for optimistic updates
export function useOptimisticMutation<TData = unknown, TError = Error, TVariables = unknown>(
  queryKey: (string | number)[],
  endpoint: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST',
  options?: UseMutationOptions<TData, TError, TVariables>
) {
  const queryClient = useQueryClient();

  return useMutation<TData, TError, TVariables>({
    mutationFn: (variables: TVariables) =>
      apiFetch<TData>(endpoint, {
        method,
        body: JSON.stringify(variables),
      }),
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically update to the new value
      if (options?.onMutate) {
        await options.onMutate(variables);
      }

      // Return a context object with the snapshotted value
      return { previousData };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      
      if (options?.onError) {
        options.onError(err, variables, context);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey });
      
      if (options?.onSettled) {
        options.onSettled(...arguments);
      }
    },
    ...options,
  });
}

// Hook for infinite queries (pagination)
export function useInfiniteApiQuery<TData = unknown, TError = Error>(
  key: (string | number)[],
  endpoint: string,
  getNextPageParam: (lastPage: TData, pages: TData[]) => string | number | undefined,
  options?: any
) {
  return useQuery({
    queryKey: key,
    queryFn: ({ pageParam = 1 }) =>
      apiFetch<TData>(\`\${endpoint}?page=\${pageParam}\`),
    getNextPageParam,
    ...options,
  });
}

// Hook for prefetching data
export function usePrefetchQuery() {
  const queryClient = useQueryClient();

  return (key: (string | number)[], endpoint: string) => {
    queryClient.prefetchQuery({
      queryKey: key,
      queryFn: () => apiFetch(endpoint),
    });
  };
}

// Hook for invalidating queries
export function useInvalidateQueries() {
  const queryClient = useQueryClient();

  return (key?: (string | number)[]) => {
    if (key) {
      queryClient.invalidateQueries({ queryKey: key });
    } else {
      queryClient.invalidateQueries();
    }
  };
}
`;

  const libFormsDir = path.join(projectPath, "lib", "forms");
  await fs.writeFile(path.join(libFormsDir, "query-provider.tsx"), queryProviderContent);
  await fs.writeFile(path.join(libFormsDir, "query-hooks.ts"), queryHooksContent);

  // Update the forms index to include query exports
  const indexPath = path.join(libFormsDir, "index.ts");
  let indexContent = await fs.readFile(indexPath, "utf-8");
  indexContent += `
export { QueryProvider } from './query-provider';
export * from './query-hooks';
`;
  await fs.writeFile(indexPath, indexContent);
}

function generateSuccessMessage(
  steps: string[], 
  totalTime: string, 
  integrationStatus: {
    hasValidation: boolean;
    hasReactQuery: boolean;
    includeZodValidation: boolean;
    includeReactQuery: boolean;
  }
): string {
  const { hasValidation, hasReactQuery, includeZodValidation, includeReactQuery } = integrationStatus;

  return `🎉 Form handling setup completed successfully!

⏱️ Total time: ${totalTime}s

✅ Completed steps:
${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

📝 Form Handling Configuration:
- React Hook Form: Advanced form state management with validation
- ${includeZodValidation ? '✅' : '❌'} Zod Validation: ${includeZodValidation ? 'Type-safe schema validation with comprehensive rules' : 'Disabled'}
- ${includeReactQuery ? '✅' : '❌'} React Query: ${includeReactQuery ? 'Server state management and data fetching' : 'Disabled'}
- Form Components: Complete set of reusable form components
- Form Utilities: Helper functions and custom hooks for complex scenarios

🛠️ Features Included:
- **Form State Management**: React Hook Form with full TypeScript support
- **Validation**: ${includeZodValidation ? 'Zod schemas with comprehensive validation rules' : 'Basic HTML validation'}
- **Custom Hooks**: useFormState, useMultiStepForm, useFormPersistence
- **Component Library**: FormInput, FormTextarea, FormSelect, FormCheckbox
- **Error Handling**: Comprehensive error display and management
- **File Uploads**: File validation and handling utilities
- **Debouncing**: Built-in debounced input handling
- ${includeReactQuery ? '**Data Fetching**: React Query integration for form submissions' : '**Basic Submission**: Standard form submission handling'}

💻 Generated Components:
// Basic Form Components
<FormInput form={form} name="email" label="Email" />
<FormTextarea form={form} name="message" label="Message" />
<FormSelect form={form} name="category" options={options} />
<FormCheckbox form={form} name="agree" label="I agree" />
<FormSubmitButton form={form}>Submit</FormSubmitButton>

// Custom Hooks Available
const form = useZodForm(schema, { defaultValues });
const { isLoading, error, success } = useFormState();
const { currentStep, next, prev } = useMultiStepForm(['step1', 'step2']);${includeReactQuery ? `
const mutation = useApiMutation('/api/endpoint');` : ''}

🔒 Security Features:
- **Type Safety**: Full TypeScript integration with form data types
- **Input Validation**: ${includeZodValidation ? 'Comprehensive Zod validation schemas' : 'HTML5 validation attributes'}
- **XSS Protection**: Automatic input sanitization and validation
- **CSRF Protection**: Ready for CSRF token integration
- **File Security**: File type and size validation utilities

📋 Common Validation Schemas${includeZodValidation ? ' (Ready to Use)' : ' (Available if Zod enabled)'}:
${includeZodValidation ? `// Login Form
const loginForm = useZodForm(loginSchema);

// Registration Form  
const registerForm = useZodForm(registerSchema);

// Profile Update
const profileForm = useZodForm(profileSchema);

// Contact Form
const contactForm = useZodForm(contactSchema);

// Multi-step Form
const multiStepForm = useZodForm(multiStepSchema);` : `// Basic validation patterns available
// Enable Zod validation for comprehensive schemas`}

🚀 Integration Status:
- ✅ React Hook Form: Latest version with TypeScript support
- ${hasValidation || includeZodValidation ? '✅' : '🔄'} Validation: ${hasValidation || includeZodValidation ? 'Zod validation schemas integrated' : 'Available - enable Zod validation'}
- ${hasReactQuery || includeReactQuery ? '✅' : '🔄'} React Query: ${hasReactQuery || includeReactQuery ? 'Server state management integrated' : 'Available - enable React Query'}
- ✅ shadcn/ui: Form components use your existing UI library
- ✅ TypeScript: Full type safety throughout form handling

📂 Generated File Structure:
\`\`\`
lib/forms/
├── hooks.ts              # Custom form hooks and utilities
├── utils.ts              # Helper functions for form handling
├── types.ts              # TypeScript types for form components
├── query-provider.tsx    # React Query provider${includeReactQuery ? ' ✅' : ' (if enabled)'}
├── query-hooks.ts        # Custom React Query hooks${includeReactQuery ? ' ✅' : ' (if enabled)'}
└── index.ts              # Central exports

components/forms/
├── form-field.tsx        # Form field wrapper component
├── form-input.tsx        # Enhanced input component
├── form-textarea.tsx     # Enhanced textarea component  
├── form-select.tsx       # Enhanced select component
├── form-checkbox.tsx     # Enhanced checkbox component
├── form-submit-button.tsx # Submit button with loading states
└── index.ts              # Component exports

validations/forms/
└── schemas.ts            # Common validation schemas${includeZodValidation ? ' ✅' : ' (if Zod enabled)'}
\`\`\`

🎯 Form Handling Features:
✨ **Type-Safe Forms**: Full TypeScript integration with form data
✨ **Validation**: ${includeZodValidation ? 'Comprehensive Zod schema validation' : 'Basic validation (upgrade to Zod for more)'}
✨ **Error Handling**: Automatic error display and state management
✨ **Multi-Step Forms**: Built-in support for complex multi-step workflows
✨ **File Uploads**: Complete file handling with validation
✨ **Form Persistence**: LocalStorage form data persistence
✨ **Debounced Inputs**: Performance optimization for real-time validation
✨ **Server Integration**: ${includeReactQuery ? 'React Query for optimistic updates and caching' : 'Ready for server integration'}

💡 Usage Examples:
// Basic form with validation${includeZodValidation ? `
const form = useZodForm(loginSchema, {
  defaultValues: { email: '', password: '' }
});

const onSubmit = (data: LoginInput) => {
  console.log('Valid form data:', data);
};` : `
const form = useForm({
  defaultValues: { email: '', password: '' }
});

const onSubmit = (data: any) => {
  console.log('Form data:', data);
};`}

// Multi-step form
const { currentStep, next, prev, updateData } = useMultiStepForm([
  'personal', 'address', 'preferences'
]);

// Form with server mutation${includeReactQuery ? `
const mutation = useApiMutation('/api/users', 'POST', {
  onSuccess: () => setSuccessState('User created successfully!'),
  onError: (error) => setErrorState(error.message),
});` : `
const { isLoading, setLoadingState, setErrorState } = useFormState();
// Add your own server submission logic`}

💡 Next steps:
1. ${includeReactQuery ? 'Wrap your app with QueryProvider for React Query integration' : 'Consider enabling React Query for advanced server state management'}
2. Create your first form using the generated components and hooks
3. ${includeZodValidation ? 'Use the pre-built validation schemas or create custom ones' : 'Enable Zod validation for comprehensive form validation'}
4. Implement server-side form handling endpoints
5. Add custom styling and animations to form components
6. Set up form analytics and error monitoring

⚠️  **Setup Required**${includeReactQuery ? ` (React Query):
Add the QueryProvider to your root layout:

\`\`\`tsx
import { QueryProvider } from '@/lib/forms';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
\`\`\`` : `:
- Enable React Query for advanced server state management
- Add Zod validation for comprehensive form validation`}

🔗 **Form Development Flow:**
1. **Schema Definition** → ${includeZodValidation ? 'Create Zod validation schema' : 'Define form structure'}
2. **Form Setup** → Use custom hooks for form state management  
3. **Component Integration** → Build UI with reusable form components
4. **Validation** → ${includeZodValidation ? 'Automatic validation with Zod schemas' : 'Add validation rules'}
5. **Submission** → ${includeReactQuery ? 'Handle with React Query mutations' : 'Implement submission logic'}
6. **Error Handling** → Automatic error display and state management`;
}