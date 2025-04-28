import type { FastifyInstance } from "fastify";
import type { Directory, PageStream, StreamCallbackOptions } from "~/stack/types.ts";
import { transformStream } from "./transform.ts";
import { Readable } from "stream";

export const registerStreamPage = (
    fastify: FastifyInstance,
    info: Directory,
) => {
    if (info.page?.handlerType !== 'stream') {
        fastify.log.error(`[ERROR] Page handler type is not stream`);
        return;
    }

    fastify.route({
        method: info.page.method,
        url: info.uri,
        handler: async (request, reply) => {
            const readableStream = new Readable();
            readableStream._read = () => {};

            const response: StreamCallbackOptions = {
                type: 'text/html',
                headers: {},
                encoding: 'utf-8',
            }

            let isStreaming = false;
            let hasEndedStream = false;
            let totalBytes = 0;

            await (info.page!.handler as PageStream)({
                set: (options) => {
                    if (hasEndedStream) {
                        fastify.log.warn(`[WARN] Cannot set headers after connection has ended.`);
                        return;
                    }
                    if (isStreaming) {
                        fastify.log.warn(`[WARN] Stream options are only applicable with the first invocation of 'stream'.`);
                        return;
                    }

                    if (options.headers) {
                        response.headers = options.headers;
                    }
                    if (options.type) {
                        response.type = options.type;
                        response.headers = {
                            ...response.headers,
                            'Content-Type': `${options.type}; charset=${response.encoding}`,
                        }
                    }
                    if (options.encoding) {
                        response.encoding = options.encoding;
                    }
                },
                stream: (payload, options) => {
                    if (hasEndedStream) {
                        fastify.log.warn(`[WARN] Cannot stream data after connection has ended.`);
                        return;
                    }
                    if (isStreaming && options) {
                        fastify.log.warn(`[WARN] Stream options are only applicable with the first invocation of 'stream'.`);
                    }

                    if (!isStreaming) {
                        reply.header('Content-Type', `${options?.type || 'text/html'}; charset=${options?.encoding || 'utf-8'}`);
                        reply.send(readableStream);
                        response.encoding = options?.encoding || 'utf-8';
                        isStreaming = true;
                    }

                    const data = transformStream(fastify, payload);
                    const bytes = Buffer.byteLength(data, 'utf-8');
                    totalBytes += bytes;

                    readableStream.push(data, response.encoding);
                    fastify.log.debug(`Streamed ${bytes} bytes of data`);
                },
                end: (payload) => {
                    if (!isStreaming) {
                        fastify.log.warn(`[ERROR] Cannot end stream. Stream has not started yet`);
                        return;
                    }
                    if (hasEndedStream) {
                        fastify.log.warn(`[ERROR] Cannot end stream. Stream has already ended`);
                        return;
                    }

                    isStreaming = false
                    hasEndedStream = true;

                    if (payload) {
                        const data = transformStream(fastify, payload);
                        const bytes = Buffer.byteLength(data, response.encoding);
                        totalBytes += bytes;

                        readableStream.push(data, response.encoding);
                        readableStream.push(null);

                        fastify.log.debug(`Streamed ${bytes} bytes of data`);
                        fastify.log.debug(`Stream ended after ${totalBytes} bytes of data`);
                    } else {
                        readableStream.push(null);
                        fastify.log.debug(`Stream ended after ${totalBytes} bytes of data`);
                    }
                },
                req: request,
                res: reply,
            });

            if (isStreaming && !hasEndedStream) {
                readableStream.push(null);
                fastify.log.debug(`Stream ended after ${totalBytes} bytes of data`);
            }
        }
    });

    fastify.log.debug(`Router_PageRoute(Stream)=${info.uri}`);
}
