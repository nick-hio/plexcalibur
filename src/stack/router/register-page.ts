import type { FastifyInstance } from "fastify";
import type {
    Layout,
    Directory,
    PageStream,
    PageAsync,
    PageSync,
    LayoutSync,
} from "~/stack/types.ts";
import { safeTry } from "~/utils/index.ts";
import fastJson from "fast-json-stringify";

type PageResponse = {
    status: number,
    headers: Record<string, string>,
    type: string,
    content: string,
}

const transformPayload = (fastify: FastifyInstance, payload: any, response: PageResponse): string => {
    if (!payload) {
        return '';
    }

    if (typeof payload === 'string') {
        return payload;
    } else {
        const [err, str] = safeTry<string>(fastJson, payload);
        if (err) {
            response.status = 500;
            fastify.log.error(`[ERROR] Error occurred while parsing the response payload: ${err}`);
        } else {
            response.type = 'application/json';
            return str;
        }
    }

    return '';
}

const transformStream = (fastify: FastifyInstance, payload: any): string => {
    if (!payload) {
        return '';
    }

    if (typeof payload === 'string') {
        return payload;
    } else {
        const [err, str] = safeTry<string>(fastJson, payload);
        if (err) {
            fastify.log.error(`[ERROR] Error occurred while parsing the stream data: ${err}`);
        } else {
            return str;
        }
    }

    return '';
}

export const registerSyncPage = (
    fastify: FastifyInstance,
    info: Directory,
    layoutHandler: LayoutSync | null
) => {
    if (info.page?.handlerType !== 'sync') {
        fastify.log.error(`[ERROR] Page handler type is not synchronous`);
        return;
    }
    if (info.layout && info.layout.handlerType !== 'sync') {
        fastify.log.error(`[ERROR] Cannot create synchronous route for '${info.uri}'. Change the Layout to be synchronous or change the Page to be asynchronous`);
        return;
    }

    fastify.route({
        method: info.page.method,
        url: info.uri,
        handler: (request, reply) => {
            const response: PageResponse = {
                status: 200,
                headers: {},
                type: 'text/html',
                content: '',
            };

            (info.page!.handler as PageSync)({
                send: (payload, options) => {
                    response.status = options?.status || 200;
                    response.type = options?.type || 'text/html';
                    response.headers = options?.headers || {};
                    response.content = transformPayload(fastify, payload, response);
                },
                error: (payload, options) => {
                    response.status = options?.status || 404;
                    response.type = options?.type || 'text/plain';
                    response.headers = options?.headers || {};
                    response.content = transformPayload(fastify, payload, response);
                },
                req: request,
                res: reply,
            });

            // Error response
            if (response.status >= 400) {
                return reply.type(response.type || 'text/plain').code(response.status).headers(response.headers || {}).send(response.content);
            }

            // Success response
            const payload = layoutHandler ? layoutHandler({ page: response.content, req: request, res: reply }) : response.content;
            return reply.type(response.type || 'text/html').code(response.status || 200).headers(response.headers || {}).send(payload);
        }
    });

    fastify.log.debug(`Router_PageRoute(Sync)=${info.uri}`);
}

export const registerAsyncPage = (
    fastify: FastifyInstance,
    info: Directory,
    layoutHandler: Layout | null
) => {
    if (info.page?.handlerType !== 'async') {
        fastify.log.error(`[ERROR] Page handler type is not asynchronous`);
        return;
    }

    fastify.route({
        method: info.page.method,
        url: info.uri,
        handler: async (request, reply) => {
            const response: PageResponse = {
                status: 200,
                headers: {},
                type: 'text/html',
                content: '',
            };

            await (info.page!.handler as PageAsync)({
                send: (payload, options) => {
                    response.status = options?.status || 200;
                    response.type = options?.type || 'text/html';
                    response.headers = options?.headers || {};
                    response.content = transformPayload(fastify, payload, response);
                },
                error: (payload, options) => {
                    response.status = options?.status || 404;
                    response.type = options?.type || 'text/plain';
                    response.headers = options?.headers || {};
                    response.content = transformPayload(fastify, payload, response);
                },
                req: request,
                res: reply,
            });

            // Error response
            if (response.status >= 400) {
                return reply.type(response.type || 'text/plain').code(response.status).headers(response.headers || {}).send(response.content);
            }

            // Success response
            const payload = layoutHandler ? await layoutHandler({page: response.content, req: request, res: reply}) : response.content;
            return reply.type(response.type || 'text/html').code(response.status || 200).headers(response.headers || {}).send(payload);
        }
    });

    fastify.log.debug(`Router_PageRoute(Async)=${info.uri}`);
}

export const registerStreamPage = (
    fastify: FastifyInstance,
    info: Directory,
    layoutHandler: Layout | null,
) => {
    if (info.page?.handlerType !== 'stream') {
        fastify.log.error(`[ERROR] Page handler type is not stream`);
        return;
    }

    fastify.route({
        method: info.page.method,
        url: info.uri,
        handler: async (request, reply) => {
            let isStreaming = false;
            let hasEndedStream = false;
            let totalBytes = 0;

            await (info.page!.handler as PageStream)({
                stream: (payload, options) => {
                    // Check if stream has ended
                    if (hasEndedStream) {
                        fastify.log.warn(`[ERROR] Cannot stream data after connection has ended.`);
                        return;
                    }

                    // Start stream if not already started
                    if (!isStreaming && !hasEndedStream) {
                        reply.raw.writeHead(options?.status || 200, {
                            'Content-Type': `${options?.type || 'text/html'}; charset=${options?.encoding || 'utf-8'}`,
                            'X-Content-Type-Options': 'nosniff',
                            'Connection': 'keep-alive',
                            ...options?.headers,
                        });
                        isStreaming = true;
                    }

                    // Implement layout handler (?)
                    const data = transformStream(fastify, payload);
                    const bytes = Buffer.byteLength(data, 'utf-8');
                    totalBytes += bytes;

                    reply.raw.write(data, (err) => {
                        if (err) {
                            fastify.log.error(`[ERROR] Error while streaming ${bytes} bytes of data: ${err}`);
                        } else {
                            fastify.log.debug(`Streamed ${bytes} bytes of data`);
                        }
                    });
                },
                end: (payload) => {
                    if (!isStreaming) {
                        fastify.log.warn(`[ERROR] Cannot end stream. Stream has not started yet`);
                        return;
                    }
                    if (hasEndedStream) {
                        fastify.log.warn(`[ERROR] Cannot end stream. Stream has already ended`);
                        return;
                    }

                    isStreaming = false
                    hasEndedStream = true;

                    if (payload) {
                        const data = transformStream(fastify, payload);
                        const bytes = Buffer.byteLength(data, 'utf-8');
                        totalBytes += bytes;

                        reply.raw.end(data, () => {
                            fastify.log.debug(`Streamed ${bytes} bytes of data`);
                            fastify.log.debug(`Stream ended after ${totalBytes} bytes of data`);
                        });
                    } else {
                        reply.raw.end(() => {
                            fastify.log.debug(`Stream ended after ${totalBytes} bytes of data`);
                        });
                    }
                },
                req: request,
                res: reply,
            });

            if (isStreaming && !hasEndedStream) {
                reply.raw.end(() => {
                    fastify.log.debug(`Stream ended after ${totalBytes} bytes of data`);
                })
            }
        }
    });

    fastify.log.debug(`Router_PageRoute(Stream)=${info.uri}`);
}
