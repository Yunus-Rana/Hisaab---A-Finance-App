export type RepositoryErrorCode = 'not-found' | 'duplicate' | 'in-use' | 'storage';

export class RepositoryError extends Error {
  constructor(
    message: string,
    readonly code: RepositoryErrorCode,
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}
