import type { PageSync } from "~/stack/types.ts";

export const page: PageSync = ({ send }) => {
    return send(
        <main>
            <h1>Nested Page</h1>
        </main>
    );
}
