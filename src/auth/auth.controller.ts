import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/auth.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /* -------- Signup -------- */
  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.auth.signup(dto);
  }

  /* -------- Login -------- */
  @UseGuards(AuthGuard('local')) // Local strategy validated creds
  @Post('login')
  login(@Req() req) {
    // req.user is attached by LocalStrategy.validate
    return this.auth.login(req.user);
  }

  /* -------- Protected route example -------- */
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@Req() req) {
    return req.user; // set by JwtStrategy.validate
  }
}
