import type { FastifyPluginOptions, HTTPMethods, RouteHandlerMethod } from "fastify";
import type { FastifyRequest, FastifyReply } from "fastify";

export interface Directory {
    uri: string,
    dir: string,
    folders: string[],
    layout: LayoutModule | null,
    page: PageModule | null,
    api: ApiModule | null,
}

export type RouterOptions = FastifyPluginOptions & {
    /** The `/app` directory in the file system. */
    dir?: string,
}

/*
 * ~~~ Layout Types ~~~
 */

export type LayoutSync<
    Req = FastifyRequest,
    Res = FastifyReply,
> = ({
    page,
    req,
    res,
}: {
    page: string,
    req: Req,
    res: Res,
}) => string;

export type LayoutAsync<
    Req = FastifyRequest,
    Res = FastifyReply,
> = ({
    page,
    req,
    res,
}: {
    page: string,
    req: Req,
    res: Res,
}) => Promise<string>;

export type Layout =
    | LayoutSync
    | LayoutAsync;

export type LayoutModuleSync = {
    handler: LayoutSync | null,
    handlerType: 'sync',
}

export type LayoutModuleAsync = {
    handler: Layout | null,
    handlerType: 'async',
}

/** Module from a `layout.ts` file. */
export type LayoutModule =
    | LayoutModuleSync
    | LayoutModuleAsync;

/*
 * ~~~ Page Types ~~~
 */

export type PageType = 'sync' | 'async' | 'stream';

/** Utility type. */
export type PageResponse = {
    status: number,
    headers: Record<string, string>,
    type: string,
    content: string,
    encoding: BufferEncoding,
}

export type PageCallbackOptions = {
    status?: number,
    type?: string,
    headers?: Record<string, string>,
    encoding?: BufferEncoding,
}

export type PageSync<
    Req = FastifyRequest,
    Res = FastifyReply,
> = ({
    send,
    error,
    req,
    res,
}: {
    send: (payload: string | Record<any, any>, options?: PageCallbackOptions) => void,
    error: (payload: string | Record<any, any>, options?: PageCallbackOptions) => void,
    req: Req,
    res: Res,
}) => void;

export type PageAsync<
    Req = FastifyRequest,
    Res = FastifyReply,
> = ({
    send,
    error,
    req,
    res,
}: {
    send: (payload: string | Record<any, any>, options?: PageCallbackOptions) => void,
    error: (payload: string | Record<any, any>, options?: PageCallbackOptions) => void,
    req: Req,
    res: Res,
}) => Promise<void>;

export type StreamCallbackOptions = {
    type?: string,
    headers?: Record<string, string>,
    encoding?: BufferEncoding,
}

export type PageStream<
    Req = FastifyRequest,
    Res = FastifyReply,
> = ({
    set,
    stream,
    end,
    req,
    res,
}: {
    set: (options: StreamCallbackOptions) => void,
    stream: (payload: string | Record<any, any>, options?: StreamCallbackOptions) => void,
    end: (payload?: string | Record<any, any>) => void,
    req: Req,
    res: Res,
}) => Promise<void>;

export type Page<
    Req = FastifyRequest,
    Res = FastifyReply,
> =
    | PageSync<Req, Res>
    | PageAsync<Req, Res>
    | PageStream<Req, Res>;

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

/** Module properties from an `page.ts` file. */
export type PageModule =
    | PageModuleSync
    | PageModuleAsync
    | PageModuleStream;

/*
 * ~~~ API Types ~~~
 */

export type ApiObject<
    H = RouteHandlerMethod,
> = {
    path: string,
    method: HTTPMethods,
    handler: H,
}

/** Module from an `api.ts` file. */
export type ApiModule = {
    endpoints: ApiObject[],
}
