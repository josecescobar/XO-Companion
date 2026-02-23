import { Strategy, StrategyOptions } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

type StrategyOptionsWithReq = Extract<StrategyOptions, { passReqToCallback: true }>;

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: (req: Request) => {
        // Cookie-first (web), body-fallback (mobile)
        return req?.cookies?.['xo_refresh_token']
          || req?.body?.refreshToken
          || null;
      },
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET')!,
      passReqToCallback: true,
    } as StrategyOptionsWithReq);
  }

  validate(req: Request, payload: { sub: string; family: string }) {
    const refreshToken = req.cookies?.['xo_refresh_token'] || req.body?.refreshToken;
    return { ...payload, refreshToken };
  }
}
