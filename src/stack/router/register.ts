import type { FastifyInstance } from "fastify";
import type { Layout, Directory } from "~/stack/types.ts";
import { registerSyncPage, registerAsyncPage, registerStreamPage } from "~/stack/router/register-page.ts";
import { registerApi } from "~/stack/router/register-api.ts";

/** Registers a directory's **Page** and **API** routes. */
export const registerDirectory = (
    fastify: FastifyInstance,
    info: Directory,
    layout: Layout | null = null,
): void => {
    const layoutHandler = info.layout?.handler ?? layout;

    if (info.page) {
        if (info.page.handlerType === 'sync') {
            registerSyncPage(fastify, info, layoutHandler);
        }
        else if (info.page.handlerType === 'async') {
            registerAsyncPage(fastify, info, layoutHandler);
        }
        else if (info.page.handlerType === 'stream') {
            registerStreamPage(fastify, info, layoutHandler);
        }
    }

    if (info.api) {
        registerApi(fastify, info);
    }
}
