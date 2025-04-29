import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { transformPayload } from "./transform.ts";
import type {
    Directory,
    PageSync,
    PageResponse,
    LayoutSync,
    PageCallbackOptions,
} from "~/stack/types.ts";

const applyOptions = (
    fastify: FastifyInstance,
    response: PageResponse,
    payload: string | Record<any, any>,
    options: PageCallbackOptions & {
        defaults: {
            status: number,
            type: string,
        }
    },
): PageResponse => {
    response.status = options?.status || options.defaults.status;
    response.type = options?.type || options.defaults.type;
    response.encoding = options?.encoding || 'utf-8';
    response.headers = {
        'Content-Type': `${response.type}; charset=${options?.encoding || 'utf-8'}`,
        ...options?.headers,
    };
    response.content = transformPayload(fastify, payload, response, options?.type);

    return response;
}

const wrapPage = (
    req: FastifyRequest,
    res: FastifyReply,
    type: string,
    page: string,
    layout?: LayoutSync | null
): string => {
    return layout && type.startsWith('text')
        ? layout({ page, req, res })
        : page;
}

export const registerSyncPage = (
    fastify: FastifyInstance,
    info: Directory,
    layoutHandler: LayoutSync | null,
) => {
    if (info.page?.handlerType !== 'sync') {
        fastify.log.error(`[ERROR] Page handler type is not synchronous`);
        return;
    }
    if (info.layout && info.layout.handlerType !== 'sync') {
        fastify.log.error(`[ERROR] Cannot create route for '${info.uri}'. Change the Layout to be synchronous or change the Page to be asynchronous`);
        return;
    }

    fastify.route({
        method: info.page.method,
        url: info.uri,
        handler: (request, reply) => {
            const response: PageResponse = {
                status: 200,
                headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                },
                type: 'text/html',
                content: '',
                encoding: 'utf-8'
            };

            let hasSent = false;

            (info.page!.handler as PageSync)({
                send: (payload, options) => {
                    if (hasSent) {
                        fastify.log.warn(`[ERROR] Cannot send response multiple times.`);
                        return;
                    }

                    applyOptions(fastify, response, payload, {
                        ...options,
                        defaults: {
                            status: 200,
                            type: 'text/html',
                        },
                    });

                    const content = wrapPage(request, reply, response.type, response.content, layoutHandler);
                    reply.code(response.status).headers(response.headers).send(content);

                    hasSent = true;
                },
                error: (payload, options) => {
                    if (hasSent) {
                        fastify.log.warn(`[ERROR] Cannot send response multiple times.`);
                        return;
                    }

                    applyOptions(fastify, response, payload, {
                        ...options,
                        defaults: {
                            status: 400,
                            type: 'text/plain',
                        },
                    });

                    const content = wrapPage(request, reply, response.type, response.content, layoutHandler);
                    reply.code(response.status).headers(response.headers).send(content);

                    hasSent = true;
                },
                req: request,
                res: reply,
            });

            if (hasSent) {
                return;
            }

            // Error response
            if (response.status >= 400) {
                reply.code(response.status).headers(response.headers).send(response.content);
                return;
            }

            // Success response
            const content = wrapPage(request, reply, response.type, response.content, layoutHandler);
            reply.code(response.status).headers(response.headers).send(content);
        }
    });

    fastify.log.debug(`Router_PageRoute(Sync)=${info.uri}`);
}
