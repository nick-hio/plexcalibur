import type { Api } from "~/stack/types.ts";

export const api: Api = {
    path: '/get',
    method: 'GET',
    handler: async ({ stream }) => {
        stream({
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
}
