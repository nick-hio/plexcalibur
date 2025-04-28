import type { PageAsync } from "~/stack/types.ts";

// export const method = 'GET'; // Optional

export const page: PageAsync = async ({ send }) => {
    send(`
        <main>
            <h1>Home Page</h1>
        </main>
    `);
}
