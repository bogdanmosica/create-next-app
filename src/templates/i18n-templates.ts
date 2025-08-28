/**
 * @fileoverview Internationalization Templates
 * @description Complete i18n setup with next-intl for multi-language support
 * Adapted from Next.js Boilerplate patterns for JWT auth, Biome, and Drizzle setup
 */

// === I18N CONFIGURATION TEMPLATES ===

export const i18nConfigTemplate = `import { getRequestConfig } from 'next-intl/server';
import { routing } from './i18n-routing';

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the \`[locale]\` segment
  let locale = await requestLocale;

  // Ensure that a valid locale is used
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(\`../locales/\${locale}.json\`)).default,
  };
});
`;

export const i18nRoutingTemplate = `import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'es', 'fr', 'de', 'ja', 'zh'],

  // Used when no locale matches
  defaultLocale: 'en',

  // The locale prefix for all routes
  // 'as-needed': Only add locale prefix for non-default locales
  // 'always': Always add locale prefix
  // 'never': Never add locale prefix (single locale setup)
  localePrefix: 'as-needed',

  // Optionally provide custom paths for localized routes
  pathnames: {
    '/': '/',
    '/dashboard': {
      en: '/dashboard',
      es: '/tablero',
      fr: '/tableau-de-bord',
      de: '/dashboard',
      ja: '/ダッシュボード',
      zh: '/仪表板',
    },
    '/auth/signin': {
      en: '/auth/signin',
      es: '/auth/iniciar-sesion',
      fr: '/auth/connexion',
      de: '/auth/anmelden',
      ja: '/auth/ログイン',
      zh: '/auth/登录',
    },
    '/auth/signup': {
      en: '/auth/signup',
      es: '/auth/registrarse',
      fr: '/auth/inscription',
      de: '/auth/registrieren',
      ja: '/auth/登録',
      zh: '/auth/注册',
    },
    '/settings': {
      en: '/settings',
      es: '/configuracion',
      fr: '/parametres',
      de: '/einstellungen',
      ja: '/設定',
      zh: '/设置',
    },
  },
});

export type Pathnames = keyof typeof routing.pathnames;
export type Locale = (typeof routing.locales)[number];
`;

export const i18nNavigationTemplate = `import { createNavigation } from 'next-intl/navigation';
import { routing } from './i18n-routing';

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
`;

export const i18nMiddlewareTemplate = `import createMiddleware from 'next-intl/middleware';
import { routing } from './libs/i18n-routing';

export default createMiddleware(routing);

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(de|en|es|fr|ja|zh)/:path*'],
};
`;

// === LOCALE TEMPLATES ===

export const localeTemplates = {
  en: `{
  "metadata": {
    "title": "SaaS Starter",
    "description": "Complete Next.js SaaS application with authentication, payments, and team management"
  },
  "navigation": {
    "home": "Home",
    "dashboard": "Dashboard",
    "settings": "Settings",
    "teams": "Teams",
    "billing": "Billing",
    "sign_out": "Sign Out"
  },
  "auth": {
    "sign_in": "Sign In",
    "sign_up": "Sign Up",
    "sign_out": "Sign Out",
    "email": "Email",
    "password": "Password",
    "name": "Full Name",
    "confirm_password": "Confirm Password",
    "forgot_password": "Forgot Password?",
    "remember_me": "Remember me",
    "or": "or",
    "already_have_account": "Already have an account?",
    "dont_have_account": "Don't have an account?",
    "create_account": "Create Account",
    "welcome_back": "Welcome back",
    "get_started": "Get started with your free account today",
    "signing_in": "Signing in...",
    "creating_account": "Creating account...",
    "accept_terms": "I accept the {terms} and {privacy}",
    "terms_of_service": "Terms of Service",
    "privacy_policy": "Privacy Policy",
    "account_created": "Account Created!",
    "account_created_description": "Your account has been successfully created. You can now sign in.",
    "sign_in_to_account": "Sign In to Your Account"
  },
  "auth_errors": {
    "invalid_credentials": "Invalid email or password",
    "user_exists": "An account with this email already exists",
    "weak_password": "Password must be at least 8 characters with uppercase, lowercase, and number",
    "required_email": "Please enter a valid email address",
    "required_password": "Password is required",
    "required_name": "Name must be at least 2 characters",
    "required_terms": "You must accept the terms and conditions",
    "unexpected_error": "An unexpected error occurred. Please try again."
  },
  "dashboard": {
    "title": "Dashboard",
    "welcome": "Welcome to your dashboard",
    "recent_activity": "Recent Activity",
    "quick_actions": "Quick Actions",
    "stats": "Statistics",
    "overview": "Overview"
  },
  "teams": {
    "title": "Teams",
    "create_team": "Create Team",
    "team_name": "Team Name",
    "team_slug": "Team Slug",
    "invite_members": "Invite Members",
    "members": "Members",
    "settings": "Settings",
    "leave_team": "Leave Team",
    "delete_team": "Delete Team",
    "role_owner": "Owner",
    "role_admin": "Admin", 
    "role_member": "Member"
  },
  "settings": {
    "title": "Settings",
    "profile": "Profile",
    "account": "Account",
    "security": "Security",
    "notifications": "Notifications",
    "billing": "Billing",
    "save_changes": "Save Changes",
    "cancel": "Cancel"
  },
  "common": {
    "loading": "Loading...",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "create": "Create",
    "update": "Update",
    "confirm": "Confirm",
    "close": "Close",
    "back": "Back",
    "next": "Next",
    "previous": "Previous",
    "search": "Search",
    "filter": "Filter",
    "sort": "Sort",
    "actions": "Actions",
    "status": "Status",
    "date": "Date",
    "name": "Name",
    "email": "Email",
    "role": "Role",
    "active": "Active",
    "inactive": "Inactive",
    "enabled": "Enabled",
    "disabled": "Disabled"
  },
  "validation": {
    "required": "This field is required",
    "invalid_email": "Please enter a valid email address",
    "password_min": "Password must be at least {min} characters",
    "password_requirements": "Password must contain uppercase, lowercase, and number",
    "passwords_match": "Passwords must match",
    "name_min": "Name must be at least {min} characters",
    "name_max": "Name must be less than {max} characters",
    "slug_invalid": "Slug can only contain lowercase letters, numbers, and hyphens"
  },
  "errors": {
    "page_not_found": "Page Not Found",
    "unauthorized": "Unauthorized",
    "forbidden": "Forbidden", 
    "server_error": "Server Error",
    "network_error": "Network Error",
    "try_again": "Please try again",
    "go_home": "Go Home",
    "contact_support": "Contact Support"
  }
}`,

  es: `{
  "metadata": {
    "title": "SaaS Starter",
    "description": "Aplicación SaaS completa de Next.js con autenticación, pagos y gestión de equipos"
  },
  "navigation": {
    "home": "Inicio",
    "dashboard": "Tablero",
    "settings": "Configuración",
    "teams": "Equipos",
    "billing": "Facturación",
    "sign_out": "Cerrar Sesión"
  },
  "auth": {
    "sign_in": "Iniciar Sesión",
    "sign_up": "Registrarse",
    "sign_out": "Cerrar Sesión",
    "email": "Correo Electrónico",
    "password": "Contraseña",
    "name": "Nombre Completo",
    "confirm_password": "Confirmar Contraseña",
    "forgot_password": "¿Olvidaste tu contraseña?",
    "remember_me": "Recordarme",
    "or": "o",
    "already_have_account": "¿Ya tienes una cuenta?",
    "dont_have_account": "¿No tienes una cuenta?",
    "create_account": "Crear Cuenta",
    "welcome_back": "Bienvenido de vuelta",
    "get_started": "Comienza con tu cuenta gratuita hoy",
    "signing_in": "Iniciando sesión...",
    "creating_account": "Creando cuenta...",
    "accept_terms": "Acepto los {terms} y la {privacy}",
    "terms_of_service": "Términos de Servicio",
    "privacy_policy": "Política de Privacidad",
    "account_created": "¡Cuenta Creada!",
    "account_created_description": "Tu cuenta ha sido creada exitosamente. Ahora puedes iniciar sesión.",
    "sign_in_to_account": "Iniciar Sesión en tu Cuenta"
  },
  "auth_errors": {
    "invalid_credentials": "Correo electrónico o contraseña inválidos",
    "user_exists": "Ya existe una cuenta con este correo electrónico",
    "weak_password": "La contraseña debe tener al menos 8 caracteres con mayúsculas, minúsculas y números",
    "required_email": "Por favor ingresa un correo electrónico válido",
    "required_password": "La contraseña es requerida",
    "required_name": "El nombre debe tener al menos 2 caracteres",
    "required_terms": "Debes aceptar los términos y condiciones",
    "unexpected_error": "Ocurrió un error inesperado. Por favor intenta de nuevo."
  },
  "dashboard": {
    "title": "Tablero",
    "welcome": "Bienvenido a tu tablero",
    "recent_activity": "Actividad Reciente",
    "quick_actions": "Acciones Rápidas",
    "stats": "Estadísticas",
    "overview": "Resumen"
  },
  "teams": {
    "title": "Equipos",
    "create_team": "Crear Equipo",
    "team_name": "Nombre del Equipo",
    "team_slug": "Slug del Equipo",
    "invite_members": "Invitar Miembros",
    "members": "Miembros",
    "settings": "Configuración",
    "leave_team": "Salir del Equipo",
    "delete_team": "Eliminar Equipo",
    "role_owner": "Propietario",
    "role_admin": "Administrador",
    "role_member": "Miembro"
  },
  "settings": {
    "title": "Configuración",
    "profile": "Perfil",
    "account": "Cuenta",
    "security": "Seguridad",
    "notifications": "Notificaciones",
    "billing": "Facturación",
    "save_changes": "Guardar Cambios",
    "cancel": "Cancelar"
  },
  "common": {
    "loading": "Cargando...",
    "save": "Guardar",
    "cancel": "Cancelar",
    "delete": "Eliminar",
    "edit": "Editar",
    "create": "Crear",
    "update": "Actualizar",
    "confirm": "Confirmar",
    "close": "Cerrar",
    "back": "Atrás",
    "next": "Siguiente",
    "previous": "Anterior",
    "search": "Buscar",
    "filter": "Filtrar",
    "sort": "Ordenar",
    "actions": "Acciones",
    "status": "Estado",
    "date": "Fecha",
    "name": "Nombre",
    "email": "Correo",
    "role": "Rol",
    "active": "Activo",
    "inactive": "Inactivo",
    "enabled": "Habilitado",
    "disabled": "Deshabilitado"
  },
  "validation": {
    "required": "Este campo es requerido",
    "invalid_email": "Por favor ingresa un correo electrónico válido",
    "password_min": "La contraseña debe tener al menos {min} caracteres",
    "password_requirements": "La contraseña debe contener mayúsculas, minúsculas y números",
    "passwords_match": "Las contraseñas deben coincidir",
    "name_min": "El nombre debe tener al menos {min} caracteres",
    "name_max": "El nombre debe tener menos de {max} caracteres",
    "slug_invalid": "El slug solo puede contener letras minúsculas, números y guiones"
  },
  "errors": {
    "page_not_found": "Página No Encontrada",
    "unauthorized": "No Autorizado",
    "forbidden": "Prohibido",
    "server_error": "Error del Servidor",
    "network_error": "Error de Red",
    "try_again": "Por favor intenta de nuevo",
    "go_home": "Ir al Inicio",
    "contact_support": "Contactar Soporte"
  }
}`,

  fr: `{
  "metadata": {
    "title": "SaaS Starter",
    "description": "Application SaaS Next.js complète avec authentification, paiements et gestion d'équipe"
  },
  "navigation": {
    "home": "Accueil",
    "dashboard": "Tableau de bord",
    "settings": "Paramètres",
    "teams": "Équipes",
    "billing": "Facturation",
    "sign_out": "Se déconnecter"
  },
  "auth": {
    "sign_in": "Se connecter",
    "sign_up": "S'inscrire",
    "sign_out": "Se déconnecter",
    "email": "Email",
    "password": "Mot de passe",
    "name": "Nom complet",
    "confirm_password": "Confirmer le mot de passe",
    "forgot_password": "Mot de passe oublié?",
    "remember_me": "Se souvenir de moi",
    "or": "ou",
    "already_have_account": "Vous avez déjà un compte?",
    "dont_have_account": "Vous n'avez pas de compte?",
    "create_account": "Créer un compte",
    "welcome_back": "Bon retour",
    "get_started": "Commencez avec votre compte gratuit aujourd'hui",
    "signing_in": "Connexion...",
    "creating_account": "Création du compte...",
    "accept_terms": "J'accepte les {terms} et la {privacy}",
    "terms_of_service": "Conditions de service",
    "privacy_policy": "Politique de confidentialité",
    "account_created": "Compte créé!",
    "account_created_description": "Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.",
    "sign_in_to_account": "Se connecter à votre compte"
  },
  "dashboard": {
    "title": "Tableau de bord",
    "welcome": "Bienvenue sur votre tableau de bord",
    "recent_activity": "Activité récente",
    "quick_actions": "Actions rapides",
    "stats": "Statistiques",
    "overview": "Aperçu"
  },
  "common": {
    "loading": "Chargement...",
    "save": "Enregistrer",
    "cancel": "Annuler",
    "delete": "Supprimer",
    "edit": "Modifier",
    "create": "Créer",
    "update": "Mettre à jour",
    "confirm": "Confirmer",
    "close": "Fermer",
    "back": "Retour",
    "next": "Suivant",
    "previous": "Précédent"
  }
}`,
};

// === I18N UTILITY TEMPLATES ===

export const i18nUtilsTemplate = `import { useTranslations } from 'next-intl';

/**
 * Hook for authentication translations
 */
export function useAuthTranslations() {
  const t = useTranslations('auth');
  const tErrors = useTranslations('auth_errors');
  const tValidation = useTranslations('validation');

  return {
    // Auth labels
    signIn: t('sign_in'),
    signUp: t('sign_up'),
    email: t('email'),
    password: t('password'),
    name: t('name'),
    
    // States
    signingIn: t('signing_in'),
    creatingAccount: t('creating_account'),
    
    // Errors
    invalidCredentials: tErrors('invalid_credentials'),
    userExists: tErrors('user_exists'),
    unexpectedError: tErrors('unexpected_error'),
    
    // Validation
    requiredEmail: tValidation('required_email'),
    requiredPassword: tValidation('required_password'),
    requiredName: tValidation('required_name'),
  };
}

/**
 * Hook for navigation translations
 */
export function useNavigationTranslations() {
  const t = useTranslations('navigation');
  
  return {
    home: t('home'),
    dashboard: t('dashboard'),
    settings: t('settings'),
    teams: t('teams'),
    billing: t('billing'),
    signOut: t('sign_out'),
  };
}

/**
 * Hook for common UI translations
 */
export function useCommonTranslations() {
  const t = useTranslations('common');
  
  return {
    loading: t('loading'),
    save: t('save'),
    cancel: t('cancel'),
    delete: t('delete'),
    edit: t('edit'),
    create: t('create'),
    update: t('update'),
    confirm: t('confirm'),
    close: t('close'),
    back: t('back'),
    next: t('next'),
    previous: t('previous'),
  };
}

/**
 * Utility to format interpolated messages
 */
export function formatMessage(
  message: string,
  values: Record<string, string | number>
): string {
  let formatted = message;
  Object.entries(values).forEach(([key, value]) => {
    formatted = formatted.replace(new RegExp(\`{$\{key}}\`, 'g'), String(value));
  });
  return formatted;
}

/**
 * Get supported locales
 */
export const SUPPORTED_LOCALES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
] as const;

export type SupportedLocale = typeof SUPPORTED_LOCALES[number]['code'];
`;

// === NEXT.JS CONFIG INTEGRATION ===

export const nextConfigI18nTemplate = `/** @type {import('next').NextConfig} */
const withNextIntl = require('next-intl/plugin')('./src/libs/i18n-config.ts');

const nextConfig = {
  // Your existing Next.js config
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Add other configurations as needed
};

module.exports = withNextIntl(nextConfig);
`;