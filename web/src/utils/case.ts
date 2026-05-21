type CamelKey<S extends string> = S extends `${infer H}_${infer T}` ? `${H}${Capitalize<CamelKey<T>>}` : S;

export type SnakeToCamel<T> =
  T extends Array<infer U>
    ? Array<SnakeToCamel<U>>
    : T extends object
      ? { [K in keyof T as CamelKey<K & string>]: SnakeToCamel<T[K]> }
      : T;

type Dict = { [key: string]: unknown };

const toCamel = (key: string) => key.replaceAll(/_([a-z])/g, (_, c) => (c as string).toUpperCase());
const toSnake = (key: string) => key.replaceAll(/([A-Z])/g, (c) => `_${c.toLowerCase()}`);

const mapKeysDeep = (value: unknown, rename: (key: string) => string): unknown => {
  if (Array.isArray(value)) return value.map((v) => mapKeysDeep(v, rename));
  if (value && typeof value === 'object' && value.constructor === Object) {
    const out: Dict = {};
    for (const [k, v] of Object.entries(value as Dict)) out[rename(k)] = mapKeysDeep(v, rename);
    return out;
  }
  return value;
};

export const snakeToCamel = <T>(value: unknown): T => mapKeysDeep(value, toCamel) as T;
export const camelToSnake = <T>(value: unknown): T => mapKeysDeep(value, toSnake) as T;
