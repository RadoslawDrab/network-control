import { promise } from './server';

export async function getToken(password: string) {
  try {
    const { token } = await promise<{ token: string; isValid: boolean }>('/login/token', {}, { headers: { password } });
    return token;
  } catch (error) {
    throw error;
  }
}
export async function checkToken(token: string): Promise<boolean> {
  try {
    const { isValid } = await promise<{ token: string; isValid: boolean }>('/login', {}, { headers: { token } });
    return isValid;
  } catch (error) {
    return false;
  }
}
export async function changePassword(password: string, token: string) {
  try {
    await promise(
      '/login',
      {},
      {
        method: 'put',
        headers: {
          token,
        },
        body: JSON.stringify({
          password,
        }),
      }
    );
  } catch (error) {
    throw error;
  }
}
