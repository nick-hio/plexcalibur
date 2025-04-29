import Database, { type Database as Libsql } from "libsql";
import type { FastifyRequest } from "fastify";
import type { RateLimitTableRow } from "./types.ts";
import { env, NODE_ENV } from "~/utils/env.ts";

export class RateLimiter {
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
        this.db = new Database(db ?? env.RATELIMIT_DB);
        this.table = table;
        this.devHeader = devHeader ?? env.RATELIMIT_HEADER;

        this.db.prepare(`CREATE TABLE IF NOT EXISTS ${this.table} (ip TEXT PRIMARY KEY, requests INTEGER, lastReq INTEGER)`).run();
    }

    public validate = (request: FastifyRequest): boolean => {
        const ip = (NODE_ENV === 'development' && this.devHeader && request.headers[this.devHeader])
            ? request.headers[this.devHeader] as string
            : request.ip;

        const currentTime = Date.now();
        const row = this.db.prepare(`SELECT * FROM ${this.table} WHERE ip = ?`).get(ip) as RateLimitTableRow | null;

        // When no previous requests
        if (!row) {
            this.db.prepare(`INSERT OR ABORT INTO ${this.table} (ip, requests, lastReq) VALUES (?, 1, ?)`).run([ip, currentTime]);
            return true;
        }

        // When a request was made within the interval
        if (currentTime - row.lastReq < this.interval) {
            if (row.requests >= this.maximum) { // Too many requests
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
