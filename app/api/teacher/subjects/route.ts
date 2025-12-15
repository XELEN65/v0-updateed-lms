import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface SubjectRow extends RowDataPacket {
    id: number;
    name: string;
    code: string | null;
    section_id: number | null;
    section_name: string | null;
    grade_level_id: number | null;
    grade_level_name: string | null;
    semester_id: number | null;
    semester_name: string | null;
    school_year_id: number | null;
    school_year: string | null;
    student_count: number;
}

// GET - Fetch subjects assigned to a teacher
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const teacherId = searchParams.get('teacherId');
        const semesterFilter = searchParams.get('semester');
        const yearFilter = searchParams.get('year');

        if (!teacherId) {
            return NextResponse.json(
                { error: 'Teacher ID is required' },
                { status: 400 }
            );
        }

        // EDITED: Changed strict JOIN to LEFT JOIN to ensure subjects appear even if
        // their linked section/semester/year data is incomplete or missing.
        let query = `
            SELECT 
                sub.id,
                sub.name,
                sub.code,
                sub.section_id,
                sec.name as section_name,
                gl.id as grade_level_id,
                gl.name as grade_level_name,
                sem.id as semester_id,
                sem.name as semester_name,
                sy.id as school_year_id,
                sy.year as school_year,
                (SELECT COUNT(*) FROM subject_students ss WHERE ss.subject_id = sub.id) as student_count
            FROM subject_instructors si
            JOIN subjects sub ON si.subject_id = sub.id
            LEFT JOIN sections sec ON sub.section_id = sec.id
            LEFT JOIN grade_levels gl ON sec.grade_level_id = gl.id
            LEFT JOIN semesters sem ON gl.semester_id = sem.id
            LEFT JOIN school_years sy ON sem.school_year_id = sy.id
            WHERE si.instructor_id = ?
        `;

        const params: (string | number)[] = [parseInt(teacherId, 10)];

        // Add semester filter
        if (semesterFilter && semesterFilter !== 'all') {
            query += ` AND sem.name = ?`;
            params.push(semesterFilter);
        }

        // Add year filter
        if (yearFilter && yearFilter !== 'all') {
            query += ` AND sy.year = ?`;
            params.push(yearFilter);
        }

        query += ` ORDER BY sy.year DESC, sem.name ASC, gl.name ASC, sec.name ASC, sub.name ASC`;

        const [subjects] = await pool.execute<SubjectRow[]>(query, params);

        // Get unique semesters and years for filter dropdowns
        // EDITED: Also updated these to LEFT JOINs to match the main query logic
        const [semesters] = await pool.execute<RowDataPacket[]>(`
            SELECT DISTINCT sem.name
            FROM subject_instructors si
                     JOIN subjects sub ON si.subject_id = sub.id
                     LEFT JOIN sections sec ON sub.section_id = sec.id
                     LEFT JOIN grade_levels gl ON sec.grade_level_id = gl.id
                     LEFT JOIN semesters sem ON gl.semester_id = sem.id
            WHERE si.instructor_id = ? AND sem.name IS NOT NULL
            ORDER BY sem.name
        `, [parseInt(teacherId, 10)]);

        const [years] = await pool.execute<RowDataPacket[]>(`
            SELECT DISTINCT sy.year
            FROM subject_instructors si
                     JOIN subjects sub ON si.subject_id = sub.id
                     LEFT JOIN sections sec ON sub.section_id = sec.id
                     LEFT JOIN grade_levels gl ON sec.grade_level_id = gl.id
                     LEFT JOIN semesters sem ON gl.semester_id = sem.id
                     LEFT JOIN school_years sy ON sem.school_year_id = sy.id
            WHERE si.instructor_id = ? AND sy.year IS NOT NULL
            ORDER BY sy.year DESC
        `, [parseInt(teacherId, 10)]);

        // Map subjects with color based on index
        const colors = [
            "from-blue-500 to-blue-600",
            "from-purple-500 to-purple-600",
            "from-green-500 to-green-600",
            "from-orange-500 to-orange-600",
            "from-pink-500 to-pink-600",
            "from-cyan-500 to-cyan-600",
            "from-indigo-500 to-indigo-600",
            "from-teal-500 to-teal-600",
        ];

        // EDITED: Added fallbacks (|| 'Unknown') for properties that might be null due to LEFT JOIN
        const mappedSubjects = subjects.map((subject, index) => ({
            id: subject.id,
            name: subject.name,
            code: subject.code || `SUB-${subject.id}`,
            sectionId: subject.section_id || 0,
            sectionName: subject.section_name || 'Unknown Section',
            gradeLevelId: subject.grade_level_id || 0,
            gradeLevelName: subject.grade_level_name || 'Grade N/A',
            semesterId: subject.semester_id || 0,
            semesterName: subject.semester_name || 'Semester N/A',
            schoolYearId: subject.school_year_id || 0,
            schoolYear: subject.school_year || 'Year N/A',
            studentCount: subject.student_count,
            color: colors[index % colors.length],
        }));

        return NextResponse.json({
            success: true,
            subjects: mappedSubjects,
            filters: {
                semesters: semesters.map(s => s.name),
                years: years.map(y => y.year),
            }
        });
    } catch (error) {
        console.error('Fetch teacher subjects error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch subjects' },
            { status: 500 }
        );
    }
}