import { NgtscProgram } from '@angular/compiler-cli';
import * as ts from 'typescript';
import { Plugin } from 'vite';
import { MarkdownTemplateTransform } from './authoring/markdown-transform.js';
export interface PluginOptions {
    tsconfig?: string;
    workspaceRoot?: string;
    inlineStylesExtension?: string;
    jit?: boolean;
    advanced?: {
        /**
         * Custom TypeScript transformers that are run before Angular compilation
         */
        tsTransformers?: ts.CustomTransformers;
    };
    experimental?: {
        /**
         * Enable experimental support for Analog file extension
         */
        supportAnalogFormat?: boolean | {
            include: string[];
        };
        markdownTemplateTransforms?: MarkdownTemplateTransform[];
    };
    supportedBrowsers?: string[];
    transformFilter?: (code: string, id: string) => boolean;
    /**
     * Additional files to include in compilation
     */
    include?: string[];
    additionalContentDirs?: string[];
    liveReload?: boolean;
    disableTypeChecking?: boolean;
}
export declare function angular(options?: PluginOptions): Plugin[];
export declare function getFileMetadata(program: ts.BuilderProgram, angularCompiler?: NgtscProgram['compiler'], liveReload?: boolean, disableTypeChecking?: boolean): (file: string, stale?: ts.SourceFile) => {
    errors?: undefined;
    warnings?: undefined;
    hmrUpdateCode?: undefined;
    hmrEligible?: undefined;
} | {
    errors: string[];
    warnings: (string | ts.DiagnosticMessageChain)[];
    hmrUpdateCode: string | null | undefined;
    hmrEligible: boolean;
};
/**
 * Checks for vitest run from the command line
 * @returns boolean
 */
export declare function isTestWatchMode(args?: string[]): boolean;
