import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// PUT - Update semester
export async function PUT(
    request:  NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { name } = await request.json();
        const { id } = params;

        await pool.execute('UPDATE semesters SET name = ? WHERE id = ?', [name, id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update semester error:', error);
        return NextResponse.json({ error: 'Failed to update semester' }, { status: 500 });
    }
}

// DELETE - Delete semester
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        await pool.execute('DELETE FROM semesters WHERE id = ? ', [id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete semester error:', error);
        return NextResponse.json({ error: 'Failed to delete semester' }, { status: 500 });
    }
}