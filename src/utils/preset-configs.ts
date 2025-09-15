/**
 * @fileoverview Preset Configurations for Next.js Project Setup
 * @description Pre-defined feature combinations for common use cases
 * Provides curated presets to improve UX by removing decision paralysis
 */

export interface FeatureConfig {
  core: boolean;
  database: boolean;
  authentication: boolean;
  payments: boolean;
  teamManagement: boolean;
  devExperience: boolean;
  internationalization: boolean;
}

export interface ProjectPreset {
  id: string;
  name: string;
  description: string;
  emoji: string;
  features: FeatureConfig;
  estimatedTime: string;
  complexity: 'simple' | 'moderate' | 'advanced';
  useCase: string;
  includes: string[];
}

export const PROJECT_PRESETS: Record<string, ProjectPreset> = {
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean Next.js starter with essential tools',
    emoji: '🎯',
    features: {
      core: true,
      database: false,
      authentication: false,
      payments: false,
      teamManagement: false,
      devExperience: true,
      internationalization: false
    },
    estimatedTime: '2-3 minutes',
    complexity: 'simple',
    useCase: 'Landing pages, portfolios, simple websites',
    includes: [
      'Next.js 15+ with TypeScript',
      'Tailwind CSS + shadcn/ui components',
      'Biome linting and formatting',
      'Basic testing setup with Vitest'
    ]
  },

  blog: {
    id: 'blog',
    name: 'Blog/Content',
    description: 'Content-focused site with internationalization',
    emoji: '📝',
    features: {
      core: true,
      database: true,
      authentication: false,
      payments: false,
      teamManagement: false,
      devExperience: true,
      internationalization: true
    },
    estimatedTime: '4-6 minutes',
    complexity: 'moderate',
    useCase: 'Blogs, documentation, content sites',
    includes: [
      'All Minimal features',
      'Database with Drizzle ORM',
      'Multi-language support (6 languages)',
      'Content management structure',
      'SEO-optimized routing'
    ]
  },

  dashboard: {
    id: 'dashboard',
    name: 'Dashboard/Admin',
    description: 'Internal tools with authentication and database',
    emoji: '📊',
    features: {
      core: true,
      database: true,
      authentication: true,
      payments: false,
      teamManagement: false,
      devExperience: true,
      internationalization: false
    },
    estimatedTime: '6-8 minutes',
    complexity: 'moderate',
    useCase: 'Admin panels, dashboards, internal tools',
    includes: [
      'All Minimal features',
      'Database with Drizzle ORM',
      'JWT authentication system',
      'Protected routes and middleware',
      'Form handling with validation'
    ]
  },

  startup: {
    id: 'startup',
    name: 'Startup MVP',
    description: 'Complete SaaS foundation without teams',
    emoji: '🚀',
    features: {
      core: true,
      database: true,
      authentication: true,
      payments: true,
      teamManagement: false,
      devExperience: true,
      internationalization: true
    },
    estimatedTime: '8-12 minutes',
    complexity: 'advanced',
    useCase: 'SaaS MVPs, subscription products, online services',
    includes: [
      'All Dashboard features',
      'Stripe payments integration',
      'Customer portal and billing',
      'Multi-language support',
      'Comprehensive testing suite',
      'Git workflow automation'
    ]
  },

  enterprise: {
    id: 'enterprise',
    name: 'Full SaaS',
    description: 'Complete enterprise-ready SaaS platform',
    emoji: '🏢',
    features: {
      core: true,
      database: true,
      authentication: true,
      payments: true,
      teamManagement: true,
      devExperience: true,
      internationalization: true
    },
    estimatedTime: '12-18 minutes',
    complexity: 'advanced',
    useCase: 'Enterprise SaaS, B2B platforms, team collaboration tools',
    includes: [
      'All Startup MVP features',
      'Multi-tenant team management',
      'Role-based permissions',
      'Activity logging and audit trails',
      'Advanced security features',
      'Complete production setup'
    ]
  },

  custom: {
    id: 'custom',
    name: 'Custom',
    description: 'Choose your own feature combination',
    emoji: '🎨',
    features: {
      core: true,
      database: false,
      authentication: false,
      payments: false,
      teamManagement: false,
      devExperience: false,
      internationalization: false
    },
    estimatedTime: 'Variable',
    complexity: 'simple',
    useCase: 'Specific requirements, unique combinations',
    includes: [
      'Core Next.js setup',
      'Pick and choose additional features'
    ]
  }
};

/**
 * Get preset configuration by ID
 */
export function getPreset(presetId: string): ProjectPreset | null {
  return PROJECT_PRESETS[presetId] || null;
}

/**
 * Get all available presets
 */
export function getAllPresets(): ProjectPreset[] {
  return Object.values(PROJECT_PRESETS);
}

/**
 * Get presets filtered by complexity
 */
export function getPresetsByComplexity(complexity: 'simple' | 'moderate' | 'advanced'): ProjectPreset[] {
  return getAllPresets().filter(preset => preset.complexity === complexity);
}

/**
 * Validate preset features for dependencies
 */
export function validatePresetFeatures(features: FeatureConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Teams require both database and authentication
  if (features.teamManagement && (!features.database || !features.authentication)) {
    errors.push('Team management requires both database and authentication');
  }

  // Payments require authentication
  if (features.payments && !features.authentication) {
    errors.push('Payments require authentication');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get recommended presets based on use case keywords
 */
export function getRecommendedPresets(keywords: string[]): ProjectPreset[] {
  const lowercaseKeywords = keywords.map(k => k.toLowerCase());
  
  return getAllPresets().filter(preset => {
    const searchText = `${preset.name} ${preset.description} ${preset.useCase}`.toLowerCase();
    return lowercaseKeywords.some(keyword => searchText.includes(keyword));
  });
}

/**
 * Calculate estimated setup time for custom feature combination
 */
export function estimateSetupTime(features: FeatureConfig): string {
  let baseTime = 2; // Core setup time in minutes
  
  if (features.database) baseTime += 2;
  if (features.authentication) baseTime += 3;
  if (features.payments) baseTime += 4;
  if (features.teamManagement) baseTime += 3;
  if (features.devExperience) baseTime += 2;
  if (features.internationalization) baseTime += 3;

  const maxTime = Math.ceil(baseTime * 1.5); // Account for variability
  
  if (baseTime <= 3) return `${baseTime}-${maxTime} minutes`;
  if (baseTime <= 8) return `${baseTime}-${maxTime} minutes`;
  return `${baseTime}-${maxTime} minutes`;
}