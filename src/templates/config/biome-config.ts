/**
 * @fileoverview Biome Configuration Templates
 * @description Templates for Biome linting and formatting configuration
 */

export const biomeConfigTemplate = `{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignoreUnknown": false,
    "ignore": [
      "node_modules/**",
      ".next/**",
      "out/**",
      "dist/**",
      "build/**",
      "coverage/**",
      ".vercel/**",
      "public/**",
      "*.d.ts"
    ]
  },
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf",
    "ignore": [
      "**/*.md",
      "**/*.json",
      "CHANGELOG.md"
    ]
  },
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noExtraBooleanCast": "error",
        "noMultipleSpacesInRegularExpressionLiterals": "error",
        "noStaticOnlyClass": "error",
        "noUselessCatch": "error",
        "noUselessConstructor": "error",
        "noUselessLabel": "error",
        "noUselessRename": "error",
        "noUselessSwitchCase": "error",
        "noVoid": "error",
        "noWith": "error"
      },
      "correctness": {
        "noChildrenProp": "error",
        "noConstAssign": "error",
        "noConstantCondition": "error",
        "noConstructorReturn": "error",
        "noEmptyCharacterClassInRegex": "error",
        "noEmptyPattern": "error",
        "noGlobalObjectCalls": "error",
        "noInvalidConstructorSuper": "error",
        "noInvalidNewBuiltin": "error",
        "noNonoctalDecimalEscape": "error",
        "noPrecisionLoss": "error",
        "noSelfAssign": "error",
        "noSetterReturn": "error",
        "noSwitchDeclarations": "error",
        "noUndeclaredVariables": "error",
        "noUnreachable": "error",
        "noUnreachableSuper": "error",
        "noUnsafeFinally": "error",
        "noUnsafeOptionalChaining": "error",
        "noUnusedLabels": "error",
        "noUnusedVariables": "warn",
        "useArrayLiterals": "off",
        "useExhaustiveDependencies": "warn",
        "useHookAtTopLevel": "error",
        "useIsNan": "error",
        "useValidForDirection": "error",
        "useYield": "error"
      },
      "security": {
        "noDangerouslySetInnerHtml": "error",
        "noGlobalEval": "error"
      },
      "style": {
        "noArguments": "error",
        "noCommaOperator": "error",
        "noDefaultExport": "off",
        "noImplicitBoolean": "off",
        "noInferrableTypes": "off",
        "noNamespace": "error",
        "noNegationElse": "off",
        "noParameterAssign": "error",
        "noRestrictedGlobals": {
          "level": "error",
          "options": {
            "deniedGlobals": ["isFinite", "isNaN"]
          }
        },
        "noShoutyConstants": "off",
        "noUnusedTemplateLiteral": "error",
        "noUselessElse": "error",
        "noVar": "error",
        "useBlockStatements": "off",
        "useCollapsedElseIf": "error",
        "useConst": "error",
        "useDefaultParameterLast": "error",
        "useEnumInitializers": "error",
        "useExponentiationOperator": "error",
        "useFragmentSyntax": "error",
        "useLiteralEnumMembers": "error",
        "useNamingConvention": "off",
        "useNodejsImportProtocol": "error",
        "useNumberNamespace": "error",
        "useNumericLiterals": "error",
        "useSelfClosingElements": "error",
        "useShorthandArrayType": "error",
        "useShorthandAssign": "error",
        "useSingleCaseStatement": "error",
        "useTemplate": "error"
      },
      "suspicious": {
        "noApproximativeNumericConstant": "error",
        "noArrayIndexKey": "error",
        "noAssignInExpressions": "error",
        "noAsyncPromiseExecutor": "error",
        "noCatchAssign": "error",
        "noClassAssign": "error",
        "noCommentText": "error",
        "noCompareNegZero": "error",
        "noConsoleLog": "warn",
        "noConstEnum": "error",
        "noControlCharactersInRegex": "error",
        "noDebugger": "error",
        "noDoubleEquals": "error",
        "noDuplicateCase": "error",
        "noDuplicateClassMembers": "error",
        "noDuplicateObjectKeys": "error",
        "noDuplicateParameters": "error",
        "noEmptyBlockStatements": "error",
        "noExplicitAny": "warn",
        "noFallthroughSwitchClause": "error",
        "noFunctionAssign": "error",
        "noGlobalAssign": "error",
        "noImportAssign": "error",
        "noLabelVar": "error",
        "noMisleadingCharacterClass": "error",
        "noMisleadingInstantiator": "error",
        "noPrototypeBuiltins": "error",
        "noRedeclare": "error",
        "noSelfCompare": "error",
        "noShadowRestrictedNames": "error",
        "noUnsafeDeclarationMerging": "error",
        "noUnsafeNegation": "error",
        "useDefaultSwitchClauseLast": "error",
        "useGetterReturn": "error",
        "useValidTypeof": "error"
      }
    }
  },
  "javascript": {
    "formatter": {
      "jsxQuoteStyle": "double",
      "quoteProperties": "asNeeded",
      "trailingCommas": "es5",
      "semicolons": "always",
      "arrowParentheses": "always",
      "bracketSameLine": false,
      "bracketSpacing": true,
      "attributePosition": "auto"
    }
  },
  "overrides": [
    {
      "include": ["*.ts", "*.tsx"],
      "linter": {
        "rules": {
          "correctness": {
            "noUndeclaredVariables": "off"
          }
        }
      }
    }
  ]
}
`;

export const vscodeSettingsTemplate = `{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.formatOnPaste": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  },
  "[javascript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[javascriptreact]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[json]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[jsonc]": {
    "editor.defaultFormatter": "biomejs.biome"
  }
}
`;
