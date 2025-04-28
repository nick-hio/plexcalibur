const DEFAULT = {
    NODE_ENV: 'production',
    LOG_LEVEL: 'info',

    APP_HOST: '0.0.0.0',
    APP_PORT: 3000,

    LIBSQL_DB: 'file:database.db',

    RATELIMIT_ENABLED: true,
    RATELIMIT_DB: 'file:ratelimit.db',
    RATELIMIT_HEADER: 'x-dev-ip',
} as const;

export const env = {
    NODE_ENV: process.env.NODE_ENV || DEFAULT.NODE_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL?.toLowerCase() || DEFAULT.LOG_LEVEL,

    APP_HOST: process.env.APP_HOST || DEFAULT.APP_HOST,
    APP_PORT: process.env.APP_PORT ? parseInt(process.env.APP_PORT) || DEFAULT.APP_PORT : DEFAULT.APP_PORT,

    LIBSQL_DB: process.env.LIBSQL_DB || DEFAULT.LIBSQL_DB,

    RATELIMIT_ENABLED: process.env.RATELIMIT_ENABLED ? process.env.RATELIMIT_ENABLED.toLowerCase() === 'true' : DEFAULT.RATELIMIT_ENABLED,
    RATELIMIT_DB: process.env.RATELIMIT_DB || DEFAULT.RATELIMIT_DB,
    RATELIMIT_HEADER: process.env.RATELIMIT_HEADER || DEFAULT.RATELIMIT_HEADER,
}

export const NODE_ENV = env.NODE_ENV;
