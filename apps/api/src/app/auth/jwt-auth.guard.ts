import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { FastifyRequest } from 'fastify';

export interface AuthenticatedUser {
  sub: string;
  email: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: AuthenticatedUser }>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing bearer token.');
    }

    try {
      request.user = await this.jwtService.verifyAsync<AuthenticatedUser>(
        token,
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    return true;
  }

  private extractToken(request: FastifyRequest): string | undefined {
    const header = request.headers['authorization'];
    if (!header || Array.isArray(header)) return undefined;
    const [type, token] = header.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
