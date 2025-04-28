import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { transformPayload } from "./transform.ts";
import type {
    Layout,
    Directory,
    PageAsync,
    PageResponse,
} from "~/stack/types.ts";

const wrapPageAsync = async ({
    req,
    res,
    type,
    layoutHandler,
    page,
}: {
    req: FastifyRequest,
    res: FastifyReply,
    type: string,
    layoutHandler: Layout | null,
    page: string,
}): Promise<string> => {
    return layoutHandler && type.startsWith('text')
        ? await layoutHandler({page, req, res})
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
                headers: {},
                type: 'text/html',
                content: '',
                encoding: 'utf-8',
            }

            await (info.page!.handler as PageAsync)({
                send: (payload, options) => {
                    response.status = options?.status || 200;
                    response.type = options?.type || 'text/html';
                    response.encoding = options?.encoding || 'utf-8';
                    response.headers = {
                        'Content-Type': `${response.type}; charset=${options?.encoding || 'utf-8'}`,
                        ...options?.headers,
                    };
                    response.content = transformPayload(fastify, payload, response);
                },
                error: (payload, options) => {
                    response.status = options?.status || 400;
                    response.type = options?.type || 'text/plain';
                    response.encoding = options?.encoding || 'utf-8';
                    response.headers = {
                        'Content-Type': `${response.type}; charset=${options?.encoding || 'utf-8'}`,
                        ...options?.headers,
                    };
                    response.content = transformPayload(fastify, payload, response);
                },
                req: request,
                res: reply,
            });

            // Error response
            if (response.status >= 400) {
                return reply.code(response.status).headers(response.headers).send(response.content);
            }

            // Success response
            const payload = layoutHandler && response.type.startsWith('text')
                ? await layoutHandler({
                    page: response.content,
                    req: request,
                    res: reply
                })
                : response.content;

            return reply.code(response.status || 200).headers(response.headers).send(payload);
        }
    });

    fastify.log.debug(`Router_PageRoute(Async)=${info.uri}`);
}
