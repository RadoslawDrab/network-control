export type Path = '/';
export async function promise<
  Data extends Record<string, any>,
  Query = Record<string, string | string[] | boolean | boolean[] | number | number[]>
>(
  path: Path | string,
  query?: Query,
  init?: RequestInit,
  baseUrl: string = import.meta.env.DEV ? 'http://localhost:3000/api' : '/api'
): Promise<Data> {
  const queryString =
    query && Object.keys(query).length > 0
      ? Object.keys(query).reduce((str, key, i) => (str += `${i > 0 ? '&' : ''}${key}=${query[key]}`), '?')
      : '';

  const response = await fetch(baseUrl + path.replace(/\/$/, '') + queryString, {
    method: 'GET',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });

  if (!response.ok) {
    throw await response.json();
  }
  return await response.json();
}
