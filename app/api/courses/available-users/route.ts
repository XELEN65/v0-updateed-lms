import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

// GET - Fetch available instructors or students
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const role = searchParams.get('role'); // 'teacher' or 'student'

        if (! role || ! ['teacher', 'student'].includes(role)) {
            return NextResponse.json({ error: 'Valid role is required (teacher or student)' }, { status: 400 });
        }

        const [users] = await pool.execute<RowDataPacket[]>(`
      SELECT 
        u.id,
        u.username,
        u. email,
        u.role,
        p.first_name,
        p.middle_name,
        p.last_name,
        p.department,
        p.employee_id
      FROM users u
      LEFT JOIN profiles p ON u.id = p. user_id
      WHERE u. role = ?
      ORDER BY p.last_name, p.first_name, u.username
    `, [role]);

        return NextResponse. json({ success: true, data:  users });
    } catch (error) {
        console.error('Fetch available users error:', error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}