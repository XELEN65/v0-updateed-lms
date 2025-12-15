import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// PUT - Update grade level
export async function PUT(
    request: NextRequest,
    { params }: { params:  { id: string } }
) {
    try {
        const { name } = await request.json();
        const { id } = params;

        await pool.execute('UPDATE grade_levels SET name = ? WHERE id = ?', [name, id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update grade level error:', error);
        return NextResponse.json({ error: 'Failed to update grade level' }, { status: 500 });
    }
}

// DELETE - Delete grade level
export async function DELETE(
    request: NextRequest,
    { params }: { params:  { id: string } }
) {
    try {
        const { id } = params;

        await pool.execute('DELETE FROM grade_levels WHERE id = ?', [id]);

        return NextResponse. json({ success: true });
    } catch (error) {
        console.error('Delete grade level error:', error);
        return NextResponse.json({ error: 'Failed to delete grade level' }, { status: 500 });
    }
}