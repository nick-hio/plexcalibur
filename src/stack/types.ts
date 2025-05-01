import type { FastifyPluginOptions, HTTPMethods } from "fastify";
import type { FastifyRequest, FastifyReply } from "fastify";
import type { JSXElementConstructor, ReactElement } from 'react';

/*
 * ~~~ Shared Types ~~~
 */

export interface Directory {
    uri: string,
    dir: string,
    folders: string[],
    layout: LayoutModuleSync | LayoutModuleAsync | null,
    page: PageModule | null,
    api: ApiModule | null,
}

export type RouterOptions = FastifyPluginOptions & {
    /** The `/app` directory in the file system. */
    dir?: string,
}

export type StreamCallbackOptions = {
    status?: number,
    type?: string,
    headers?: Record<string, string>,
    encoding?: BufferEncoding,
}

export type PageCallbackOptions = {
    status?: number,
    type?: string,
    headers?: Record<string, string>,
    encoding?: BufferEncoding,
    useLayout?: boolean,
}

/*
 * ~~~ Layout Types ~~~
 */

export type LayoutSync<
    Req = FastifyRequest,
    Res = FastifyReply,
> = ({
    Page,
    req,
    res,
}: {
    Page: JSXElementConstructor<any>,
    req: Req,
    res: Res,
}) => ReactElement;

export type LayoutAsync<
    Req = FastifyRequest,
    Res = FastifyReply,
> = ({
    Page,
    req,
    res,
}: {
    Page: JSXElementConstructor<any>,
    req: Req,
    res: Res,
}) => Promise<ReactElement>;

export type LayoutModuleSync = {
    handler: LayoutSync,
    handlerType: 'sync',
}

export type LayoutModuleAsync = {
    handler: LayoutAsync,
    handlerType: 'async',
}

/** Module from a `layout.tsx` file. */
export type LayoutModule =
    | LayoutModuleSync
    | LayoutModuleAsync;

/*
 * ~~~ Page Types ~~~
 */

export type PageContext = {
    status: number,
    headers: Record<string, string>,
    type: string,
    content: string | Record<any, any> | ReactElement,
    encoding: BufferEncoding,
    useLayout: boolean,
}

export type StreamContext = {
    type: string,
    headers: Record<string, string>,
    encoding: BufferEncoding,
}

export type PageSync<
    Q = FastifyRequest,
    S = FastifyReply,
> = ({
    set,
    send,
    error,
    req,
    res,
}: {
    set: (options: PageCallbackOptions) => void,
    send: (payload: string | Record<any, any> | JSXElementConstructor<any>, options?: PageCallbackOptions) => void,
    error: (payload: string | Record<any, any> | JSXElementConstructor<any>, options?: PageCallbackOptions) => void,
    req: Q,
    res: S,
}) => void;

export type PageAsync<
    Q = FastifyRequest,
    S = FastifyReply,
> = ({
    set,
    send,
    error,
    req,
    res,
}: {
    set: (options: PageCallbackOptions) => void,
    send: (payload: string | Record<any, any> | JSXElementConstructor<any>, options?: PageCallbackOptions) => Promise<void>,
    error: (payload: string | Record<any, any> | JSXElementConstructor<any>, options?: PageCallbackOptions) => Promise<void>,
    req: Q,
    res: S,
}) => Promise<void>;

export type PageStream<
    Q = FastifyRequest,
    S = FastifyReply,
> = ({
    set,
    stream,
    end,
    req,
    res,
}: {
    set: (options: StreamCallbackOptions) => void,
    stream: (payload: string | Record<any, any> | JSXElementConstructor<any>, options?: StreamCallbackOptions) => void,
    end: (payload?: string | Record<any, any> | JSXElementConstructor<any>) => void,
    req: Q,
    res: S,
}) => Promise<void>;

export type PageModuleSync = {
    method: HTTPMethods,
    handlerType: 'sync',
    handler: PageSync,
}

export type PageModuleAsync = {
    method: HTTPMethods,
    handlerType: 'async',
    handler: PageAsync,
}

export type PageModuleStream = {
    method: HTTPMethods,
    handlerType: 'stream',
    handler: PageStream,
}

/** Module properties from an `page.tsx` file. */
export type PageModule =
    | PageModuleSync
    | PageModuleAsync
    | PageModuleStream;

/*
 * ~~~ API Types ~~~
 */

export type ApiStream<
    Q = FastifyRequest,
    S = FastifyReply,
> = ({
    set,
    stream,
    end,
    req,
    res,
}: {
    set: (options: StreamCallbackOptions) => void,
    stream: (payload: string | Record<any, any> | JSXElementConstructor<any>, options?: StreamCallbackOptions) => void,
    end: (payload?: string | Record<any, any> | JSXElementConstructor<any>) => void,
    req: Q,
    res: S,
}) => Promise<void>;

export type Api = {
    path?: string,
    method?: HTTPMethods,
    handler: ApiStream,
}

/** Module from an `api.tsx` file. */
export type ApiModule = {
    endpoints: Api[],
}
