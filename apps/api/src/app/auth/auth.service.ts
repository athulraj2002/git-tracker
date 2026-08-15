import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import type { AuthResponse, LoginRequest, SignupRequest } from '@org/types';
import { DRIZZLE, type DrizzleDb } from '../database/database.module';
import { users, type User } from '../database/schema';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly jwtService: JwtService,
  ) {}

  async signup(dto: SignupRequest): Promise<AuthResponse> {
    const existing = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email),
    });
    if (existing) {
      throw new ConflictException(
        'An account with this email already exists.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const [user] = await this.db
      .insert(users)
      .values({ name: dto.name, email: dto.email, passwordHash })
      .returning();

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginRequest): Promise<AuthResponse> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email),
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.buildAuthResponse(user);
  }

  findById(id: string): Promise<User | undefined> {
    return this.db.query.users.findFirst({ where: eq(users.id, id) });
  }

  private async buildAuthResponse(user: User): Promise<AuthResponse> {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
      },
      accessToken,
    };
  }
}
