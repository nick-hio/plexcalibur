import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type {
    Directory,
    PageAsync,
    PageResponse, LayoutSync, LayoutAsync,
} from "~/stack/types.ts";
import { applyOptions } from './register-page-sync.ts';

const wrapPage = async (
    req: FastifyRequest,
    res: FastifyReply,
    type: string,
    page: string,
    layout: LayoutSync | LayoutAsync | null
): Promise<string> => {
    return layout && type.startsWith('text')
        ? await layout({ page, req, res })
        : page;
}

export const registerAsyncPage = (
    fastify: FastifyInstance,
    directory: Directory,
    layoutHandler: LayoutAsync | LayoutSync | null
) => {
    if (directory.page?.handlerType !== 'async') {
        fastify.log.error(`[ERROR] Critical error while creating async '${directory.uri}' page.`);
        return;
    }

    fastify.route({
        method: directory.page.method,
        url: directory.uri,
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

            await (directory.page!.handler as PageAsync)({
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

    fastify.log.debug(`Router_PageRoute(Async)=${directory.uri}`);
}
