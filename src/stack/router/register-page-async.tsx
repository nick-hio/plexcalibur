import type { FastifyInstance } from "fastify";
import type {
    Directory,
    PageContext,
    LayoutAsync,
    PageCallbackOptions,
    PageAsync,
} from "~/stack/types.ts";
import { updatePageContext } from './register-page-sync.tsx';
import {isValidElement, type ReactElement} from "react";
import {transformPayload} from "~/stack/router/transform.ts";

export const registerAsyncPage = (
    fastify: FastifyInstance,
    directory: Directory,
    layoutHandler: LayoutAsync | null
) => {
    if (directory.page?.handlerType !== 'async') {
        fastify.log.error(`[ERROR] Critical error while creating async '${directory.uri}' page.`);
        return;
    }

    fastify.route({
        method: directory.page.method,
        url: directory.uri,
        handler: async (request, reply) => {
            const context: PageContext = {
                status: 200,
                headers: {},
                type: 'text/html',
                content: '',
                encoding: 'utf-8',
                useLayout: true,
            }

            let hasSent = false;

            const handleResponse = async (
                payload: string | ReactElement | Record<any, any>,
                options: PageCallbackOptions & { defaults: { status: number, type?: string } }
            ) => {
                if (hasSent) {
                    fastify.log.warn(`[WARN] Response already sent for '${request.url}', ignoring subsequent call(s).`);
                    return;
                }

                updatePageContext(context, payload, options);
                let finalPayload: string | ReactElement | Record<any, any> = context.content;

                if (context.useLayout && layoutHandler && isValidElement(context.content)) {
                    const syncLayout = layoutHandler as LayoutAsync;
                    const PageComponent = () => context.content as ReactElement;

                    try {
                        finalPayload = await syncLayout({
                            Page: PageComponent,
                            req: request,
                            res: reply
                        });
                    } catch (err) {
                        fastify.log.error(`[ERROR] Layout rendering failed for '${request.url}': ${err}`);
                        context.status = 500;
                        context.type = 'text/plain';
                        finalPayload = "Internal Server Error: Layout failed to render.";
                    }
                }

                const responseBody = transformPayload(fastify, finalPayload, context);
                reply.code(context.status).headers(context.headers).send(responseBody);

                hasSent = true;
            };

            try {
                await (directory.page!.handler as PageAsync)({
                    req: request,
                    res: reply,
                    set: (options) => {
                        updatePageContext(context, context.content, {
                            ...options,
                            defaults: {status: context.status, type: context.type},
                        });
                    },
                    send: async (payload, options) => {
                        await handleResponse(payload, {
                            ...options,
                            defaults: {status: 200, type: 'text/html'},
                        });
                    },
                    error: async (payload, options) => {
                        await handleResponse(payload, {
                            ...options,
                            defaults: {status: 400, type: 'text/plain'},
                        });
                    },
                });
            }
            catch (pageError: any) {
                if (!hasSent) {
                    fastify.log.error(`[ERROR] Uncaught error in page handler for '${request.url}': ${pageError}`);
                    await handleResponse("Internal Server Error", {
                        defaults: {status: 500, type: 'text/plain'},
                    });
                } else {
                    fastify.log.error(`[ERROR] Error after response sent in page handler for '${request.url}': ${pageError}`);
                }
            }
        }
    });

    fastify.log.debug(`Router_PgeRoute='${directory.page.method} ${directory.uri}' (Async)`);
}
