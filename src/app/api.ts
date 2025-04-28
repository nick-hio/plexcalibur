import type { ApiObject } from "~/stack/types.ts";

export const api: ApiObject[] = [
    {
        path: '/get',
        method: 'GET',
        handler: async (req, res) => {
            return res.send('GET /get');
        },
    },
    {
        path: '/add',
        method: 'POST',
        handler: async (req, res) => {
            return res.code(201).send('POST /add');
        },
    },
    {
        path: '/update/:id',
        method: 'PUT',
        handler: async (req, res) => {
            return res.send('POST /update/:id');
        },
    },
    {
        path: '/delete/:id',
        method: 'DELETE',
        handler: async (req, res) => {
            return res.send('DELETE /delete/:id');
        },
    }
];
