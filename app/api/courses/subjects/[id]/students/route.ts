import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

// GET - Fetch students for a subject
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        // Get assigned students
        const [assigned] = await pool.execute<RowDataPacket[]>(`
      SELECT 
        u.id,
        u.username,
        u.email,
        p.first_name,
        p.middle_name,
        p.last_name,
        p.department,
        p.employee_id as student_number
      FROM subject_students ss
      JOIN users u ON ss.student_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE ss.subject_id = ?  AND u.role = 'student'
    `, [id]);

        return NextResponse.json({ success: true, data: assigned });
    } catch (error) {
        console.error('Fetch subject students error:', error);
        return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
    }
}

// POST - Assign student to subject
export async function POST(
    request: NextRequest,
    { params }:  { params: { id: string } }
) {
    try {
        const { id } = params;
        const { studentId } = await request.json();

        await pool.execute(
            'INSERT INTO subject_students (subject_id, student_id) VALUES (?, ?)',
            [id, studentId]
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY') {
            return NextResponse.json({ error: 'Student already assigned' }, { status: 400 });
        }
        console. error('Assign student error:', error);
        return NextResponse.json({ error: 'Failed to assign student' }, { status: 500 });
    }
}

// DELETE - Remove student from subject
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id:  string } }
) {
    try {
        const { id } = params;
        const { searchParams } = new URL(request. url);
        const studentId = searchParams.get('studentId');

        await pool.execute(
            'DELETE FROM subject_students WHERE subject_id = ? AND student_id = ?',
            [id, studentId]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Remove student error:', error);
        return NextResponse.json({ error: 'Failed to remove student' }, { status: 500 });
    }
}