import { env } from "~/utils/env.ts";

export const RATELIMIT_ENABLED = env.RATELIMIT_ENABLED;

export const RATELIMIT_DB = env.RATELIMIT_DB;

/** The header used to identify the IP address of the client (**DEVELOPMENT ONLY**). Default is `x-dev-ip`. */
export const RATELIMIT_IP_HEADER = env.RATELIMIT_HEADER;

/** Configuration for rate limiting intervals in ***milliseconds***. */
export const RATELIMIT_INTERVAL = {
    BURST: 5000,
    SUSTAINED: 60000,
} as const;

/** Configuration for the maximum number of requests allowed the interval. */
export const RATELIMIT_MAXIMUM = {
    BURST: 20,
    SUSTAINED: 200,
} as const;
