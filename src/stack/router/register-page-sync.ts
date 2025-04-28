import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { transformPayload } from "./transform.ts";
import type {
    Directory,
    PageSync,
    PageResponse,
    LayoutSync,
} from "~/stack/types.ts";

const applyResponse = () => {} // TODO

const wrapPageSync = ({
    req,
    res,
    type,
    layoutHandler,
    page,
}: {
    req: FastifyRequest,
    res: FastifyReply,
    type: string,
    layoutHandler: LayoutSync | null,
    page: string,
}): string => {
    return layoutHandler && type.startsWith('text')
        ? layoutHandler({page, req, res})
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

                    response.status = options?.status || 200;
                    response.type = options?.type || 'text/html';
                    response.encoding = options?.encoding || 'utf-8';
                    response.headers = {
                        'Content-Type': `${response.type}; charset=${options?.encoding || 'utf-8'}`,
                        ...options?.headers,
                    };
                    response.content = transformPayload(fastify, payload, response);

                    const wrapped = wrapPageSync({
                        req: request,
                        res: reply,
                        type: response.type,
                        layoutHandler,
                        page: response.content,
                    })
                    reply.code(response.status).headers(response.headers).send(wrapped);

                    hasSent = true;
                },
                error: (payload, options) => {
                    if (hasSent) {
                        fastify.log.warn(`[ERROR] Cannot send response multiple times.`);
                        return;
                    }

                    response.status = options?.status || 400;
                    response.type = options?.type || 'text/plain';
                    response.encoding = options?.encoding || 'utf-8';
                    response.headers = {
                        'Content-Type': `${response.type}; charset=${options?.encoding || 'utf-8'}`,
                        ...options?.headers,
                    };
                    response.content = transformPayload(fastify, payload, response);

                    const wrapped = wrapPageSync({
                        req: request,
                        res: reply,
                        type: response.type,
                        layoutHandler,
                        page: response.content,
                    })
                    reply.code(response.status).headers(response.headers).send(wrapped);

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
            const wrapped = wrapPageSync({
                req: request,
                res: reply,
                type: response.type,
                layoutHandler,
                page: response.content,
            });
            reply.code(response.status).headers(response.headers).send(wrapped);
        }
    });

    fastify.log.debug(`Router_PageRoute(Sync)=${info.uri}`);
}
