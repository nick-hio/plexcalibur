import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { transformPayload } from "./transform.ts";
import type {
    Directory,
    PageSync,
    PageResponse,
    LayoutSync,
    PageCallbackOptions,
} from "~/stack/types.ts";

export const applyOptions = (
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
    response.useLayout = options?.useLayout ?? true;
    response.content = transformPayload(fastify, payload, response, options?.type);

    return response;
}

export const wrapPage = (
    req: FastifyRequest,
    res: FastifyReply,
    options: {
        type: string,
        page: string,
        layout: LayoutSync | null,
        useLayout: boolean,
    },
): string => {
    return options.useLayout && options.layout && options.type.startsWith('text')
        ? options.layout({ page: options.page, req, res })
        : options.page;
}

export const registerSyncPage = (
    fastify: FastifyInstance,
    directory: Directory,
    layoutHandler: LayoutSync | null,
) => {
    if (directory.page?.handlerType !== 'sync') {
        fastify.log.error(`[ERROR] Critical error while creating '${directory.uri}' page.`);
        return;
    }
    if (directory.layout && directory.layout.handlerType !== 'sync') {
        fastify.log.error(`[ERROR] Cannot create '${directory.uri}'. Pages must be async when their Layout is async.`);
        return;
    }

    fastify.route({
        method: directory.page.method,
        url: directory.uri,
        handler: (request, reply) => {
            const response: PageResponse = {
                status: 200,
                headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                },
                type: 'text/html',
                content: '',
                encoding: 'utf-8',
                useLayout: true,
            };

            let hasSent = false;

            (directory.page!.handler as PageSync)({
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

                    const content = wrapPage(request, reply, {
                        type: response.type,
                        page: response.content,
                        layout: layoutHandler,
                        useLayout: response.useLayout,
                    });
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

                    const content = wrapPage(request, reply, {
                        type: response.type,
                        page: response.content,
                        layout: layoutHandler,
                        useLayout: response.useLayout,
                    });
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
            const content = wrapPage(request, reply, {
                type: response.type,
                page: response.content,
                layout: layoutHandler,
                useLayout: response.useLayout,
            });
            reply.code(response.status).headers(response.headers).send(content);
        }
    });

    fastify.log.debug(`Router_PgeRoute='${directory.uri}' (Sync)`);
}
