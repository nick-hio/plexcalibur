import type {
    ApiModule,
    ApiObject,
    Layout,
    LayoutModule,
    PageAsync,
    PageStream,
    PageSync,
    PageModule,
} from "~/stack/types.ts";

/** Gets Layout properties from an ES Module object. */
export const getLayoutFromModule = (module: unknown): LayoutModule | null => {
    if (!module || typeof module !== 'object' || '__esModule' in module && module.__esModule === false) {
        return null;
    }

    const result: LayoutModule = {
        handler: null,
    }

    // exported default function
    if ('default' in module && module['default'] && typeof module['default'] === 'function') {
        result.handler = module.default as Layout;
    }
    // exported `layout` function
    else if ('layout' in module && module['layout'] && typeof module['layout'] === 'function') {
        result.handler = module.layout as Layout;
    }
    // no exports
    else {
        return null;
    }

    if (!result.handler) {
        return null;
    }

    return result;
}

const getPageHandlerInfo = (handler: Function) => {
    const str = handler.toString();

    let handlerType = 'sync';

    const asyncRegex = /^\s*(async)(?=\s*(?:function\b|\(|[A-Za-z_$]))/gm;
    const isAsync = asyncRegex.test(str);

    const sendOrErrorRegex = /^(?:async\s+)?(?:function\s+)?\w*\s*\(\s*\{[^}]*(send|error)[^}]*}\s*\)/;
    const hasSendOrError = sendOrErrorRegex.test(str);

    const streamOrEndRegex = /^(?:async\s+)?(?:function\s+)?\w*\s*\(\s*\{[^}]*\b(stream|end)\b[^}]*}\s*\)/;
    const hasStreamOrEnd = streamOrEndRegex.test(str);

    if (isAsync) {
        handlerType = 'async';
    }
    if (hasStreamOrEnd) {
        handlerType = 'stream';
    }
    if (hasStreamOrEnd && hasSendOrError || !hasStreamOrEnd && !hasSendOrError) {
        console.error('Invalid handler function. It must have either send/error or stream/end.');
        return null;
    }

    return {
        handlerType,
    }
}

/** Gets Page properties from an ES Module object. */
export const getPageFromModule = (module: unknown): PageModule | null => {
    if (!module || typeof module !== 'object' || '__esModule' in module && module.__esModule === false) {
        return null;
    }

    const result: {
        method: string,
        handler: Function | null,
        handlerType: string,
    } = {
        method: 'GET',
        handler: null,
        handlerType: 'sync',
    }

    // exported default function
    if ('default' in module && module['default'] && typeof module['default'] === 'function') {
        result.handler = module['default'] as PageSync | PageAsync | PageStream;
    }
    // exported `page` function
    else if ('page' in module && module['page'] && typeof module['page'] === 'function') {
        result.handler = module['page'] as PageSync | PageAsync | PageStream;
    }
    // no exports
    else {
        return null;
    }

    if (!result.handler) {
        return null;
    }

    const handlerInfo = getPageHandlerInfo(result.handler);
    if (!handlerInfo) {
        return null;
    }

    result.handlerType = handlerInfo.handlerType;

    // exported `method` string
    if ('method' in module && module['method'] && typeof module['method'] === 'string') {
        result.method = module['method'].toUpperCase() as string;
    }

    return result as PageModule;
}

/** Creates an `ApiRoute[]` from an ES Module object. */
export const getApiFromModule = (obj: unknown): ApiModule | null => {
    if (!obj || typeof obj !== 'object' || '__esModule' in obj && obj.__esModule === false) {
        return null;
    }

    const result: {
        endpoints: ApiObject | ApiObject[],
    } = {
        endpoints: [],
    }

    // exported default array
    if ('default' in obj && obj['default']) {
        result.endpoints = obj['default'] as ApiObject | ApiObject[];
    }
    // exported `api` array
    else if ('api' in obj && obj['api']) {
        result.endpoints = obj['api'] as ApiObject | ApiObject[];
    }
    // no exports
    else {
        return null;
    }

    if (!result.endpoints) {
        return null;
    }

    if (!Array.isArray(result.endpoints)) {
        result.endpoints = [result.endpoints];
    }

    const filtered: ApiObject[] = result.endpoints.reduce<ApiObject[]>((acc, route) => {
        if (!route || typeof route !== 'object' || !('path' in route) || !('handler' in route)
            || typeof route['path'] !== 'string' || typeof route['handler'] !== 'function') {
            return acc;
        }

        acc.push({
            path: route['path'],
            method: ('method' in route && typeof route['method'] === 'string') ? route['method'] : 'GET',
            handler: route['handler'] as (req: any, reply: any) => any
        });

        return acc;
    }, []);

    if (filtered.length === 0) {
        return null;
    } else {
        result.endpoints = filtered;
    }

    return result as ApiModule;
}
