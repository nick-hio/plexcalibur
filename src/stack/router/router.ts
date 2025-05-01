import type { FastifyInstance, FastifyPluginCallback, HookHandlerDoneFunction } from "fastify";
import fp from 'fastify-plugin';
import fs from 'fs';
import path from 'path';
import type {
    RouterOptions,
    Directory,
    LayoutSync,
    LayoutAsync
} from "~/stack/types.ts";
import {
    getLayoutFromModule,
    getPageFromModule,
    getApiFromModule
} from './modules.ts'
import { registerDirectory } from './register.ts'

/**
 * Registers routes from the `page.tsx` and `api.tsx` files from a directory and all nested-directories.
 * @param fastify - Fastify instance.
 * @param dir - The file system location of the directory.
 * @param uri - The URI string for the server route.
 * @param layoutHandler - The layout route object.
 * */
const buildRoutes = (
    fastify: FastifyInstance,
    dir: string,
    uri: string = '/',
    layoutHandler: LayoutSync | LayoutAsync | null = null
): void => {
    const directory: Directory = {
        uri: uri,
        dir: dir,
        folders: [],
        layout: null,
        page: null,
        api: null
    }

    const files = fs.readdirSync(dir, { withFileTypes: true })

    // Search directory files
    for (const file of files) {
        const { name } = file;

        // Folder
        if (file.isDirectory() && name.toLowerCase() !== 'api') {
            directory.folders.push(name)
        }

        // File
        else if (file.isFile()) {
            const ext = path.extname(name);
            if (!['.js', '.jsx', '.ts', '.tsx'].includes(ext)) continue;

            const basename = path.basename(name, ext);
            const filePath = path.join(dir, name);
            const module = require(filePath); // Import module

            if (basename === 'layout') directory.layout = getLayoutFromModule(module);
            else if (basename === 'page') directory.page = getPageFromModule(module);
            else if (basename === 'api') directory.api = getApiFromModule(module);
        }
    }

    registerDirectory(fastify, directory, layoutHandler); // Registers the current directory's routes

    // Registering nested directories
    const currentLayoutHandler = directory.layout?.handler ?? layoutHandler;
    directory.folders.forEach((folder) => {
        const nestedDir = path.join(dir, folder);
        const nestedUri = path.join(uri, folder).replace(/\\/g, '/');
        buildRoutes(fastify, nestedDir, nestedUri, currentLayoutHandler);
    });
}

const fastifyRouter: FastifyPluginCallback = (fastify: FastifyInstance, options: RouterOptions, done: HookHandlerDoneFunction) => {
    try {
        const rootDir = options.dir ? path.join(options.dir) : path.join(__dirname, '../../app');
        fastify.log.debug(`Router_Directory=${rootDir}`);

        buildRoutes(fastify, rootDir);
        done();
    } catch (e) {
        const err = e as Error;

        fastify.log.error('[ERROR] Error occurred while building routes');
        fastify.log.error(err);

        done({
            cause: err.cause,
            code: 'Error occurred while building routes',
            statusCode: 404,
            ...err,
        });
    }
}

export default fp<RouterOptions>(fastifyRouter, {
    fastify: '5.x',
    name: 'fastifyRouter'
});
