import { Injectable } from '@nestjs/common';
import { supabaseService } from '../supabase/supabase.service';
import * as bcrypt from 'bcrypt';

export enum UserRole {
    ADMIN = 'admin',
    EDITOR = 'editor',
    USER = 'user',
    RIDER = 'rider',
}

export enum UserStatus {
    PENDING = 'pending',
    ACTIVE = 'active',
    DEACTIVE = 'deactive',
}

@Injectable()
export class UsersService {
    constructor() { }

    async findByEmail(email: string) {
        const { data, error } = await supabaseService.getClient()
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
            throw error;
        }

        return data;
    }

    async findById(id: string) {
        const { data, error } = await supabaseService.getClient()
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    async create(userData: any) {
        const salt = await bcrypt.genSalt();
        const hash = await bcrypt.hash(userData.password, salt);

        const newUser = {
            email: userData.email,
            password_hash: hash,
            full_name: userData.fullName,
            phone: userData.phone,
            role: 'user', // Default
            status: 'pending', // Default
            platforms: [],
            accounts: [],
            is_delivery_person: false,
        };

        const { data, error } = await supabaseService.getClient()
            .from('users')
            .insert(newUser)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async update(id: string, updateData: any) {
        if (updateData.password) {
            const salt = await bcrypt.genSalt();
            updateData.password_hash = await bcrypt.hash(updateData.password, salt);
            delete updateData.password;
        }

        const { data, error } = await supabaseService.getClient()
            .from('users')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async findAll() {
        const { data, error } = await supabaseService.getClient()
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }
}
