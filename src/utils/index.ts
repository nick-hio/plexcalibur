export const safeTry = <T, E = Error>(
    func: Function,
    ...params: any[]
): [null, T] | [E, null] => {
    try {
        const result = func(...params);
        return [null, result];
    } catch (err) {
        return [err as E, null];
    }
}

const safeAwait = async <T, E = Error>(
    promise: Promise<T>
): Promise<[null, T] | [E, null]> => {
    try {
        const result = await promise;
        return [null, result];
    } catch (err) {
        return [err as E, null];
    }
}
