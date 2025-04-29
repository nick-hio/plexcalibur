export type RateLimitTableRow = {
    ip: string,
    requests: number,
    lastReq: number,
}
