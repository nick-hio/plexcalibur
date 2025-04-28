import type { FastifyInstance } from "fastify";
import type {
    ApiObject,
    Directory,
} from "~/stack/types.ts";

export const registerApi = (
    fastify: FastifyInstance,
    info: Directory,
) => {
    info.api!.endpoints.forEach((route: ApiObject) => {
        const uri = (info.uri.endsWith('/') ? info.uri : info.uri + '/')
            + 'api'
            + (route.path.startsWith('/') ? '' : '/')
            + (route.path.endsWith('/') ? route.path.slice(0, -1) : route.path);

        fastify.route({
            method: route.method,
            url: uri,
            handler: route.handler,
        });

        fastify.log.debug(`Router_ApiRoute=${uri}`);
    });
}
