import type { FastifyInstance } from "fastify";
import type {
    Layout,
    Directory,
    PageStream,
} from "~/stack/types.ts";
import { transformStream } from "./transform.ts";

export const registerStreamPage = (
    fastify: FastifyInstance,
    info: Directory,
    layoutHandler: Layout | null,
) => {
    if (info.page?.handlerType !== 'stream') {
        fastify.log.error(`[ERROR] Page handler type is not stream`);
        return;
    }

    fastify.route({
        method: info.page.method,
        url: info.uri,
        handler: async (request, reply) => {
            let isStreaming = false;
            let hasEndedStream = false;
            let totalBytes = 0;

            await (info.page!.handler as PageStream)({
                stream: (payload, options) => {
                    // Check if stream has ended
                    if (hasEndedStream) {
                        fastify.log.warn(`[ERROR] Cannot stream data after connection has ended.`);
                        return;
                    }

                    // Start stream if not already started
                    if (!isStreaming && !hasEndedStream) {
                        reply.raw.writeHead(options?.status || 200, {
                            'Content-Type': `${options?.type || 'text/html'}; charset=${options?.encoding || 'utf-8'}`,
                            'X-Content-Type-Options': 'nosniff',
                            'Connection': 'keep-alive',
                            ...options?.headers,
                        });
                        isStreaming = true;
                    }

                    // Implement layout handler (?)
                    const data = transformStream(fastify, payload);
                    const bytes = Buffer.byteLength(data, 'utf-8');
                    totalBytes += bytes;

                    reply.raw.write(data, (err) => {
                        if (err) {
                            fastify.log.error(`[ERROR] Error while streaming ${bytes} bytes of data: ${err}`);
                        } else {
                            fastify.log.debug(`Streamed ${bytes} bytes of data`);
                        }
                    });
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
                        const bytes = Buffer.byteLength(data, 'utf-8');
                        totalBytes += bytes;

                        reply.raw.end(data, () => {
                            fastify.log.debug(`Streamed ${bytes} bytes of data`);
                            fastify.log.debug(`Stream ended after ${totalBytes} bytes of data`);
                        });
                    } else {
                        reply.raw.end(() => {
                            fastify.log.debug(`Stream ended after ${totalBytes} bytes of data`);
                        });
                    }
                },
                req: request,
                res: reply,
            });

            if (isStreaming && !hasEndedStream) {
                reply.raw.end(() => {
                    fastify.log.debug(`Stream ended after ${totalBytes} bytes of data`);
                })
            }
        }
    });

    fastify.log.debug(`Router_PageRoute(Stream)=${info.uri}`);
}
