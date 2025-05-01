import type { PageSync } from "~/stack/types.ts";

// export const method = 'GET'; // Optional

export const page: PageSync = ({ send }) => {
    return send(
        <main>
            <h1>Home Page</h1>
        </main>
    );
}
