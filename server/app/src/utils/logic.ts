export function and<T extends string | boolean | number>(
  value: T,
  ...values: (T extends string ? string | RegExp : T)[]
) {
  return values.every(handler.bind(value));
}
export function or<T extends string | boolean | number>(
  value: T,
  ...values: (T extends string ? string | RegExp : T)[]
) {
  return values.some(handler.bind(value));
}
function handler<T extends string | boolean | number>(
  this: T,
  value: T extends string ? string | RegExp : T,
  index: number,
  array: (T extends string ? string | RegExp : T)[]
) {
  switch (typeof this) {
    case 'string':
      const matcher = value as RegExp | string;
      return this.match(matcher).some((v) => v !== '');
    default:
      return this === value;
  }
}
