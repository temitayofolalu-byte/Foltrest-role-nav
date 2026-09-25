import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 registration attempts per minute per IP
  @Post('register')
  register(@Body() body: any) { return this.auth.register(body); }

  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 reset requests per minute per IP -- stops email-bombing someone
  @Post('forgot-password')
  requestReset(@Body() body: { email: string }) { return this.auth.requestPasswordReset(body.email); }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  resetPassword(@Body() body: { token: string; password: string }) { return this.auth.resetPassword(body.token, body.password); }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  login(@Body() body: { email: string; password: string }) { return this.auth.login(body.email, body.password); }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('verify-email')
  verifyEmail(@Body() body: { token: string }) { return this.auth.verifyEmail(body.token); }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('resend-verification')
  resendVerification(@Body() body: { email: string }) { return this.auth.resendVerification(body.email); }
}
