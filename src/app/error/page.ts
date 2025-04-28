import type { PageAsync } from "~/stack/types.ts";

export const page: PageAsync = async ({ send, error }) => {
    if (Math.random() < 0.5) {
        return error({
            message: 'An error occurred!',
        });
    }

    send(`
        <main>
            <h1>Error Page</h1>
            <p>No error, congrats!</p>
        </main>
    `);
}
