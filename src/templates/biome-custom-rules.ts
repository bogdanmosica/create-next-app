/**
 * @fileoverview Custom Biome GritQL Rules Template
 * @description Custom linting rules for React/Next.js projects to enforce best practices
 * This file contains custom GritQL rules that discourage hardcoded lists and promote data-driven patterns
 */

export const biomeCustomRulesTemplate = `language js(typescript,jsx)

# ---------------------------------------------
# Rule: no-hardcoded-select-options (native <select>)
# ---------------------------------------------
\`<select $attrs>$children</select>\` where {
  $children <: contains \`<option $oattrs>$label</option>\` where {
    $label <: or { jsx_text(), \`{ "$_" }\` }
  },
  $children <: not contains \`{ $arr.map($cb) }\`,
  register_diagnostic(
    span = $children,
    message = "Don't hardcode <option> items. Define a data array and render with .map(...)."
  )
}

# ---------------------------------------------
# Rule: no-hardcoded-list-items (native <ul>/<ol>)
# ---------------------------------------------
\`<$listTag $attrs>$children</$listTag>\` where {
  $listTag <: or { \`ul\`, \`ol\` },
  $children <: contains \`<li $liattrs>$label</li>\` where {
    $label <: or { jsx_text(), \`{ "$_" }\` }
  },
  $children <: not contains \`{ $arr.map($cb) }\`,
  register_diagnostic(
    span = $children,
    message = "Don't hardcode <li> items. Define a data array and render with .map(...)."
  )
}

# ---------------------------------------------
# Rule: no-hardcoded-option-values (native <option>)
# ---------------------------------------------
\`<option $attrs>$label</option>\` where {
  $attrs <: contains \`value=$val\` where { $val <: or { \`"$_"\`, \`{ "$_" }\` } },
  $label <: or { jsx_text(), \`{ "$_" }\` },
  not within \`{ $arr.map($cb) }\`,
  register_diagnostic(
    span = $attrs,
    message = "Avoid hardcoded option value/label pairs. Use constants + items array and map."
  )
}

# =================================================
# SHADCN / RADIX-POWERED SELECT
# =================================================
# Structure (from docs):
# <Select ...>
#   <SelectTrigger>...</SelectTrigger>
#   <SelectContent>
#     <SelectGroup>
#       <SelectItem value="apple">Apple</SelectItem>
#       ...
#     </SelectGroup>
#   </SelectContent>
# </Select>
# We flag literal <SelectItem> labels/values when not rendered via .map(...)
# Docs: ui.shadcn.com/docs/components/select
# =================================================

# ---------------------------------------------
# Rule: no-hardcoded-shadcn-select-items (labels)
# ---------------------------------------------
\`<SelectContent $cattrs>$content</SelectContent>\` where {
  # Has at least one literal <SelectItem> child somewhere inside
  $content <: contains \`<SelectItem $iattrs>$label</SelectItem>\` where {
    $label <: or { jsx_text(), \`{ "$_" }\` }
  },

  # Not already rendering items with .map(...)
  $content <: not contains \`{ $arr.map($cb) }\`,

  register_diagnostic(
    span = $content,
    message = "Don't hardcode <SelectItem> labels in shadcn/ui Select. Map over a data array."
  )
}

# ---------------------------------------------
# Rule: no-hardcoded-shadcn-select-values (value attr)
# ---------------------------------------------
\`<SelectItem $attrs>$label</SelectItem>\` where {
  $attrs <: contains \`value=$val\` where { $val <: or { \`"$_"\`, \`{ "$_" }\` } },
  $label <: or { jsx_text(), \`{ "$_" }\` },
  not within \`{ $arr.map($cb) }\`,
  register_diagnostic(
    span = $attrs,
    message = "Avoid hardcoded <SelectItem value> with literal label. Use constants + items array and map."
  )
}

# ---------------------------------------------
# (Optional) Rule: no-literal-shadcn-select-placeholder
# Encourages deriving placeholders from data/enum if you want to be strict.
# ---------------------------------------------
\`<SelectValue $attrs />\` where {
  $attrs <: contains \`placeholder=$ph\` where { $ph <: or { \`"$_"\`, \`{ "$_" }\` } },
  not within \`{ $arr.map($cb) }\`,
  register_diagnostic(
    span = $attrs,
    message = "Consider avoiding literal placeholders; prefer shared constants when applicable."
  )
}
`;

export const biomeCustomRulesReadmeTemplate = `# Custom Biome GritQL Rules

This directory contains custom linting rules for your Next.js SaaS application using Biome's GritQL pattern matching.

## Rules Overview

### Native HTML Elements

#### no-hardcoded-select-options
- **Purpose**: Prevents hardcoded \`<option>\` elements in \`<select>\`
- **Recommendation**: Use data arrays with \`.map()\` for dynamic options
- **Example**: Instead of hardcoded options, use \`{options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}\`

#### no-hardcoded-list-items
- **Purpose**: Prevents hardcoded \`<li>\` elements in \`<ul>\`/\`<ol>\`
- **Recommendation**: Use data arrays with \`.map()\` for dynamic lists
- **Example**: Instead of hardcoded list items, use \`{items.map(item => <li key={item.id}>{item.name}</li>)}\`

#### no-hardcoded-option-values
- **Purpose**: Prevents hardcoded value/label pairs in \`<option>\` elements
- **Recommendation**: Use constants and data arrays
- **Example**: Define option constants and map over them

### shadcn/ui Components

#### no-hardcoded-shadcn-select-items
- **Purpose**: Prevents hardcoded \`<SelectItem>\` elements in shadcn/ui Select components
- **Recommendation**: Use data arrays with \`.map()\` for dynamic select items
- **Example**: \`{selectOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}\`

#### no-hardcoded-shadcn-select-values
- **Purpose**: Prevents hardcoded value attributes in \`<SelectItem>\`
- **Recommendation**: Use constants and data arrays for consistent option management
- **Example**: Define option constants in a separate file and reference them

#### no-literal-shadcn-select-placeholder
- **Purpose**: Encourages using constants for placeholder text
- **Recommendation**: Use shared constants for consistent placeholder text
- **Example**: \`<SelectValue placeholder={PLACEHOLDERS.SELECT_OPTION} />\`

## Benefits

1. **Maintainability**: Centralized data management makes updates easier
2. **Consistency**: Enforces consistent patterns across the codebase
3. **Scalability**: Makes it easier to add/remove options dynamically
4. **Type Safety**: Encourages using TypeScript interfaces for option types
5. **Performance**: Reduces bundle size by eliminating duplicate hardcoded strings

## Usage

These rules are automatically integrated into your Biome configuration when using this Next.js SaaS starter template. The rules will provide warnings or errors when hardcoded patterns are detected.

## Future Compatibility

These rules are written in GritQL syntax and are prepared for Biome's evolving plugin system. As Biome's plugin capabilities mature, these rules can be easily integrated into the official linting process.
`;