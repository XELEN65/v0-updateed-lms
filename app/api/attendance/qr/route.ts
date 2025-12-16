import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import crypto from 'crypto';

// POST - Generate QR token for a session
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { sessionId, subjectId, expiresInMinutes = 60, lateAfterMinutes = 15 } = body;

        if (!sessionId || !subjectId) {
            return NextResponse.json({ error: 'Session ID and Subject ID are required' }, { status: 400 }); // Fixed space: NextResponse. json and status:  400
        }

        // Generate unique token
        const qrToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

        // Update session with QR token
        await pool.execute(`
      UPDATE attendance_sessions 
      SET qr_token = ?, qr_expires_at = ?, allow_late_after_minutes = ?
      WHERE id = ? AND subject_id = ?
    `, [qrToken, expiresAt, lateAfterMinutes, sessionId, subjectId]);

        // Build QR URL - this will be scanned by students
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'; // Fixed space: process.env. NEXT
        const qrUrl = `${baseUrl}/attendance/scan?token=${qrToken}`; // Fixed space: ? token=

        return NextResponse.json({
            success: true,
            qrToken,
            qrUrl,
            expiresAt: expiresAt.toISOString(),
            lateAfterMinutes,
        });
    } catch (error) {
        console.error('Generate QR token error:', error);
        return NextResponse.json({ error: 'Failed to generate QR token' }, { status: 500 });
    }
}

// GET - Validate QR token and get session info (for students)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url); // Fixed space: request. url
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.json({ error: 'Token is required' }, { status: 400 });
        }

        // Find session by token
        const [sessions] = await pool.execute<RowDataPacket[]>(`
      SELECT 
        a.id as session_id,
        a.subject_id,
        a.session_date,
        a.session_time,
        a.qr_expires_at,
        a.allow_late_after_minutes,
        a.created_at as session_created_at,
        sub.name as subject_name,
        sub.code as subject_code,
        sec.name as section_name,
        gl.name as grade_level_name
      FROM attendance_sessions a
      JOIN subjects sub ON a.subject_id = sub.id
      JOIN sections sec ON sub.section_id = sec.id
      JOIN grade_levels gl ON sec.grade_level_id = gl.id
      WHERE a.qr_token = ?
    `, [token]); // Fixed space in SQL: a. subject_id

        if (sessions.length === 0) {
            return NextResponse.json({ error: 'Invalid or expired QR code' }, { status: 404 });
        }

        const session = sessions[0];

        // Check if token is expired
        if (session.qr_expires_at && new Date(session.qr_expires_at) < new Date()) {
            return NextResponse.json({ error: 'This QR code has expired' }, { status: 410 });
        }

        // Calculate if student would be marked as late
        const sessionStart = new Date(`${session.session_date}T${session.session_time || '00:00:00'}`);
        const lateThreshold = new Date(sessionStart.getTime() + (session.allow_late_after_minutes || 15) * 60 * 1000); // Fixed space: sessionStart. getTime
        const isLate = new Date() > lateThreshold;

        return NextResponse.json({
            success: true,
            session: { // Fixed double space
                id: session.session_id,
                subjectId: session.subject_id,
                subjectName: session.subject_name,
                subjectCode: session.subject_code,
                sectionName: session.section_name,
                gradeLevelName: session.grade_level_name,
                date: session.session_date,
                time: session.session_time,
            },
            willBeMarkedAs: isLate ? 'late' : 'present', // Fixed double space
            expiresAt: session.qr_expires_at,
        });
    } catch (error) {
        console.error('Validate QR token error:', error);
        return NextResponse.json({ error: 'Failed to validate QR token' }, { status: 500 });
    }
}

// PUT - Mark student attendance via QR scan
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { token, studentId } = body;

        if (!token || !studentId) {
            return NextResponse.json({ error: 'Token and Student ID are required' }, { status: 400 }); // Fixed double space
        }

        // Find session by token
        const [sessions] = await pool.execute<RowDataPacket[]>(`
      SELECT 
        a.id as session_id,
        a.subject_id,
        a.session_date,
        a.session_time,
        a.qr_expires_at,
        a.allow_late_after_minutes,
        a.created_at as session_created_at
      FROM attendance_sessions a
      WHERE a.qr_token = ?
    `, [token]); // Fixed space: pool. execute

        if (sessions.length === 0) {
            return NextResponse.json({ error: 'Invalid QR code' }, { status: 404 });
        }

        const session = sessions[0];

        // Check if token is expired
        if (session.qr_expires_at && new Date(session.qr_expires_at) < new Date()) { // Fixed space: session. qr_expires_at
            return NextResponse.json({ error: 'This QR code has expired' }, { status: 410 });
        }

        // Check if student is enrolled in the subject
        const [enrollment] = await pool.execute<RowDataPacket[]>(`
      SELECT id FROM subject_students WHERE subject_id = ? AND student_id = ?
    `, [session.subject_id, studentId]);

        if (enrollment.length === 0) {
            return NextResponse.json({ error: 'You are not enrolled in this subject' }, { status: 403 });
        }

        // Calculate status (present or late)
        const sessionStart = new Date(`${session.session_date}T${session.session_time || '00:00:00'}`); // Fixed space: session. session_time
        const lateThreshold = new Date(sessionStart.getTime() + (session.allow_late_after_minutes || 15) * 60 * 1000);
        const status = new Date() > lateThreshold ? 'late' : 'present';

        // Check if already marked
        const [existing] = await pool.execute<RowDataPacket[]>(`
      SELECT id, status FROM attendance_records WHERE session_id = ? AND student_id = ?
    `, [session.session_id, studentId]);

        if (existing.length > 0) {
            // Already marked - check if it was via QR (present/late) or manual
            if (existing[0].status === 'present' || existing[0].status === 'late') {
                return NextResponse.json({
                    success: true,
                    message: 'You have already marked your attendance', // Fixed double space
                    status: existing[0].status,
                    alreadyMarked: true
                });
            }

            // Update from absent to present/late
            await pool.execute(`
        UPDATE attendance_records SET status = ? WHERE session_id = ? AND student_id = ?
      `, [status, session.session_id, studentId]); // Fixed trailing space in SQL
        } else {
            // Insert new record
            await pool.execute(`
        INSERT INTO attendance_records (session_id, student_id, status) VALUES (?, ?, ?)
      `, [session.session_id, studentId, status]);
        }

        return NextResponse.json({
            success: true,
            message: `You have been marked as ${status}`,
            status,
            sessionId: session.session_id,
        });
    } catch (error) {
        console.error('Mark QR attendance error:', error);
        return NextResponse.json({ error: 'Failed to mark attendance' }, { status: 500 });
    }
}