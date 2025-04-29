import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { transformPayload } from "./transform.ts";
import type {
    Layout,
    Directory,
    PageAsync,
    PageResponse, PageCallbackOptions, LayoutSync,
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

const wrapPage = async (
    req: FastifyRequest,
    res: FastifyReply,
    type: string,
    page: string,
    layout?: Layout | null
): Promise<string> => {
    return layout && type.startsWith('text')
        ? await layout({ page, req, res })
        : page;
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
                headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                },
                type: 'text/html',
                content: '',
                encoding: 'utf-8',
            }

            let hasSent = false;

            await (info.page!.handler as PageAsync)({
                req: request,
                res: reply,
                send: async (payload, options) => {
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

                    const content = await wrapPage(request, reply, response.type, response.content, layoutHandler);
                    reply.code(response.status).headers(response.headers).send(content);

                    hasSent = true;
                },
                error: async (payload, options) => {
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

                    const content = await wrapPage(request, reply, response.type, response.content, layoutHandler);
                    reply.code(response.status).headers(response.headers).send(content);

                    hasSent = true;
                },
            });

            if (hasSent) {
                return reply;
            }

            // Error response
            if (response.status >= 400) {
                return reply.code(response.status).headers(response.headers).send(response.content);
            }

            // Success response
            const content = await wrapPage(request, reply, response.type, response.content, layoutHandler);
            return reply.code(response.status).headers(response.headers).send(content);
        }
    });

    fastify.log.debug(`Router_PageRoute(Async)=${info.uri}`);
}
