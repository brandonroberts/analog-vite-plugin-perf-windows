import { normalizePath } from 'vite';
import { readFileSync, statSync } from 'node:fs';
import { compileAnalogFile } from './authoring/analog.js';
import { FRONTMATTER_REGEX, TEMPLATE_TAG_REGEX, } from './authoring/constants.js';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import path from 'node:path';
const require = createRequire(import.meta.url);
export function augmentHostWithResources(host, transform, options) {
    const ts = require('typescript');
    const resourceHost = host;
    const resourceCache = new Map();
    const baseGetSourceFile = resourceHost.getSourceFile.bind(resourceHost);
    if (options.supportAnalogFormat) {
        resourceHost.getSourceFile = (fileName, languageVersionOrOptions, onError, ...parameters) => {
            if (fileName.endsWith('.analog.ts') ||
                fileName.endsWith('.agx.ts') ||
                fileName.endsWith('.ag.ts')) {
                const contents = readFileSync(fileName
                    .replace('.analog.ts', '.analog')
                    .replace('.agx.ts', '.agx')
                    .replace('.ag.ts', '.ag'), 'utf-8');
                const source = compileAnalogFile(fileName, contents, options.isProd);
                return ts.createSourceFile(fileName, source, languageVersionOrOptions, onError, ...parameters);
            }
            return baseGetSourceFile.call(resourceHost, fileName, languageVersionOrOptions, onError, ...parameters);
        };
        const baseReadFile = resourceHost.readFile;
        resourceHost.readFile = function (fileName) {
            if (fileName.includes('virtual-analog:')) {
                const filePath = fileName.split('virtual-analog:')[1];
                const fileContent = baseReadFile.call(resourceHost, filePath) ||
                    'No Analog Markdown Content Found';
                // eslint-disable-next-line prefer-const
                const templateContent = TEMPLATE_TAG_REGEX.exec(fileContent)?.pop()?.trim() || '';
                const frontmatterContent = FRONTMATTER_REGEX.exec(fileContent)
                    ?.pop()
                    ?.trim();
                if (frontmatterContent) {
                    return frontmatterContent + '\n\n' + templateContent;
                }
                return templateContent;
            }
            return baseReadFile.call(resourceHost, fileName);
        };
        const fileExists = resourceHost.fileExists;
        resourceHost.fileExists = function (fileName) {
            if (fileName.includes('virtual-analog:') &&
                !fileName.endsWith('analog.d') &&
                !fileName.endsWith('agx.d') &&
                !fileName.endsWith('ag.d')) {
                return true;
            }
            return fileExists.call(resourceHost, fileName);
        };
    }
    resourceHost.readResource = async function (fileName) {
        const filePath = normalizePath(fileName);
        let content = this.readFile(filePath);
        if (content === undefined) {
            throw new Error('Unable to locate component resource: ' + fileName);
        }
        if (fileName.includes('virtual-analog:')) {
            const agxFilePath = fileName.split('virtual-analog:')[1];
            const { mtimeMs } = statSync(agxFilePath);
            const cached = resourceCache.get(agxFilePath);
            if (cached && cached.mtime === mtimeMs) {
                return cached.content;
            }
            for (const transform of options.markdownTemplateTransforms || []) {
                content = String(await transform(content, fileName));
            }
            resourceCache.set(agxFilePath, { content, mtime: mtimeMs });
        }
        return content;
    };
    resourceHost.transformResource = async function (data, context) {
        // Only style resources are supported currently
        if (context.type !== 'style') {
            return null;
        }
        if (options.inlineComponentStyles) {
            const id = createHash('sha256')
                .update(context.containingFile)
                .update(context.className)
                .update(String(context.order))
                .update(data)
                .digest('hex');
            const filename = id + '.' + options.inlineStylesExtension;
            options.inlineComponentStyles.set(filename, data);
            return { content: filename };
        }
        // Resource file only exists for external stylesheets
        const filename = context.resourceFile ??
            `${context.containingFile.replace(/(\.analog|\.ag)?\.ts$/, (...args) => {
                // NOTE: if the original file name contains `.analog`, we turn that into `-analog.css`
                if (args.includes('.analog') ||
                    args.includes('.ag') ||
                    args.includes('.agx')) {
                    return `-analog.${options?.inlineStylesExtension}`;
                }
                return `.${options?.inlineStylesExtension}`;
            })}`;
        let stylesheetResult;
        try {
            stylesheetResult = await transform(data, `${filename}?direct`);
        }
        catch (e) {
            console.error(`${e}`);
        }
        return { content: stylesheetResult?.code || '' };
        return null;
    };
    resourceHost.resourceNameToFileName = function (resourceName, containingFile) {
        const resolvedPath = path.join(path.dirname(containingFile), resourceName);
        // All resource names that have template file extensions are assumed to be templates
        if (!options.externalComponentStyles || !hasStyleExtension(resolvedPath)) {
            return resolvedPath;
        }
        // For external stylesheets, create a unique identifier and store the mapping
        let externalId = options.externalComponentStyles.get(resolvedPath);
        if (externalId === undefined) {
            externalId = createHash('sha256').update(resolvedPath).digest('hex');
        }
        const filename = externalId + path.extname(resolvedPath);
        options.externalComponentStyles.set(filename, resolvedPath);
        return filename;
    };
}
export function augmentProgramWithVersioning(program) {
    const baseGetSourceFiles = program.getSourceFiles;
    program.getSourceFiles = function (...parameters) {
        const files = baseGetSourceFiles(...parameters);
        for (const file of files) {
            if (file.version === undefined) {
                file.version = createHash('sha256').update(file.text).digest('hex');
            }
        }
        return files;
    };
}
export function augmentHostWithCaching(host, cache) {
    const baseGetSourceFile = host.getSourceFile;
    host.getSourceFile = function (fileName, languageVersion, onError, shouldCreateNewSourceFile, ...parameters) {
        if (!shouldCreateNewSourceFile && cache.has(fileName)) {
            return cache.get(fileName);
        }
        const file = baseGetSourceFile.call(host, fileName, languageVersion, onError, true, ...parameters);
        if (file) {
            cache.set(fileName, file);
        }
        return file;
    };
}
export function mergeTransformers(first, second) {
    const result = {};
    if (first.before || second.before) {
        result.before = [...(first.before || []), ...(second.before || [])];
    }
    if (first.after || second.after) {
        result.after = [...(first.after || []), ...(second.after || [])];
    }
    if (first.afterDeclarations || second.afterDeclarations) {
        result.afterDeclarations = [
            ...(first.afterDeclarations || []),
            ...(second.afterDeclarations || []),
        ];
    }
    return result;
}
function hasStyleExtension(file) {
    const extension = path.extname(file).toLowerCase();
    switch (extension) {
        case '.css':
        case '.scss':
            return true;
    }
    return false;
}
//# sourceMappingURL=host.js.map