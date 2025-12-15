import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// PUT - Update school year
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { year } = await request.json();
        const { id } = params;

        await pool.execute('UPDATE school_years SET year = ?  WHERE id = ?', [year, id]);

        return NextResponse. json({ success: true });
    } catch (error) {
        console.error('Update school year error:', error);
        return NextResponse.json({ error: 'Failed to update school year' }, { status: 500 });
    }
}

// DELETE - Delete school year
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        await pool.execute('DELETE FROM school_years WHERE id = ?', [id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete school year error:', error);
        return NextResponse. json({ error: 'Failed to delete school year' }, { status:  500 });
    }
}