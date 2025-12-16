import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface InboxItem {
    id: string; // Fixed double space
    type: 'submission' | 'attendance' | 'grades' | 'enrollment' | 'notification';
    message: string;
    subjectId: number;
    subjectName: string;
    subjectCode: string;
    sectionName: string;
    gradeLevelName: string;
    schoolYear: string;
    semesterName: string;
    color: string;
    time: string;
    createdAt: Date;
    priority: 'high' | 'medium' | 'low';
    metadata?: any;
}

// GET - Fetch inbox items for a teacher
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const teacherId = searchParams.get('teacherId');
        const limit = parseInt(searchParams.get('limit') || '20', 10);

        if (!teacherId) {
            return NextResponse.json({ error: 'Teacher ID is required' }, { status: 400 });
        }

        const inboxItems: InboxItem[] = []; // Fixed double space
        const colors = [
            "from-blue-500 to-blue-600",
            "from-purple-500 to-purple-600",
            "from-green-500 to-green-600",
            "from-orange-500 to-orange-600",
            "from-pink-500 to-pink-600",
            "from-cyan-500 to-cyan-600",
        ];

        // Get teacher's subjects for reference
        const [subjects] = await pool.execute<RowDataPacket[]>(`
            SELECT
                sub.id,
                sub.name,
                sub.code,
                sec.name as section_name,
                gl.name as grade_level_name,
                sem.name as semester_name,
                sy.year as school_year
            FROM subject_instructors si
                     JOIN subjects sub ON si.subject_id = sub.id
                     JOIN sections sec ON sub.section_id = sec.id
                     JOIN grade_levels gl ON sec.grade_level_id = gl.id
                     JOIN semesters sem ON gl.semester_id = sem.id
                     JOIN school_years sy ON sem.school_year_id = sy.id
            WHERE si.instructor_id = ?
        `, [teacherId]); // Fixed space in SQL: gl. semester_id -> gl.semester_id

        const subjectMap = new Map(subjects.map((s, i) => [
            s.id,
            { ...s, color: colors[i % colors.length] } // Fixed space: ... s -> ...s
        ]));

        // 1. Get recent student submissions (ungraded) - HIGH PRIORITY
        const [pendingSubmissions] = await pool.execute<RowDataPacket[]>(`
            SELECT
                ss.submission_id,
                ss.submitted_at,
                sub_task.name as task_name,
                sub_task.subject_id,
                COUNT(*) as submission_count
            FROM student_submissions ss
                     JOIN subject_submissions sub_task ON ss.submission_id = sub_task.id
                     JOIN subject_instructors si ON sub_task.subject_id = si.subject_id
            WHERE si.instructor_id = ?
              AND ss.grade IS NULL
              AND ss.submitted_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY ss.submission_id, sub_task.subject_id, sub_task.name, DATE(ss.submitted_at)
            ORDER BY ss.submitted_at DESC
                LIMIT 10
        `, [teacherId]); // Fixed space: pool. execute -> pool.execute

        for (const submission of pendingSubmissions) {
            const subject = subjectMap.get(submission.subject_id);
            if (subject) {
                inboxItems.push({
                    id: `submission-${submission.submission_id}-${submission.submitted_at}`,
                    type: 'submission',
                    message: `${submission.submission_count} student${submission.submission_count > 1 ? 's' : ''} submitted "${submission.task_name}"`, // Fixed spaces in ternary
                    subjectId: submission.subject_id,
                    subjectName: subject.name,
                    subjectCode: subject.code || `SUB-${subject.id}`,
                    sectionName: subject.section_name,
                    gradeLevelName: subject.grade_level_name,
                    schoolYear: subject.school_year,
                    semesterName: subject.semester_name, // Fixed double space
                    color: subject.color,
                    time: formatRelativeTime(new Date(submission.submitted_at)),
                    createdAt: new Date(submission.submitted_at),
                    priority: 'high',
                    metadata: { submissionId: submission.submission_id, count: submission.submission_count }
                });
            }
        }

        // 2. Get recent attendance sessions created - MEDIUM PRIORITY
        const [recentAttendance] = await pool.execute<RowDataPacket[]>(`
            SELECT
                a.id,
                a.subject_id,
                a.session_date,
                a.session_time,
                a.created_at,
                (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = a.id) as student_count
            FROM attendance_sessions a
                     JOIN subject_instructors si ON a.subject_id = si.subject_id
            WHERE si.instructor_id = ?
              AND a.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ORDER BY a.created_at DESC
                LIMIT 10
        `, [teacherId]); // Fixed space in SQL: a. subject_id -> a.subject_id

        for (const attendance of recentAttendance) {
            const subject = subjectMap.get(attendance.subject_id); // Fixed space: attendance. subject_id -> attendance.subject_id
            if (subject) {
                inboxItems.push({
                    id: `attendance-${attendance.id}`,
                    type: 'attendance',
                    message: `Attendance session recorded for ${attendance.session_date}`,
                    subjectId: attendance.subject_id,
                    subjectName: subject.name,
                    subjectCode: subject.code || `SUB-${subject.id}`,
                    sectionName: subject.section_name,
                    gradeLevelName: subject.grade_level_name, // Fixed space: subject. grade_level_name -> subject.grade_level_name
                    schoolYear: subject.school_year,
                    semesterName: subject.semester_name,
                    color: subject.color,
                    time: formatRelativeTime(new Date(attendance.created_at)),
                    createdAt: new Date(attendance.created_at),
                    priority: 'medium',
                    metadata: { sessionId: attendance.id, studentCount: attendance.student_count }
                });
            }
        }

        // 3. Get recently graded submissions - LOW PRIORITY
        const [recentGrades] = await pool.execute<RowDataPacket[]>(`
            SELECT
                ss.submission_id,
                ss.graded_at,
                sub_task.name as task_name,
                sub_task.subject_id,
                COUNT(*) as graded_count
            FROM student_submissions ss
                     JOIN subject_submissions sub_task ON ss.submission_id = sub_task.id
                     JOIN subject_instructors si ON sub_task.subject_id = si.subject_id
            WHERE si.instructor_id = ?
              AND ss.grade IS NOT NULL
              AND ss.graded_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY ss.submission_id, sub_task.subject_id, sub_task.name, DATE(ss.graded_at)
            ORDER BY ss.graded_at DESC
                LIMIT 10
        `, [teacherId]); // Fixed spaces in SQL: ss. graded_at -> ss.graded_at (twice)

        for (const grade of recentGrades) {
            const subject = subjectMap.get(grade.subject_id); // Fixed space: subjectMap. get -> subjectMap.get
            if (subject) {
                inboxItems.push({
                    id: `grades-${grade.submission_id}-${grade.graded_at}`,
                    type: 'grades',
                    message: `${grade.graded_count} submission${grade.graded_count > 1 ? 's' : ''} graded for "${grade.task_name}"`, // Fixed ternary spaces
                    subjectId: grade.subject_id,
                    subjectName: subject.name, // Fixed double space
                    subjectCode: subject.code || `SUB-${subject.id}`,
                    sectionName: subject.section_name,
                    gradeLevelName: subject.grade_level_name,
                    schoolYear: subject.school_year, // Fixed double space
                    semesterName: subject.semester_name,
                    color: subject.color, // Fixed space: subject. color -> subject.color
                    time: formatRelativeTime(new Date(grade.graded_at)), // Fixed space: grade. graded_at -> grade.graded_at
                    createdAt: new Date(grade.graded_at), // Fixed space: grade. graded_at -> grade.graded_at
                    priority: 'low',
                    metadata: { submissionId: grade.submission_id, count: grade.graded_count } // Fixed space: grade. submission_id -> grade.submission_id
                });
            }
        }

        // 4. Get new student enrollments - MEDIUM PRIORITY
        const [newEnrollments] = await pool.execute<RowDataPacket[]>(`
            SELECT
                ss.subject_id,
                ss.enrolled_at,
                COUNT(*) as enrollment_count
            FROM subject_students ss
                     JOIN subject_instructors si ON ss.subject_id = si.subject_id
            WHERE si.instructor_id = ?
              AND ss.enrolled_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY ss.subject_id, DATE(ss.enrolled_at)
            ORDER BY ss.enrolled_at DESC
                LIMIT 10
        `, [teacherId]);

        for (const enrollment of newEnrollments) {
            const subject = subjectMap.get(enrollment.subject_id);
            if (subject) {
                inboxItems.push({
                    id: `enrollment-${enrollment.subject_id}-${enrollment.enrolled_at}`,
                    type: 'enrollment',
                    message: `${enrollment.enrollment_count} new student${enrollment.enrollment_count > 1 ? 's' : ''} enrolled`, // Fixed ternary spaces
                    subjectId: enrollment.subject_id, // Fixed space: enrollment. subject_id -> enrollment.subject_id
                    subjectName: subject.name,
                    subjectCode: subject.code || `SUB-${subject.id}`,
                    sectionName: subject.section_name,
                    gradeLevelName: subject.grade_level_name,
                    schoolYear: subject.school_year,
                    semesterName: subject.semester_name, // Fixed space: subject. semester_name -> subject.semester_name
                    color: subject.color, // Fixed double space
                    time: formatRelativeTime(new Date(enrollment.enrolled_at)),
                    createdAt: new Date(enrollment.enrolled_at),
                    priority: 'medium',
                    metadata: { count: enrollment.enrollment_count }
                });
            }
        }

        // Sort all items by created date (most recent first)
        inboxItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Fixed spaces: createdAt. getTime -> createdAt.getTime

        // Calculate stats
        const [pendingTasksResult] = await pool.execute<RowDataPacket[]>(`
            SELECT COUNT(DISTINCT ss.id) as count
            FROM student_submissions ss
                JOIN subject_submissions sub_task ON ss.submission_id = sub_task.id
                JOIN subject_instructors si ON sub_task.subject_id = si.subject_id
            WHERE si.instructor_id = ? AND ss.grade IS NULL
        `, [teacherId]); // Fixed space: pool. execute -> pool.execute

        const [newSubmissionsResult] = await pool.execute<RowDataPacket[]>(`
            SELECT COUNT(*) as count
            FROM student_submissions ss
                JOIN subject_submissions sub_task ON ss.submission_id = sub_task.id
                JOIN subject_instructors si ON sub_task.subject_id = si.subject_id
            WHERE si.instructor_id = ?
              AND ss.grade IS NULL
              AND ss.submitted_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        `, [teacherId]);

        const [unreviewedResult] = await pool.execute<RowDataPacket[]>(`
            SELECT COUNT(*) as count
            FROM student_submissions ss
                JOIN subject_submissions sub_task ON ss.submission_id = sub_task.id
                JOIN subject_instructors si ON sub_task.subject_id = si.subject_id
            WHERE si.instructor_id = ?
              AND ss.grade IS NULL
              AND ss.submitted_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `, [teacherId]); // Fixed space: pool. execute -> pool.execute

        const stats = {
            pendingTasks: parseInt(String(pendingTasksResult[0]?.count || 0), 10),
            newSubmissions: parseInt(String(newSubmissionsResult[0]?.count || 0), 10),
            unreviewed: parseInt(String(unreviewedResult[0]?.count || 0), 10),
        };

        return NextResponse.json({
            success: true,
            items: inboxItems.slice(0, limit), // Fixed space: inboxItems. slice -> inboxItems.slice
            stats,
        });
    } catch (error) {
        console.error('Fetch inbox error:', error);
        return NextResponse.json({ error: 'Failed to fetch inbox' }, { status: 500 });
    }
}

// Helper function to format relative time
function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000); // Fixed spaces: now. getTime -> now.getTime

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString();
}