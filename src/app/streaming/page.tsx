import type { PageStream } from "~/stack/types.ts";

export const page: PageStream = async ({ stream }) => {
    stream(`
        <div>
            <h1>Streaming Page</h1>
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
}
