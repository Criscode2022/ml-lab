import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export type AuthPayload = { sub: string; email: string };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ headers: { authorization?: string }; user?: AuthPayload }>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    try {
      req.user = this.jwt.verify<AuthPayload>(header.slice(7));
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}

export function currentUser(req: { user?: AuthPayload }): AuthPayload {
  if (!req.user) throw new UnauthorizedException();
  return req.user;
}
