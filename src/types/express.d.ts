declare global {
  namespace Express {
    interface User {
      sub: string;
      email: string;
      username: string;
      iss: string;
      aud: string;
      iat: number;
      exp: number;
    }
  }
}

export {};
