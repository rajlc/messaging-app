import { Controller, Get, Put, Body, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/users')
export class UsersController {
    constructor(private usersService: UsersService) { }

    @UseGuards(AuthGuard('jwt'))
    @Get('profile')
    async getProfile(@Request() req) {
        const user = await this.usersService.findById(req.user.id);
        const { password_hash, ...result } = user;
        return result;
    }

    @UseGuards(AuthGuard('jwt'))
    @Put('profile')
    async updateProfile(@Request() req, @Body() body: any) {
        // Prevent updating sensitive fields via this endpoint
        const { role, status, platforms, accounts, is_delivery_person, ...safeUpdate } = body;
        return this.usersService.update(req.user.id, safeUpdate);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('check-active-status')
    async checkActiveStatus(@Request() req) {
        const user = await this.usersService.findById(req.user.id);
        return {
            isActive: user.status === 'active',
            status: user.status
        };
    }

    // Admin endpoints (Staff Management)

    @UseGuards(AuthGuard('jwt'))
    @Get('staff')
    async getStaff(@Request() req) {
        // In a real app, use a custom AdminGuard
        if (req.user.role?.toLowerCase() !== 'admin') throw new UnauthorizedException('Admin access required');
        return this.usersService.findAll();
    }

    @UseGuards(AuthGuard('jwt'))
    @Put('staff/:id')
    async updateStaff(@Request() req, @Body() body: any) {
        if (req.user.role?.toLowerCase() !== 'admin') throw new UnauthorizedException('Admin access required');

        // Allowed fields for admin update
        const { role, status, platforms, accounts, is_delivery_person } = body;
        return this.usersService.update(body.id, { role, status, platforms, accounts, is_delivery_person });
    }
}
