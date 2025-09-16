# create-next-app Constitution

## Project Mission
**This project exists solely to scaffold complete, functional Next.js applications from curated templates.** Every feature, tool, and process must serve this singular purpose: generating production-ready Next.js projects that build successfully and include all necessary components.

## Core Principles

### I. Template-Driven Architecture
Every feature is implemented as a reusable template that generates working Next.js code. Templates must be self-contained, independently testable, and produce buildable applications.

**Definition**: A template is a code generation unit that creates specific Next.js functionality (auth, payments, database, etc.). Templates must generate valid TypeScript/Next.js code, include all dependencies, and result in applications that build without errors.

### II. Build-First Testing (NON-NEGOTIABLE)
Every template and feature MUST be validated by generating a complete Next.js project and successfully building it. No code is considered working until it produces a buildable application.

**Build Testing Requirements**: 
- Generate complete Next.js project using the template
- Run `pnpm build` and `pnpm type-check` successfully
- Verify all dependencies resolve and TypeScript compiles
- Test in fresh environment (no existing node_modules)
- Document any missing templates or incomplete integrations discovered

### III. Template Completeness Validation
Continuously identify and fill template gaps. Every Next.js feature combination must be covered by templates that work together seamlessly.

**Gap Analysis Process**:
- Audit generated projects for missing functionality
- Test all template combinations for integration issues
- Maintain template dependency matrix
- Prioritize templates based on real-world Next.js usage patterns

### IV. CLI Interface for Scaffolding
All scaffolding functionality exposed via CLI. Focus on project generation commands that create complete, working Next.js applications.

**Implementation**: CLI commands generate projects, not individual files. Each command creates a full application structure that builds successfully. Support preset combinations and custom feature selection.

### V. Next.js-First Design
All decisions prioritize Next.js ecosystem compatibility and best practices. Templates must follow current Next.js conventions and work with the latest stable version.

**Next.js Standards**:
- App Router architecture (not Pages Router)
- TypeScript throughout with proper type definitions
- Modern React patterns (Server Components, Client Components)
- Next.js-optimized folder structure and file conventions
- Compatible with Vercel deployment and other hosting platforms

### VI. Current Documentation Requirement
When creating templates involving new packages or technologies, AI models MUST consult current official documentation to ensure accuracy and latest best practices.

**Documentation Sources Required**:
- Official package documentation (npm, GitHub README, official websites)
- Next.js official documentation for integration patterns
- TypeScript documentation for type definitions
- Current API references and migration guides
- Latest version compatibility matrices

**Implementation**: Before generating code for new packages, verify current syntax, breaking changes, and recommended usage patterns from official sources. Document the documentation sources used and version numbers referenced.

## Technology Stack & Constraints

### Required Technologies
- **Node.js**: Minimum version 18.17.0 LTS or higher
- **TypeScript**: Version 5.0+ with strict mode enabled
- **Next.js**: Latest stable version (default framework for app generation)
- **Package Management**: pnpm exclusively (no npm/yarn in CI/CD)

### Development Environment
- **VS Code**: Version 1.80+ with required extensions: TypeScript, Biome, GitLens
- **Cross-Platform**: Code must run on Windows 10+, macOS 12+, Linux (Ubuntu 20.04+)
- **Git**: Version 2.34+ with signed commits required for main branch

### TypeScript Configuration
- Strict mode enforced: `noImplicitAny`, `strictNullChecks`, `noImplicitReturns`
- ES2022 target minimum
- Path mapping configured for clean imports
- Declaration files required for all exported APIs

### Dependencies & Security
- All dependencies declared in `package.json` with exact versions for production
- Security audit required: no high/critical vulnerabilities
- Licensing: MIT, Apache-2.0, BSD-3-Clause only (no GPL/AGPL)
- Maximum dependency depth: 5 levels to avoid deep dependency hell

## Development Workflow & Quality Gates

### Template Review Requirements
- **Generated project validation**: Every template change requires building a complete Next.js project
- **Build verification**: `pnpm build`, `pnpm type-check`, and `pnpm lint` must pass
- **Template integration testing**: Verify templates work together (auth + database + payments)
- **Missing template identification**: Document any gaps discovered during testing
- **Documentation verification**: For new packages, verify against current official documentation
- **Version compatibility**: Ensure all package versions work together and with Next.js

### AI Model Requirements for Template Creation
- **Documentation consultation**: MUST reference current official docs for new packages
- **Version verification**: Check latest stable versions and compatibility
- **Breaking change awareness**: Review recent releases for breaking changes
- **Best practice adoption**: Follow current recommended patterns, not outdated examples
- **Source attribution**: Document which documentation sources and versions were referenced

### Scaffolding Quality Gates
- **Project generation tests**: Generate projects with all template combinations
- **Build success verification**: All generated projects must build without errors
- **Template completeness audit**: Regular review for missing Next.js patterns/features
- **Real-world validation**: Generated projects tested in actual deployment scenarios

### Documentation Standards
- **Template documentation**: Each template documented with generated code examples
- **Build instructions**: Clear setup steps for generated projects
- **Integration guides**: How templates work together in combined scenarios
- **Gap reports**: Document missing templates and prioritization rationale

### Template Quality Standards
- **Code generation**: Generated code follows Next.js best practices and conventions
- **Dependency management**: All required packages included with correct versions
- **Type safety**: Generated TypeScript code compiles without errors or warnings
- **Build optimization**: Generated projects optimize for production builds
- **Documentation currency**: New package integrations based on latest official documentation
- **API accuracy**: Generated code uses current API syntax and recommended patterns

## Governance & Enforcement

### Constitutional Authority
Constitution supersedes all other practices and documentation. In case of conflicts, constitutional principles take precedence over convenience or legacy practices.

### Amendment Process
- **Proposal**: Written amendment with rationale, impact analysis, and migration plan
- **Review**: Minimum 7-day comment period with all team members
- **Approval**: Unanimous consent for core principles, majority vote for implementation details
- **Implementation**: Automated tooling updates, documentation synchronization, team training

### Enforcement Mechanisms
- **Automated validation**: Constitutional compliance checks in CI/CD pipeline
- **Review checklist**: Constitutional compliance mandatory item in all PR reviews
- **Violation reporting**: Anonymous reporting system for constitutional violations
- **Escalation path**: Team lead → project owner → architectural review board

### Compliance Tooling
- **Pre-commit hooks**: Enforce formatting, testing, and basic quality standards
- **CI/CD gates**: Block merges that violate constitutional requirements
- **Dashboard**: Real-time constitutional compliance metrics and violation tracking
- **Audit trail**: All constitutional violations logged with remediation actions

### Violation Consequences
- **Minor violations**: Automated fix suggestions and re-review requirement
- **Major violations**: Merge blocking, mandatory constitutional training
- **Repeated violations**: Escalation to project leadership for process review
- **Emergency overrides**: Documented justification required, post-incident review mandatory

**Version**: 1.0.0 | **Ratified**: 2025-09-15 | **Last Amended**: 2025-09-15