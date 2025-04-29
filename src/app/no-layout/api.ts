import type { Api } from "~/stack/types.ts";

export const api: Api[] = [
    {
        path: '/one',
        method: 'GET',
        handler: async ({ stream }) => {
            stream(`
                <!DOCTYPE html>
                <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                        <title>No Layout</title>
                    </head>
                    <body>
                        <main>
                            <h1>No Layout API</h1>
                            <p>/no-layout/api/one</p>
                        </main>
                    </body>
                </html>
            `);
        },
    },
    {
        path: '/many',
        method: 'GET',
        handler: async ({ stream }) => {
            stream(`
                <div>
                    <h1>No Layout API</h1>
                    <p>/no-layout/api/many</p>
                </div>
            `);

            const content = ['Content 1', 'Content 2', 'Content 3', 'Content 4', 'Content 5'];

            for (const str of content) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                stream(`
                    <div>
                        <p>${str}</p>
                    </div>
                `);
            }
        },
    }
]
