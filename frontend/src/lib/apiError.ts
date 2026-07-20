export function getApiErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return 'falha desconhecida';

  if ('status' in error) {
    const status = error.status;
    if (status === 'FETCH_ERROR' && 'error' in error && typeof error.error === 'string') {
      return error.error;
    }
    if (status === 'TIMEOUT_ERROR') return 'tempo de resposta esgotado';
    if (typeof status === 'number') {
      const data = 'data' in error ? error.data : null;
      if (data && typeof data === 'object') {
        if ('erro' in data && typeof data.erro === 'string') return data.erro;
        if ('message' in data && typeof data.message === 'string') return data.message;
      }
      return `HTTP ${status}`;
    }
  }

  if ('message' in error && typeof error.message === 'string') return error.message;
  return 'falha desconhecida';
}

export function hasApiStatus(error: unknown, status: number): boolean {
  return Boolean(error && typeof error === 'object' && 'status' in error && error.status === status);
}
