import type { PageAsync } from "~/stack/types.ts";

export const page: PageAsync = async ({ send }) => {
    await send({
        title: 'JSON Page',
        description: 'This is a JSON page.',
        content: {
            message: 'Hello, world!',
            items: [
                { id: 1, name: 'Item 1' },
                { id: 2, name: 'Item 2' },
                { id: 3, name: 'Item 3' },
            ],
        },
    });
}
