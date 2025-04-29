import type { PageSync } from "~/stack/types.ts";

export const page: PageSync = async ({ send }) => {
    return send(`
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>No Layout</title>
            </head>
            <body>
                <main>
                    <h1>No Layout Page</h1>
                </main>
            </body>
        </html>
    `, {
        useLayout: false
    });
}
