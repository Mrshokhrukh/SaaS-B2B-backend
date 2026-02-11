import { Role } from '../enums/role.enum';

export interface RequestUser {
  sub: string;
  businessId: string;
  role: Role;
  email: string;
}
