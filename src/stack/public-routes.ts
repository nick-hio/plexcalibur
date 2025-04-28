import type { FastifyInstance, FastifyServerOptions, FastifyRequest, FastifyReply, HookHandlerDoneFunction } from "fastify";
import { fastifyStatic } from "@fastify/static";
import path from 'path';

const publicRoutes = (fastify: FastifyInstance, _opts: FastifyServerOptions, done: HookHandlerDoneFunction) => {
    fastify.register(fastifyStatic, {
        root: path.join(__dirname, '..', 'public'),
        prefix: '/',
        decorateReply: false,
        wildcard: true,
    });

    // @ts-ignore
    fastify.setNotFoundHandler((req: FastifyRequest, reply: FastifyReply) => {
        const filepath = req.url;
        if (filepath.startsWith('/public/css/') || filepath.startsWith('/public/img/') || filepath.startsWith('/public/js/')) {
            reply.code(404).send(`'${path.basename(filepath)}' not found`);
        }
        reply.code(404).send(`Not found`);
    }, { prefix: '/' });

    done();
}

export default publicRoutes;
