import { Role } from '../enums/role.enum';

export interface RequestUser {
  userId: string;
  businessId: string;
  role: Role;
  email: string;
  sessionId: string;
}
