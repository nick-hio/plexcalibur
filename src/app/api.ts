import type { Api } from "~/stack/types.ts";

export const api: Api[] = [
    {
        path: '/get',
        method: 'GET',
        handler: async ({ stream }) => {
            stream('GET /api/get');
        },
    },
    {
        path: '/add',
        method: 'POST',
        handler: async ({ stream }) => {
            stream('POST /api/add');
        },
    },
    {
        path: '/update/:id',
        method: 'PUT',
        handler: async ({ stream }) => {
            stream('POST /api/update/:id');
        },
    },
    {
        path: '/delete/:id',
        method: 'DELETE',
        handler: async ({ stream }) => {
            stream('DELETE /api/delete/:id');
        },
    }
];
