# Claude AI Coding Guidelines for Next.js Scaffolding MCP

## Constitutional Authority
**CRITICAL**: This document implements the official **`.specify/memory/constitution.md`** file. All development must strictly follow the constitutional principles### Claude Memory and Context Management

### Constitutional Awareness Required
Maintain awareness of:
- **Constitutional file location**: `.specify/memory/constitution.md`
- **Constitutional principles** and their specific requirements
- **Constitutional enforcement mechanisms** and violation consequences
- **Recent constitutional amendments** and implementation deadlines
- **Constitutional compliance status** of current work

### Session Context
Maintain awareness of:
- **Current constitutional principles** and their requirements
- **Recent template changes** and their build validation status
- **Discovered template gaps** and their priority
- **Documentation sources** consulted for accuracy
- **Constitutional compliance** of all development activities

### Handoff Protocol
When transitioning between sessions:
1. **Reference constitution file** - Check `.specify/memory/constitution.md` for any updates
2. **Document constitutional compliance** status of current template development
3. **List any pending build validations** required by constitutional principles
4. **Note template gaps discovered** but not yet addressed per constitutional requirements
5. **Reference documentation sources** used for new packages (constitutional requirement)
6. **Verify constitutional enforcement** - Check if any violations need addressing

### Constitutional Violations - Immediate Action Required
If any constitutional violation is discovered:
1. **Stop current work** - Constitutional compliance is non-negotiable
2. **Document violation** - Note which constitutional principle was violated
3. **Implement fix** - Address violation before continuing
4. **Validate compliance** - Ensure fix meets constitutional requirements
5. **Update documentation** - Record violation and resolution for audit trail

**Constitutional Authority**: `.specify/memory/constitution.md` supersedes all other practices. When in doubt, consult the constitution first.

This ensures constitutional compliance and continuous improvement of the Next.js scaffolding capabilities.document.

### Constitutional Reference
- **Primary Document**: `.specify/memory/constitution.md`
- **Constitutional Version**: 1.0.0 (Ratified: 2025-09-15)
- **Last Amendment**: 2025-09-15
- **Authority**: Constitution supersedes all other practices and documentation

### Constitutional Hierarchy
1. **`.specify/memory/constitution.md`** - Primary authority (NON-NEGOTIABLE)
2. **`CLAUDE.md`** - Claude-specific implementation of constitutional principles
3. **`README.md`** - User-facing documentation
4. **`how-to.md`** - Runtime development guidance

**In case of conflicts**: Constitutional principles take precedence over convenience or legacy practices.

## Constitutional Alignment
This document provides Claude-specific guidance for implementing the **Next.js Scaffolding MCP Constitution**. All work must strictly adhere to constitutional principles, particularly the **Build-First Testing** requirement and **Template-Driven Architecture**.

## Constitutional Requirements Summary
**From `.specify/memory/constitution.md`**:

### Core Constitutional Principles (Must Follow)
1. **Template-Driven Architecture** - Every feature as reusable template generating working Next.js code
2. **Build-First Testing (NON-NEGOTIABLE)** - Every template validated by building complete Next.js project
3. **Template Completeness Validation** - Continuously identify and fill template gaps
4. **CLI Interface for Scaffolding** - Generate projects, not individual files
5. **Next.js-First Design** - App Router, TypeScript, modern React patterns
6. **Current Documentation Requirement** - MUST consult current official docs for new packages

### Constitutional Enforcement
- **Automated validation**: Constitutional compliance checks in CI/CD
- **Review checklist**: Constitutional compliance mandatory in all PRs
- **Violation consequences**: Merge blocking, mandatory training, escalation
- **Emergency overrides**: Documented justification + post-incident review required

**Read the full constitution**: `.specify/memory/constitution.md` for complete details and implementation requirements.

## Project Mission Understanding
**Critical**: This project exists solely to scaffold complete, functional Next.js applications from curated templates. Every code change, template modification, or feature addition must:
1. **Generate buildable Next.js projects**
2. **Fill template gaps** in the scaffolding ecosystem
3. **Follow current Next.js best practices**
4. **Consult current documentation** for new packages

## Constitution-First Development Process

### 1. Template-Driven Architecture (Constitutional Principle I)
When working on any feature:
- **Create reusable templates** that generate working Next.js code
- **Templates must be self-contained** and independently testable
- **Each template** generates specific Next.js functionality (auth, payments, database, etc.)
- **Generated code** must compile without TypeScript errors

**Example**: When adding a new authentication provider, create a complete template that generates all required files, configurations, and dependencies.

### 2. Build-First Testing (Constitutional Principle II - NON-NEGOTIABLE)
**Before any code is considered complete:**

```bash
# MANDATORY testing process for every change
1. Generate complete Next.js project using the template
2. cd generated-project && pnpm install
3. pnpm build && pnpm type-check  # MUST pass
4. pnpm lint                     # MUST pass
5. Document any missing templates discovered
```

**No exceptions**: Code changes are not complete until they produce buildable applications.

### 3. Current Documentation Requirement (Constitutional Principle VI)
**For any new packages or technologies:**
- **MUST consult current official documentation** before generating code
- **Required sources**: Official package docs, Next.js docs, TypeScript docs
- **Document which sources** and versions were referenced
- **Verify latest API syntax** and recommended patterns

**Implementation**: When Claude encounters new packages, explicitly fetch and reference current documentation.

## Claude-Specific Coding Guidelines

### Code Generation Standards
Following constitutional **Next.js-First Design**:

```typescript
// ✅ CORRECT - Generated Next.js app code
import { Button } from "@/components/ui/button";
import { db } from "@/libs/db";
import { NextRequest, NextResponse } from "next/server";

// ✅ CORRECT - MCP Server code (this repo)
import { loadTemplate } from "../utils/template-loader.js";
import { middlewareTemplate } from "../templates/middleware-template.js";
```

### Template Creation Process

#### Step 1: Constitutional Compliance Check
Before creating any template:
- [ ] Will this generate buildable Next.js code?
- [ ] Does this fill a real template gap?
- [ ] Have I consulted current documentation for new packages?
- [ ] Does this follow App Router architecture?

#### Step 2: Template Implementation
```typescript
/**
 * @fileoverview [Feature] Template Generator
 * @description Generates [specific functionality] for Next.js applications
 * @constitutional_compliance Build-First Testing Required
 * @documentation_sources [List official docs consulted]
 */

export async function create[Feature]Template(projectPath: string): Promise<void> {
  // Implementation that generates complete, buildable code
}
```

#### Step 3: Build Validation
```typescript
/**
 * CONSTITUTIONAL REQUIREMENT: Every template must be validated by:
 * 1. Generating complete Next.js project
 * 2. Running pnpm build successfully
 * 3. Verifying TypeScript compilation
 * 4. Testing in fresh environment
 */
```

### Template Gap Analysis
Following constitutional **Template Completeness Validation**:

When working on the project, continuously identify:
- **Missing Next.js patterns** not covered by existing templates
- **Integration issues** between template combinations
- **Real-world usage gaps** in current scaffolding

**Gap Reporting Format**:
```typescript
/**
 * TEMPLATE GAP IDENTIFIED:
 * - Missing: [Description of missing functionality]
 * - Impact: [How this affects generated projects]
 * - Priority: [High/Medium/Low based on Next.js usage patterns]
 * - Constitutional Principle: [Which principle this relates to]
 */
```

## AI Model Documentation Requirements

### For New Package Integration
When Claude encounters new packages or libraries:

1. **Fetch Current Documentation**:
   ```
   "I need to consult the current official documentation for [package] to ensure accuracy."
   ```

2. **Document Sources Used**:
   ```typescript
   /**
    * @documentation_sources
    * - [Package] Official Docs: [URL] (accessed [date])
    * - Next.js Integration Guide: [URL] (version [X])
    * - TypeScript Definitions: [URL] (version [Y])
    */
   ```

3. **Verify API Currency**:
   - Check for recent breaking changes
   - Verify recommended usage patterns
   - Ensure Next.js compatibility

### Code Review Checklist for Claude

Before submitting any code changes:

#### Constitutional Compliance
- [ ] **Build-First Testing**: Generated project builds successfully
- [ ] **Template-Driven**: Code organized as reusable templates
- [ ] **Next.js-First**: Uses App Router and current best practices
- [ ] **Documentation Current**: Consulted official docs for new packages

#### Code Quality
- [ ] **TypeScript**: Strict mode compliance, no `any` types
- [ ] **File Structure**: Follows Next.js conventions
- [ ] **Dependencies**: All required packages included with correct versions
- [ ] **Integration**: Works with existing templates seamlessly

#### Documentation
- [ ] **File Headers**: Proper @fileoverview with constitutional notes
- [ ] **README Updates**: Generated projects include usage documentation
- [ ] **Gap Documentation**: Any discovered template gaps documented

## Template Testing Protocol

### Mandatory Testing Sequence
For every template change or new feature:

```bash
# 1. Generate test project
npx create-nextjs-mcp ./test-project --preset=minimal

# 2. Add your feature
npx create-nextjs-mcp ./test-project --add-feature=[your-feature]

# 3. Constitutional validation
cd test-project
pnpm install
pnpm build      # MUST PASS
pnpm type-check # MUST PASS
pnpm lint       # MUST PASS

# 4. Integration testing
pnpm dev        # Verify starts successfully
curl localhost:3000  # Basic functionality check
```

### Template Combination Testing
Test template interactions:
- **Auth + Database**: User authentication with database persistence
- **Payments + Teams**: Stripe integration with team management
- **i18n + Auth**: Internationalized authentication flows
- **All Features**: Complete SaaS application generation

## Error Handling and Gap Reporting

### When Build Fails
If generated project fails to build:

1. **Immediate Action**: Document the failure
2. **Root Cause**: Identify missing dependencies, configuration issues
3. **Template Gap**: File gap report following constitutional requirements
4. **Fix Implementation**: Create/update templates to resolve issue

### Gap Report Format
```markdown
## Template Gap Report
**Date**: [Current Date]
**Constitutional Principle**: [Which principle this relates to]
**Issue**: [Description of what's missing]
**Impact**: [How this affects scaffolding capability]
**Solution**: [Proposed template additions/modifications]
**Priority**: [Based on real-world Next.js usage patterns]
```

## Claude Memory and Context Management

### Session Context
Maintain awareness of:
- **Current constitutional principles** and their requirements
- **Recent template changes** and their build validation status
- **Discovered template gaps** and their priority
- **Documentation sources** consulted for accuracy

### Handoff Protocol
When transitioning between sessions:
1. **Document current state** of template development
2. **List any pending build validations** required
3. **Note template gaps discovered** but not yet addressed
4. **Reference documentation sources** used for new packages

This ensures constitutional compliance and continuous improvement of the Next.js scaffolding capabilities.

## MCP Server Architecture & Technical Details

### Critical Technical Requirements
This MCP server uses ES modules (`"type": "module"`) and **requires `.js` extensions in ALL imports** for proper module resolution. This is different from the Next.js applications it generates.

### Import Syntax Requirements
```typescript
// ✅ CORRECT - MCP Server imports (this repo)
import { loadTemplate } from "../utils/template-loader.js";
import { middlewareTemplate } from "../templates/middleware-template.js";

// ❌ INCORRECT - Will cause "Cannot find module" errors
import { loadTemplate } from "../utils/template-loader";
import { middlewareTemplate } from "../templates/middleware-template";

// ✅ CORRECT - Generated Next.js app imports (different style)
import { Button } from "@/components/ui/button";
import { db } from "@/libs/db";
```

### MCP Server Structure (This Repository)
- `src/creators/` - Template-driven file generation functions
- `src/runners/` - Command execution utilities for system operations
- `src/templates/` - All templates for generated Next.js applications
- `src/tools/` - MCP tool implementations following constitutional principles
- `src/utils/` - Server utilities for template processing and validation
- `dist/` - Compiled output for MCP server distribution

### Constitutional Architecture Compliance
- **Template-Driven**: Every feature implemented as reusable templates
- **Build-First**: All templates validated by generating buildable projects
- **Next.js-First**: Architecture optimized for App Router and modern patterns
- **Documentation-Current**: New package integrations use latest official docs

## Constitutional Template Generation

### Scaffolded Next.js Application Features
Following constitutional **Template Completeness Validation**, this MCP generates:

- ✅ **Authentication System**: JWT + bcrypt (validated buildable)
- ✅ **Internationalization**: 6 languages with next-intl (App Router compatible)
- ✅ **Enhanced Structure**: Constitutional folder organization
- ✅ **Payment Integration**: Stripe (current API, documented sources)
- ✅ **Team Management**: Multi-tenant with role-based permissions
- ✅ **Database**: PostgreSQL with Drizzle ORM (latest patterns)
- ✅ **Security**: Protected routes middleware (Next.js 15+ compatible)
- ✅ **Development Tools**: Biome, shadcn/ui, TypeScript (current versions)

### Build-Validated Project Structure
Every generated project structure is validated via constitutional **Build-First Testing**:

```
your-app/                    # ✅ Builds successfully with pnpm build
├── app/
│   └── [locale]/            # ✅ Next.js i18n App Router
│       ├── auth/            # ✅ Internationalized auth (current patterns)
│       └── dashboard/       # ✅ Protected routes (middleware validated)
├── actions/                 # ✅ Server actions with proper TypeScript
├── components/
│   ├── auth/                # ✅ Complete forms (React Hook Form + Zod)
│   └── ui/                  # ✅ shadcn/ui (all components, current API)
├── libs/                    # ✅ Constitutional shared utilities
│   ├── env.ts               # ✅ T3 Env validation (latest patterns)
│   ├── db.ts                # ✅ Database connection (Drizzle current API)
│   └── i18n-config.ts       # ✅ Internationalization (next-intl latest)
├── models/                  # ✅ Template-driven database models
│   ├── user.ts              # ✅ JWT support (jose library current API)
│   ├── team.ts              # ✅ Multi-tenant (validated patterns)
│   └── schema.ts            # ✅ Drizzle exports (current syntax)
├── validations/             # ✅ Constitutional validation approach
│   ├── auth.ts              # ✅ Zod schemas (latest patterns)
│   └── team.ts              # ✅ Team validation (current best practices)
└── middleware.ts            # ✅ i18n + protection (Next.js 15+ compatible)
```

### Constitutional Compliance Verification
Each template ensures:
- **TypeScript compilation** without errors or warnings
- **Next.js build success** with `pnpm build && pnpm type-check`
- **Current documentation** patterns for all package integrations
- **Template gap identification** for missing functionality

## Constitutional Development Workflow

### Template Development Process
Following constitutional **Template-Driven Architecture**:

#### 1. Constitutional Pre-Check
- [ ] Will this generate buildable Next.js code?
- [ ] Does this fill a real scaffolding gap?
- [ ] Have I consulted current documentation for new packages?
- [ ] Does this follow App Router architecture patterns?

#### 2. Template Creation
```typescript
/**
 * @fileoverview [Feature] Template Creator
 * @description Generates [specific Next.js functionality]
 * @constitutional_compliance Build-First Testing Required
 * @documentation_sources [List official docs consulted with versions]
 */

export async function create[Feature](projectPath: string): Promise<void> {
  // Constitutional requirement: Generate complete, buildable code
}
```

#### 3. Mandatory Build Validation
```bash
# CONSTITUTIONAL REQUIREMENT: Every template must pass
cd generated-test-project
pnpm install
pnpm build        # MUST PASS - Constitutional Principle II
pnpm type-check   # MUST PASS - TypeScript compliance
pnpm lint         # MUST PASS - Code quality
```

### Available MCP Tools
Constitutional **CLI Interface for Scaffolding**:

```javascript
{
  "name": "create_nextjs_app",
  "description": "Creates complete, buildable Next.js applications",
  "constitutional_compliance": "Template-Driven Architecture + Build-First Testing",
  "inputSchema": {
    "projectPath": "string", // Required: Where to scaffold
    "projectName": "string"  // Optional: Project identifier
  }
}
```

### Template Gap Analysis Protocol
Following constitutional **Template Completeness Validation**:

When working on the MCP:
1. **Audit generated projects** for missing Next.js functionality
2. **Test template combinations** for integration issues
3. **Document template gaps** using constitutional format
4. **Prioritize based on real-world** Next.js usage patterns

### Constitutional Environment Setup
Generated projects require constitutional compliance verification:

```env
# Required for constitutional build validation
POSTGRES_URL="postgresql://user:pass@localhost:5432/db"
AUTH_SECRET="your-secret-key"
STRIPE_SECRET_KEY="sk_test_..." # Current API version required
BASE_URL="http://localhost:3000"
```

### Build Validation Commands
Constitutional **Build-First Testing** verification:

```bash
# Constitutional compliance check sequence
pnpm build      # Primary constitutional requirement
pnpm type-check # TypeScript constitutional compliance
pnpm lint       # Code quality constitutional standard
pnpm dev        # Runtime constitutional verification

# Database constitutional setup
pnpm db:generate  # Generate migrations (Drizzle current patterns)
pnpm db:migrate   # Apply migrations (validated process)
pnpm db:seed      # Seed with constitutional data structure
```

### Technical Stack (Constitutional Standards)
- **Framework**: Next.js 15+ App Router (constitutional Next.js-First Design)
- **Database**: PostgreSQL + Drizzle ORM (current documentation patterns)
- **Authentication**: JWT with jose + bcrypt (latest security practices)
- **Payments**: Stripe v2024-06-20+ API (current documentation required)
- **Internationalization**: next-intl (App Router compatible patterns)
- **UI**: shadcn/ui + Tailwind (current component API)
- **Validation**: Zod (latest patterns and syntax)
- **Linting**: Biome (replaces ESLint per constitutional standards)
- **TypeScript**: Strict mode (constitutional type safety requirement)

## Constitutional File Organization & Maintenance

### Template Organization Standards
Following constitutional **Template-Driven Architecture**:
- **Templates extracted** from inline strings for maintainability
- **Creators are modular** functions for specific Next.js features
- **Runners handle system** command execution with validation
- **Clear separation** between MCP logic and generated app content

### Adding New Constitutional Features
When extending with new functionality:

#### 1. **Constitutional Creator Files**
```typescript
/**
 * @fileoverview [Feature Name] Constitutional Creator
 * @description Generates [specific Next.js functionality] following constitutional principles
 * @constitutional_compliance Template-Driven Architecture + Build-First Testing
 * @documentation_sources [Official docs consulted with versions and dates]
 */

import fs from "fs-extra";
import path from "path";
// Import templates following constitutional standards

export async function create[FeatureName](projectPath: string): Promise<void> {
  // Constitutional requirement: Generate buildable Next.js code
  // Must pass pnpm build && pnpm type-check
}
```

#### 2. **Constitutional Template Files**
```typescript
/**
 * @fileoverview [Feature] Constitutional Templates
 * @description Templates for [Next.js functionality] following current best practices
 * @constitutional_compliance Next.js-First Design + Current Documentation Requirement
 * @documentation_sources [List official docs, versions, access dates]
 */

export const [featureName]Template = `
// Generated code must follow Next.js App Router patterns
// Must compile with TypeScript strict mode
// Must build successfully with pnpm build
`;
```

#### 3. **Constitutional Documentation Requirements**
New folders must include:
- **README.md** - Purpose, constitutional compliance, usage examples
- **File headers** - All .ts files with constitutional compliance notes
- **Parent README updates** - When creating subfolders
- **Build validation proof** - Evidence that generated code builds

#### 4. **Constitutional Folder README Template**
```markdown
# [Folder Name]

**Constitutional Compliance**: [Which principles this folder implements]
**Purpose**: [Brief description following constitutional mission]

## Files

### `filename.ts`
**Constitutional Role**: [How this supports scaffolding mission]
**Key Functions**: [What this generates for Next.js projects]
**Build Requirements**: [What this must produce to pass build validation]
**Documentation Sources**: [Official docs consulted]

## Constitutional Usage

[Examples showing how files support constitutional principles]

## Build Validation

[Evidence that this folder's outputs pass constitutional build testing]
```

#### 5. **Constitutional Update Requirements**
When adding constitutional features, update:
- **CLAUDE.md** - Add to constitutional feature list with build validation
- **Constitution** - If new principles or standards emerge
- **docs/STRUCTURE.md** - Include constitutional compliance notes
- **package.json** - Add keywords reflecting constitutional alignment

### Constitutional Maintenance Checklist

When adding functionality:
- [ ] **Constitutional compliance** verified in file headers
- [ ] **Build-First Testing** completed and documented
- [ ] **Current documentation** consulted and referenced
- [ ] **Template gaps** identified and prioritized
- [ ] **README.md** created with constitutional context
- [ ] **Parent documentation** updated with constitutional notes
- [ ] **Generated app documentation** includes constitutional standards
- [ ] **Integration testing** completed for template combinations

### Constitutional Quality Assurance

#### File Header Standards
```typescript
/**
 * @fileoverview [Constitutional purpose]
 * @description [How this supports scaffolding mission]
 * @constitutional_compliance [Which principles this implements]
 * @build_validation [Evidence of successful build testing]
 * @documentation_sources [Official docs with versions and dates]
 */
```

#### Constitutional Template Standards
- **Group related constitutional** templates in cohesive files
- **Use descriptive exports** that reflect constitutional purpose
- **Include template comments** explaining constitutional compliance
- **Extract complex templates** when they affect build validation

This ensures the MCP maintains constitutional compliance while growing to cover the complete Next.js scaffolding ecosystem.