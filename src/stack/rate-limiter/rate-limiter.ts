import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from "fastify";
import { RateLimiter } from './RateLimiter.ts'

const RATELIMIT_ENABLED = true as const;

const burstLimiter = new RateLimiter({
    table: 'burst',
    interval: 5000,
    maximum: 20,
});

const sustainedLimiter = new RateLimiter({
    table: 'sustained',
    interval: 60000,
    maximum: 200,
});

const rateLimiter = (req: FastifyRequest, res: FastifyReply, done: HookHandlerDoneFunction) => {
    if (!RATELIMIT_ENABLED) {
        done();
        return;
    }

    const burstCheck = burstLimiter.validate(req);
    const sustainedCheck = sustainedLimiter.validate(req);

    if (!burstCheck || !sustainedCheck) {
        res.status(429).send('Too many requests. Please try again later.');
    }

    done();
}

export default rateLimiter;
