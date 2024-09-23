export function and<T extends string | boolean | number>(
  value: T,
  ...values: (T extends string ? string | RegExp : T)[]
) {
  return values.every((v) => {
    switch (typeof value) {
      case 'string':
        const matcher = v as RegExp | string;
        return value.match(matcher).some((v) => v !== '');
      default:
        return value === v;
    }
  });
}
