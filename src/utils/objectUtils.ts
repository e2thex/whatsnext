export const whatChanged = <T extends Record<string, unknown>>(
    start: T, 
    partial: Partial<T> & Record<string, unknown>
): Partial<T> => {
    return Object.keys(partial)
        .filter(key => key in start)
        .reduce<Partial<T>>((acc, key) => (
            (start[key] !== partial[key]) ? {...acc, [key]: partial[key]} : acc
        ), {} as Partial<T>);
} 