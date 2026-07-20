const KEY_STORAGE = 'gestagua_key';

export function getKey(): string {
  return localStorage.getItem(KEY_STORAGE) ?? '';
}

export function setKey(key: string): void {
  localStorage.setItem(KEY_STORAGE, key);
}

export function clearKey(): void {
  localStorage.removeItem(KEY_STORAGE);
}
