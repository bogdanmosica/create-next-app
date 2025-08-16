export declare const biomeConfigTemplate: {
    $schema: string;
    vcs: {
        enabled: boolean;
        clientKind: string;
        useIgnoreFile: boolean;
    };
    files: {
        ignoreUnknown: boolean;
        includes: string[];
    };
    formatter: {
        enabled: boolean;
        indentStyle: string;
        indentWidth: number;
    };
    linter: {
        enabled: boolean;
        rules: {
            recommended: boolean;
            style: {
                recommended: boolean;
                useComponentExportOnlyModules: string;
            };
            a11y: string;
            suspicious: {
                recommended: boolean;
                noReactSpecificProps: string;
            };
            complexity: {
                recommended: boolean;
                noExcessiveLinesPerFunction: {
                    level: string;
                    options: {
                        maxLines: number;
                    };
                };
            };
            security: string;
            performance: {
                recommended: boolean;
                noNamespaceImport: string;
                useSolidForComponent: string;
            };
        };
    };
    javascript: {
        formatter: {
            quoteStyle: string;
        };
    };
    assist: {
        enabled: boolean;
        actions: {
            source: {
                organizeImports: {
                    level: string;
                    options: {
                        groups: (string | string[])[];
                    };
                };
            };
        };
    };
};
//# sourceMappingURL=biome-config.d.ts.map