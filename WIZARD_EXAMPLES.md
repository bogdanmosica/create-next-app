# 🧙‍♂️ Next.js MCP Wizard Examples

Your MCP now has **multiple ways** to control which packages and features get included!

## 🎯 **How to Control Package Selection**

### **Method 1: Use the Interactive Wizard**
When you want the model to ask you about preferences:

```
Use the setup_nextjs_project_wizard to help me create a Next.js project
```

This will show you all available options and let you choose!

### **Method 2: Be Specific in Your Request**
```
Create a Next.js app with only core features, database, and authentication. 
No payments, team management, or internationalization.
```

### **Method 3: Use JSON Configuration**
```
create_nextjs_app({
  projectPath: "./my-app",
  features: {
    core: true,                    // ✅ Next.js + TypeScript + Tailwind  
    database: true,                // ✅ Drizzle ORM + PostgreSQL
    authentication: true,          // ✅ JWT + login/signup
    payments: false,               // ❌ No Stripe
    teamManagement: false,         // ❌ No team features
    devExperience: true,           // ✅ Testing + linting
    internationalization: false    // ❌ No multi-language
  }
})
```

## 🚀 **Quick Templates**

### **Minimal Project**
```
Create a minimal Next.js app with just core features and shadcn/ui components
```

### **Starter SaaS**
```
Create a Next.js app with core, database, authentication, and testing
```

### **Full Featured SaaS**
```
Create a complete Next.js SaaS app with all features
```

## 🔧 **Individual Tool Control**

You can also use individual tools with specific options:

### **Basic Next.js Setup**
```
create_nextjs_base({
  projectPath: "./my-app", 
  includeShadcn: false,      // Skip shadcn/ui
  includeAllComponents: false // Just basics if shadcn enabled
})
```

### **Testing Suite Options**
```
setup_testing_suite({
  projectPath: "./my-app",
  includeUnitTests: true,    // ✅ Vitest
  includeE2ETests: false,    // ❌ No Playwright  
  includeMocking: true       // ✅ MSW for API mocking
})
```

### **Authentication Options**
```
setup_authentication_jwt({
  projectPath: "./my-app",
  includePasswordHashing: true,  // ✅ bcrypt password hashing
  includeUserManagement: false,  // ❌ No user CRUD
  requireDatabase: false         // ❌ Don't require database
})
```

## 🎭 **Example Conversations**

### **Scenario 1: User wants minimal setup**
**User:** "Create a Next.js app"
**Assistant:** Uses `setup_nextjs_project_wizard` → Shows options → User picks minimal

### **Scenario 2: User knows exactly what they want**
**User:** "Create a Next.js app with authentication and database but no payments"
**Assistant:** Uses `create_nextjs_app` with specific feature flags

### **Scenario 3: User wants to customize each step**
**User:** "Create a basic Next.js app first, then I'll add features later"
**Assistant:** Uses `create_nextjs_base` → User adds features with individual tools

## 🏗️ **Available Tools Summary**

| Tool | Purpose | Key Options |
|------|---------|-------------|
| `setup_nextjs_project_wizard` | 🧙‍♂️ Interactive guidance | Shows all options |
| `create_nextjs_app` | 🚀 Full SaaS creation | Feature flags |
| `create_nextjs_base` | 🏗️ Basic Next.js setup | shadcn/ui options |
| `setup_testing_suite` | 🧪 Add testing | Unit/E2E/Mocking |
| `setup_authentication_jwt` | 🔐 Add auth | Password hashing, user management |
| `setup_stripe_payments` | 💳 Add payments | Subscriptions, one-time |
| `setup_team_management` | 👥 Add teams | Roles, activity logs |
| Plus 8 more specialized tools... | | |

Your MCP now gives complete control over which packages and features get installed! 🎉