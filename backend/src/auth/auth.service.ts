import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService, UserStatus } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        try {
            const user = await this.usersService.findByEmail(email);
            if (user && await bcrypt.compare(pass, user.password_hash)) {
                // Check user status and provide specific error messages
                if (user.status === UserStatus.PENDING) {
                    return { error: 'Your account is pending approval. Please contact an admin.' };
                }
                if (user.status === UserStatus.DEACTIVE) {
                    return { error: 'Your account has been disabled. Please contact support.' };
                }
                if (user.status !== UserStatus.ACTIVE) {
                    return { error: 'Your account is not active. Please contact support.' };
                }
                const { password_hash, ...result } = user;
                return result;
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    async login(user: any) {
        if (user.error) {
            throw new UnauthorizedException(user.error);
        }
        const payload = {
            email: user.email,
            sub: user.id,
            role: user.role,
            platforms: user.platforms,
            accounts: user.accounts
        };
        return {
            access_token: this.jwtService.sign(payload),
            user: user
        };
    }

    async register(userDto: any) {
        return this.usersService.create(userDto);
    }
}
