export type OAuthClientType = "confidential" | "public";

export type OAuthClient = {
  clientId: string;
  name: string;
  description: string;
  logoUrl: string;
  ownerUserId: string;
  clientType: OAuthClientType;
  redirectUris: string[];
  createdAt: string;
  updatedAt: string;
};

export type OAuthClientWithSecret = OAuthClient & {
  clientSecret?: string;
};

export type AuthorizeRequest = {
  clientId: string;
  redirectUri: string;
  responseType: "code";
  scope: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: "S256" | "plain";
};

export type TokenResponse = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token?: string;
  scope: string;
  id_token?: string;
};

export type UserInfoClaims = {
  sub: string;
  name: string;
  email: string;
  email_verified: boolean;
  picture?: string;
  iss: string;
  aud: string;
};
