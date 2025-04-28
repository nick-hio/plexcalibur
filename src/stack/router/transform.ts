import type { FastifyInstance } from "fastify";
import type { PageResponse } from "~/stack/types.ts";
import { safeTry } from "~/utils";
import fastJson from "fast-json-stringify";

const stringify = fastJson({});

export const transformPayload = (fastify: FastifyInstance, payload: any, response: PageResponse): string => {
    if (!payload) {
        return '';
    }

    if (typeof payload === 'string') {
        return payload;
    } else {
        const [err, str] = safeTry<string>(stringify, payload);
        if (err) {
            response.status = 500;
            fastify.log.error(`[ERROR] Error occurred while parsing the response payload: ${err}`);
        } else {
            response.type = 'application/json';
            response.headers = {
                ...response.headers,
                'Content-Type': `${response.type}; charset=${response.encoding || 'utf-8'}`,
            }
            return str;
        }
    }

    return '';
}

export const transformStream = (fastify: FastifyInstance, payload: any): string => {
    if (!payload) {
        return '';
    }

    if (typeof payload === 'string') {
        return payload;
    } else {
        const [err, str] = safeTry<string>(stringify, payload);
        if (err) {
            fastify.log.error(`[ERROR] Error occurred while parsing the stream data: ${err}`);
        } else {
            return str;
        }
    }

    return '';
}
