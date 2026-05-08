import { Controller, Request, Post, UseGuards, Body, BadRequestException, UnauthorizedException, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport'; // We can use 'local' or manual

@Controller('api/auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    async login(@Body() body) {
        const user = await this.authService.validateUser(body.email, body.password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return this.authService.login(user);
    }

    @Post('signup')
    async signup(@Body() body) {
        try {
            const user = await this.authService.register(body);
            return {
                success: true,
                message: 'Registration successful. Please wait for admin approval.',
                user: { email: user.email, status: user.status }
            };
        } catch (error) {
            if (error.code === '23505') { // Unique violation
                throw new BadRequestException('Email already exists');
            }
            throw new BadRequestException('Registration failed');
        }
    }
}
