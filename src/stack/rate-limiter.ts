import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from "fastify";
import type { Database as Libsql } from 'libsql';
import Database from 'libsql';
import { NODE_ENV } from "~/utils/env.ts";
import {
    RATELIMIT_ENABLED,
    RATELIMIT_DB,
    RATELIMIT_IP_HEADER,
    RATELIMIT_INTERVAL,
    RATELIMIT_MAXIMUM
} from "~/stack/config.ts";

class RateLimiter {
    private db: Libsql;
    private interval: number;
    private maximum: number;
    private table: string;
    private devHeader: string | null;

    constructor({
        interval,
        maximum,
        db,
        table,
        devHeader,
    }: {
        interval: number,
        maximum: number,
        db?: string,
        table: string,
        devHeader?: string
    }) {
        this.interval = interval;
        this.maximum = maximum;
        this.db = new Database(db ?? RATELIMIT_DB);
        this.table = table;
        this.devHeader = devHeader ?? RATELIMIT_IP_HEADER;

        this.db.prepare(`CREATE TABLE IF NOT EXISTS ${this.table} (ip TEXT PRIMARY KEY, requests INTEGER, lastReq INTEGER)`).run();
    }

    public validate = (request: FastifyRequest): boolean => {
        const ip = (NODE_ENV === 'development' && this.devHeader && request.headers[this.devHeader])
            ? request.headers[this.devHeader] as string
            : request.ip;

        const currentTime = Date.now();
        const info = this.db.prepare(`SELECT * FROM ${this.table} WHERE ip = ?`).get(ip) as { ip: string; requests: number; lastReq: number; };

        // When no previous requests
        if (!info) {
            this.db.prepare(`INSERT OR ABORT INTO ${this.table} (ip, requests, lastReq) VALUES (?, 1, ?)`).run([ip, currentTime]);
            return true;
        }

        // When a request was made within the interval
        if (currentTime - info.lastReq < this.interval) {
            if (info.requests >= this.maximum) {
                return false;
            } else {
                this.db.prepare(`UPDATE OR ROLLBACK ${this.table} SET requests = requests + 1, lastReq = ? WHERE ip = ?`).run([currentTime, ip]);
                return true;
            }
        }

        // Reset request count
        this.db.prepare(`UPDATE OR ROLLBACK ${this.table} SET requests = 1, lastReq = ? WHERE ip = ?`).run([currentTime, ip]);
        return true;
    }
}

const burstLimiter = new RateLimiter({
    table: 'burst',
    interval: RATELIMIT_INTERVAL.BURST,
    maximum: RATELIMIT_MAXIMUM.BURST,
});

const sustainedLimiter = new RateLimiter({
    table: 'sustained',
    interval: RATELIMIT_INTERVAL.SUSTAINED,
    maximum: RATELIMIT_MAXIMUM.SUSTAINED,
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
