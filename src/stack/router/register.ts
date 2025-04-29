import type { FastifyInstance } from "fastify";
import type { Layout, Directory, LayoutSync } from "~/stack/types.ts";
import { registerSyncPage } from "./register-page-sync.ts";
import { registerAsyncPage} from "./register-page-async.ts";
import { registerStreamPage } from "./register-page-stream.ts";
import { registerApi } from "./register-api.ts";

/** Registers a directory's **Page** and **API** routes. */
export const registerDirectory = (
    fastify: FastifyInstance,
    directory: Directory,
    layout: Layout | null = null,
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
