import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '../../common/enums/role.enum';
import { RequestUser } from '../../common/types/request-user.type';

interface JwtPayload {
  sub: string;
  businessId: string;
  role: Role;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret', { infer: true }),
    });
  }

  validate(payload: JwtPayload): RequestUser {
    return {
      sub: payload.sub,
      businessId: payload.businessId,
      role: payload.role,
      email: payload.email,
    };
  }
}
