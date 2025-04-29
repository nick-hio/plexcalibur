import { env } from '~/utils/env.ts';
import Fastify from "fastify";
import fastifyRateLimiter from "~/stack/rate-limiter/rate-limiter.ts";
import fastifyForm from "@fastify/formbody";
import fastifyHelmet from "@fastify/helmet";
import fastifyCors from "@fastify/cors";
import publicRoutes from "~/stack/public-routes.ts";
import fastifyRouter from "~/stack/router/router.ts";

const main = async () => {
    const fastify = Fastify({
        logger: {
            level: env.LOG_LEVEL,
        },
    });

    fastify.addHook('preHandler', fastifyRateLimiter);
    fastify.register(fastifyForm);
    fastify.register(fastifyHelmet, { global: true });
    fastify.register(fastifyCors, {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true,
    });
    fastify.register(publicRoutes, { prefix: '/public' });
    fastify.register(fastifyRouter, {
        // dir: '/app', // TODO
    });
    fastify.setNotFoundHandler((_req, res) => { res.code(404).send(`Not found`) });

    // await db.init(); // TODO

    fastify.listen({
        host: env.APP_HOST,
        port: env.APP_PORT,
    }, (err, _address) => {
        if (err) {
            fastify.log.error(`[ERROR] Encountered error while starting server.`);
            throw err;
        }

        fastify.log.info(`Server ready!`);
    });
}

main();
