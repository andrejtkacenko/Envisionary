/**
 * @fileOverview Defines a custom error class for Google authentication issues.
 */

export class GoogleAuthError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'GoogleAuthError';
    }
}
