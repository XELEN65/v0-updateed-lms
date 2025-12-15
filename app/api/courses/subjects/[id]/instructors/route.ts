import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

// GET - Fetch instructors for a subject
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        // Get assigned instructors
        const [assigned] = await pool.execute<RowDataPacket[]>(`
      SELECT 
        u.id,
        u.username,
        u.email,
        p.first_name,
        p.middle_name,
        p.last_name,
        p.department,
        p.employee_id
      FROM subject_instructors si
      JOIN users u ON si.instructor_id = u.id
      LEFT JOIN profiles p ON u.id = p. user_id
      WHERE si. subject_id = ?  AND u.role = 'teacher'
    `, [id]);

        return NextResponse.json({ success: true, data: assigned });
    } catch (error) {
        console.error('Fetch subject instructors error:', error);
        return NextResponse.json({ error: 'Failed to fetch instructors' }, { status: 500 });
    }
}

// POST - Assign instructor to subject
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const { instructorId } = await request.json();

        await pool.execute(
            'INSERT INTO subject_instructors (subject_id, instructor_id) VALUES (?, ?)',
            [id, instructorId]
        );

        return NextResponse.json({ success: true });
    } catch (error:  any) {
        if (error.code === 'ER_DUP_ENTRY') {
            return NextResponse. json({ error: 'Instructor already assigned' }, { status: 400 });
        }
        console.error('Assign instructor error:', error);
        return NextResponse.json({ error: 'Failed to assign instructor' }, { status:  500 });
    }
}

// DELETE - Remove instructor from subject
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id:  string } }
) {
    try {
        const { id } = params;
        const { searchParams } = new URL(request. url);
        const instructorId = searchParams.get('instructorId');

        await pool.execute(
            'DELETE FROM subject_instructors WHERE subject_id = ? AND instructor_id = ?',
            [id, instructorId]
        );

        return NextResponse. json({ success: true });
    } catch (error) {
        console.error('Remove instructor error:', error);
        return NextResponse. json({ error: 'Failed to remove instructor' }, { status: 500 });
    }
}