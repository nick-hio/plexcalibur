import type { FastifyInstance } from "fastify";
import type { Directory, LayoutSync, LayoutAsync } from "~/stack/types.ts";
import { registerSyncPage } from "./register-page-sync.tsx";
import { registerAsyncPage} from "./register-page-async.tsx";
import { registerStreamPage } from "./register-page-stream.ts";
import { registerApi } from "./register-api.ts";

/** Registers a directory's **Page** and **API** routes. */
export const registerDirectory = (
    fastify: FastifyInstance,
    directory: Directory,
    layout: LayoutSync | LayoutAsync | null = null,
): void => {
    const layoutHandler = directory.layout?.handler ?? layout;

    if (directory.page) {
        if (directory.page.handlerType === 'sync') {
            registerSyncPage(fastify, directory, layoutHandler as LayoutSync);
        }
        else if (directory.page.handlerType === 'async') {
            registerAsyncPage(fastify, directory, layoutHandler);
        }
        else if (directory.page.handlerType === 'stream') {
            registerStreamPage(fastify, directory);
        }
    }

    if (directory.api) {
        registerApi(fastify, directory);
    }
}
