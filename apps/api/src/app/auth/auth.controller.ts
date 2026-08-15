import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoginRequestSchema, SignupRequestSchema } from '@org/zod-schemas';
import type { AuthResponse, LoginRequest, SignupRequest } from '@org/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard, type AuthenticatedUser } from './jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @UsePipes(new ZodValidationPipe(SignupRequestSchema))
  @ApiOperation({ summary: 'Create a new account' })
  signup(@Body() dto: SignupRequest): Promise<AuthResponse> {
    return this.authService.signup(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(LoginRequestSchema))
  @ApiOperation({ summary: 'Sign in with email and password' })
  login(@Body() dto: LoginRequest): Promise<AuthResponse> {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get the current authenticated user' })
  async me(@CurrentUser() authUser: AuthenticatedUser) {
    const user = await this.authService.findById(authUser.sub);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
