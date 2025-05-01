import type { FastifyInstance } from "fastify";
import type { PageContext } from "~/stack/types.ts";
import { safeTry } from "~/utils";
import fastJson from "fast-json-stringify";
import { isValidElement } from "react";
import { renderToStaticMarkup as render } from "react-dom/server";

const jsonSchema = {} as const;
const stringify = fastJson(jsonSchema);

export const transformPayload = (
    fastify: FastifyInstance,
    payload: any,
    context: PageContext,
): string => {
    const encoding = context.encoding || 'utf-8';
    let contentType = context.type;
    let responseBody;

    if (payload == null) { // Handles null and undefined
        responseBody = '';
    }
    else if (typeof payload === 'string') {
        responseBody = payload;
    }
    else if (isValidElement(payload)) {
        contentType = 'text/html';
        const [renderErr, html] = safeTry<string>(render, payload);

        if (renderErr) {
            fastify.log.error(`[ERROR] React rendering failed: ${renderErr}`);

            context.status = 500;
            contentType = 'text/plain';
            responseBody = "Internal Server Error: Failed to render content.";
        } else {
            responseBody = html;
        }
    }
    else {
        contentType = 'application/json';
        const [stringifyErr, jsonString] = safeTry<string>(stringify, payload);

        if (stringifyErr) {
            fastify.log.error(`[ERROR] JSON stringification failed: ${stringifyErr}`);
            context.status = 500;
            contentType = 'text/plain';
            responseBody = "Internal Server Error: Failed to serialize response.";
        } else {
            responseBody = jsonString;
        }
    }

    context.type = contentType;
    context.headers = {
        ...context.headers,
        'Content-Type': `${contentType}; charset=${encoding}`,
    };

    return responseBody;


    // if (!payload) {
    //     return '';
    // }
    //
    // if (typeof payload === 'string') {
    //     return payload;
    // }
    // else if (isValidElement(payload)) {
    //     context.type = 'text/html';
    //     context.headers = {
    //         ...context.headers,
    //         'Content-Type': `text/html; charset=${context.encoding || 'utf-8'}`,
    //     }
    //     return render(payload);
    // }
    // else {
    //     const [err, str] = safeTry<string>(stringify, payload);
    //     if (err) {
    //         context.status = 500;
    //         fastify.log.error(`[ERROR] Error occurred while parsing the response payload: ${err}`);
    //     } else {
    //         context.type = type || 'application/json';
    //         context.headers = {
    //             ...context.headers,
    //             'Content-Type': `application/json; charset=${context.encoding || 'utf-8'}`,
    //         }
    //         return str;
    //     }
    // }
    //
    // return '';
}

export const transformStream = (fastify: FastifyInstance, payload: any): string => {
    if (!payload) {
        return '';
    }

    if (typeof payload === 'string') {
        return payload;
    }
    else if (isValidElement(payload)) {
        return render(payload);
    }
    else {
        const [err, str] = safeTry<string>(stringify, payload);
        if (err) {
            fastify.log.error(`[ERROR] Error occurred while parsing the stream data: ${err}`);
        } else {
            return str;
        }
    }

    return '';
}
