import { Role } from '../enums/role.enum';

export interface JwtPayload {
  sub: string;
  businessId: string;
  role: Role;
  email: string;
  sessionId: string;
  type: 'access' | 'refresh';
}
