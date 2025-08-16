export const biomeConfigTemplate = {
  "$schema": "https://biomejs.dev/schemas/2.2.0/schema.json",
  "vcs": {
    "enabled": false,
    "clientKind": "git",
    "useIgnoreFile": false
  },
  "files": {
    "ignoreUnknown": false,
    "includes": [
      "app/**/*",
      "biome.json",
      "package.json",
      "tsconfig.json",
      "!node_modules",
      "!next",
      "!.next",
      "!out",
      "!build"
    ]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": {
        "recommended": true,
        "useComponentExportOnlyModules": "off"
      },
      "a11y": "warn",
      "suspicious": {
        "recommended": true,
        "noReactSpecificProps": "off"
      },
      "complexity": {
        "recommended": true,
        "noExcessiveLinesPerFunction": {
          "level": "warn",
          "options": {
            "maxLines": 120
          }
        }
      },
      "security": "warn",
      "performance": {
        "recommended": true,
        "noNamespaceImport": "off",
        "useSolidForComponent": "off"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double"
    }
  },
  "assist": {
    "enabled": true,
    "actions": {
      "source": {
        "organizeImports": {
          "level": "on",
          "options": {
            "groups": [
              [":PACKAGE:", "react", "next", "next/**"],
              ":BLANK_LINE:",
              "@/actions",
              ":BLANK_LINE:",
              "@/components",
              ":BLANK_LINE:",
              "@/hooks",
              ":BLANK_LINE:",
              "@/lib",
              ":BLANK_LINE:",
              "@/types",
              ":BLANK_LINE:",
              ":PATH:"
            ]
          }
        }
      }
    }
  }
};