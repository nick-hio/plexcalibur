import type { FastifyInstance } from "fastify";
import type {
    Directory,
    PageSync,
    PageContext,
    LayoutSync,
    PageCallbackOptions,
} from "~/stack/types.ts";
import { isValidElement } from "react";
import type { ReactElement } from "react";
import { transformPayload } from "~/stack/router/transform.ts";

export const updatePageContext = (
    context: PageContext,
    payload: string | Record<any, any> | ReactElement,
    options: PageCallbackOptions & {
        defaults: {
            status: number,
            type?: string,
        }
    },
): void => {
    const type = typeof payload === 'string'
        ? 'text/plain'
        : isValidElement(payload)
            ? 'text/html'
            : 'application/json';

    context.type = options?.type ?? options.defaults.type ?? type;
    context.status = options?.status ?? options.defaults.status;
    context.encoding = options?.encoding ?? 'utf-8';
    context.headers = { ...options?.headers }
    context.useLayout = options?.useLayout ?? true;
    context.content = payload;
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
        fastify.log.warn(`[WARN] Sync page '${directory.uri}' is using an async layout. Layout rendering will be synchronous.`);
    }

    fastify.route({
        method: directory.page.method,
        url: directory.uri,
        handler: (request, reply) => {
            const context: PageContext = {
                status: 200,
                headers: {},
                type: 'text/html',
                content: '',
                encoding: 'utf-8',
                useLayout: true,
            };

            let hasSent = false;

            const handleResponse = (
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
                    const syncLayout = layoutHandler as LayoutSync;
                    const PageComponent = () => context.content as ReactElement;

                    try {
                        finalPayload = syncLayout({
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
                (directory.page!.handler as PageSync)({
                    req: request,
                    res: reply,
                    set: (options) => {
                        updatePageContext(context, context.content, {
                            ...options,
                            defaults: { status: context.status, type: context.type },
                        });
                    },
                    send: (payload, options) => {
                        handleResponse(payload, {
                            ...options,
                            defaults: { status: 200, type: 'text/html' },
                        });
                    },
                    error: (payload, options) => {
                        handleResponse(payload, {
                            ...options,
                            defaults: { status: 400, type: 'text/plain' },
                        });
                    },
                });
            }
            catch (pageError: any) {
                if (!hasSent) {
                    fastify.log.error(`[ERROR] Uncaught error in page handler for '${request.url}': ${pageError}`);
                    handleResponse("Internal Server Error", {
                        defaults: { status: 500, type: 'text/plain' },
                    });
                } else {
                    fastify.log.error(`[ERROR] Error after response sent in page handler for '${request.url}': ${pageError}`);
                }
            }
        }
    });

    fastify.log.debug(`Router_PgeRoute='${directory.page.method} ${directory.uri}' (Sync)`);
}
