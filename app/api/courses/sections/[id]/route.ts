import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// PUT - Update section
export async function PUT(
    request: NextRequest,
    { params }: { params:  { id: string } }
) {
    try {
        const { name } = await request.json();
        const { id } = params;

        await pool.execute('UPDATE sections SET name = ? WHERE id = ?', [name, id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update section error:', error);
        return NextResponse.json({ error: 'Failed to update section' }, { status: 500 });
    }
}

// DELETE - Delete section
export async function DELETE(
    request: NextRequest,
    { params }:  { params: { id: string } }
) {
    try {
        const { id } = params;

        await pool.execute('DELETE FROM sections WHERE id = ?', [id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete section error:', error);
        return NextResponse.json({ error: 'Failed to delete section' }, { status:  500 });
    }
}