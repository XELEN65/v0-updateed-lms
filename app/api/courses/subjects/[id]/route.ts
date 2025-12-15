import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// PUT - Update subject
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { name, code } = await request.json();
        const { id } = params;

        await pool.execute('UPDATE subjects SET name = ?, code = ? WHERE id = ?', [name, code || null, id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update subject error:', error);
        return NextResponse.json({ error: 'Failed to update subject' }, { status: 500 });
    }
}

// DELETE - Delete subject
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        await pool.execute('DELETE FROM subjects WHERE id = ?', [id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete subject error:', error);
        return NextResponse.json({ error: 'Failed to delete subject' }, { status: 500 });
    }
}