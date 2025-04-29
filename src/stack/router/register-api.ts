import type { FastifyInstance } from "fastify";
import type {
    Api,
    Directory, StreamCallbackOptions,
} from "~/stack/types.ts";
import {Readable} from "stream";
import {transformStream} from "~/stack/router/transform.ts";

export const registerApi = (
    fastify: FastifyInstance,
    directory: Directory,
) => {
    directory.api!.endpoints.forEach((api: Api) => {
        const uri = (directory.uri.endsWith('/') ? directory.uri : directory.uri + '/')
            + 'api'
            + (api.path.startsWith('/') ? '' : '/')
            + (api.path.endsWith('/') ? api.path.slice(0, -1) : api.path);

        fastify.route({
            method: api.method,
            url: uri,
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

                await api.handler({
                    req: request,
                    res: reply,
                    set: (options) => {
                        if (isStreaming || hasEndedStream) {
                            fastify.log.warn(`[ERROR] Stream can only be set before or during the first invocation of 'stream'.`);
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
                            fastify.log.warn(`[ERROR] Cannot stream data after connection has ended.`);
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
                });

                if (isStreaming && !hasEndedStream) {
                    readableStream.push(null);
                    fastify.log.debug(`Stream ended after ${totalBytes} bytes of data`);
                }

                return reply;
            },
        });

        fastify.log.debug(`Router_ApiRoute='${uri}' (Stream)`);
    });
}
