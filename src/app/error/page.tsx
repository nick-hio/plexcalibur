import type { PageAsync } from "~/stack/types.ts";

export const page: PageAsync = async ({ send, error }) => {
    if (Math.random() < 0.5) {
        return await error({
            message: 'An error occurred!',
        });
    }

    await send(
        <main>
            <h1>Error Page</h1>
            <p>No error, congrats!</p>
        </main>
    );
}
