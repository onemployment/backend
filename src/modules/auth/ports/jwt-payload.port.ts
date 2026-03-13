export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}
