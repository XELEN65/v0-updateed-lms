"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Filter, BarChart3, RefreshCw, Loader2, Calendar } from "lucide-react"

interface Subject {
  id: number
  name: string
  code: string
  sectionId: number
  sectionName: string
  gradeLevelId: number
  gradeLevelName: string
  semesterId: number
  semesterName: string
  schoolYearId: number
  schoolYear: string
  studentCount: number
  color: string
}

interface AttendanceStats {
  subjectId: number
  totalSessions: number
  totalPresent: number
  totalAbsent: number
  totalLate: number
  totalStudents: number
  averageAttendance: number
}

interface SubjectWithAttendance extends Subject {
  stats: AttendanceStats | null
}

interface SubjectForRedirect {
  id: number
  name: string
  code: string
  sectionName: string
  gradeLevelName: string
  semesterName: string
  schoolYear: string
  studentCount: number
  color: string
}

interface InstructorAttendanceProps {
  teacherId: number | null | undefined
  onSubjectClick?: (subject: SubjectForRedirect, tabType: "attendance") => void
}

export default function InstructorAttendance({ teacherId, onSubjectClick }: InstructorAttendanceProps) {
  const [subjects, setSubjects] = useState<SubjectWithAttendance[]>([])
  const [filters, setFilters] = useState<{ semesters: string[]; years: string[] }>({ semesters: [], years: [] })
  const [filterSemester, setFilterSemester] = useState("all")
  const [filterYear, setFilterYear] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Aggregate stats
  const [overallStats, setOverallStats] = useState({
    averageAttendance: 0,
    totalSessions: 0,
    activeClasses: 0,
  })

  const fetchSubjectsWithAttendance = useCallback(async () => {
    if (!teacherId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Build query params
      const params = new URLSearchParams({ teacherId: teacherId.toString() })
      if (filterSemester !== "all") params.append("semester", filterSemester)
      if (filterYear !== "all") params.append("year", filterYear)

      // Fetch subjects
      const subjectsResponse = await fetch(`/api/teacher/subjects?${params}`)
      const subjectsData = await subjectsResponse.json()

      if (!subjectsData.success) {
        setError(subjectsData.error || "Failed to fetch subjects")
        return
      }

      // Update filters on first load
      if (filters.semesters.length === 0 && subjectsData.filters) {
        setFilters(subjectsData.filters)
      }

      // Fetch attendance stats for each subject
      const subjectsWithStats: SubjectWithAttendance[] = await Promise.all(
          subjectsData.subjects.map(async (subject: Subject) => {
            try {
              const statsResponse = await fetch(`/api/teacher/subjects/${subject.id}/attendance/stats`)
              const statsData = await statsResponse.json()
              return {
                ...subject,
                stats: statsData.success ? statsData.stats : null,
              }
            } catch {
              return { ...subject, stats: null }
            }
          })
      )

      setSubjects(subjectsWithStats)

      // Calculate overall stats
      const totalSessions = subjectsWithStats.reduce((sum, s) => sum + (s.stats?.totalSessions || 0), 0)
      const totalPresent = subjectsWithStats.reduce((sum, s) => sum + (s.stats?.totalPresent || 0), 0)
      const totalRecords = subjectsWithStats.reduce(
          (sum, s) => sum + (s.stats?.totalPresent || 0) + (s.stats?.totalAbsent || 0) + (s.stats?.totalLate || 0),
          0
      )
      const avgAttendance = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0

      setOverallStats({
        averageAttendance: avgAttendance,
        totalSessions,
        activeClasses: subjectsWithStats.length,
      })
    } catch (err) {
      console.error("Failed to fetch attendance data:", err)
      setError("Failed to connect to server")
    } finally {
      setIsLoading(false)
    }
  }, [teacherId, filterSemester, filterYear, filters.semesters.length])

  useEffect(() => {
    fetchSubjectsWithAttendance()
  }, [fetchSubjectsWithAttendance])

  const handleSubjectClick = (subject: SubjectWithAttendance) => {
    const redirectSubject: SubjectForRedirect = {
      id: subject.id,
      name: subject.name,
      code: subject.code,
      sectionName: subject.sectionName,
      gradeLevelName: subject.gradeLevelName,
      semesterName: subject.semesterName,
      schoolYear: subject.schoolYear,
      studentCount: subject.studentCount,
      color: subject.color,
    }
    onSubjectClick?.(redirectSubject, "attendance")
  }

  // Calculate attendance percentage for a subject
  const getAttendancePercentage = (stats: AttendanceStats | null): string => {
    if (!stats) return "N/A"
    if (stats.totalSessions === 0) return "N/A"

    // Use the pre-calculated averageAttendance from the API
    if (stats.averageAttendance !== undefined) {
      return `${stats.averageAttendance}%`
    }

    // Fallback calculation
    const total = stats.totalPresent + stats.totalAbsent + stats.totalLate
    if (total === 0) return "N/A"
    const percentage = Math.round(((stats.totalPresent + stats.totalLate) / total) * 100)
    return `${percentage}%`
  }

  // No teacher ID
  if (!teacherId) {
    return (
        <div className="space-y-6 p-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Attendance</h1>
            <p className="text-slate-400">Monitor and manage student attendance for all subjects</p>
          </div>
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
            <p className="text-yellow-400">Unable to load attendance. Please log in again.</p>
          </div>
        </div>
    )
  }

  // Loading state
  if (isLoading && subjects.length === 0) {
    return (
        <div className="space-y-6 p-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Attendance</h1>
            <p className="text-slate-400">Monitor and manage student attendance for all subjects</p>
          </div>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            <span className="ml-3 text-slate-400">Loading attendance data...</span>
          </div>
        </div>
    )
  }

  // Error state
  if (error && subjects.length === 0) {
    return (
        <div className="space-y-6 p-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Attendance</h1>
            <p className="text-slate-400">Monitor and manage student attendance for all subjects</p>
          </div>
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-center gap-3">
            <p className="text-red-400">{error}</p>
            <button
                onClick={fetchSubjectsWithAttendance}
                className="ml-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
    )
  }

  return (
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Attendance</h1>
            <p className="text-slate-400">Monitor and manage student attendance for all subjects</p>
          </div>
          <button
              onClick={fetchSubjectsWithAttendance}
              disabled={isLoading}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors disabled:opacity-50"
              title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border border-slate-700/50 bg-slate-900">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Average Attendance</p>
                  <p className="text-3xl font-bold text-blue-400 mt-1">
                    {overallStats.averageAttendance > 0 ? `${overallStats.averageAttendance}%` : "N/A"}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-700/50 bg-slate-900">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Sessions</p>
                  <p className="text-3xl font-bold text-green-400 mt-1">{overallStats.totalSessions}</p>
                </div>
                <Calendar className="h-8 w-8 text-green-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-700/50 bg-slate-900">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Active Classes</p>
                  <p className="text-3xl font-bold text-amber-400 mt-1">{overallStats.activeClasses}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-amber-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Filter size={20} className="text-slate-400" />
            <div className="flex gap-4 flex-wrap">
              <select
                  value={filterSemester}
                  onChange={(e) => setFilterSemester(e.target.value)}
                  className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 outline-none hover:border-slate-600 transition-colors"
              >
                <option value="all">All Semesters</option>
                {filters.semesters.map((semester) => (
                    <option key={semester} value={semester}>
                      {semester}
                    </option>
                ))}
              </select>
              <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 outline-none hover:border-slate-600 transition-colors"
              >
                <option value="all">All Years</option>
                {filters.years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                ))}
              </select>
            </div>
            <div className="ml-auto text-sm text-slate-400">
              {subjects.length} subject{subjects.length !== 1 ? "s" : ""} found
            </div>
          </div>
        </div>

        {/* Subjects List */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-white">Attendance by Subject</h2>

          {subjects.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/30 border border-slate-700/30 rounded-xl">
                <Calendar size={48} className="mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400 font-medium mb-2">No subjects found</p>
                <p className="text-slate-500 text-sm">
                  {filterSemester !== "all" || filterYear !== "all"
                      ? "Try adjusting your filters"
                      : "You have not been assigned to any subjects yet"}
                </p>
              </div>
          ) : (
              subjects.map((subject) => (
                  <button
                      key={subject.id}
                      onClick={() => handleSubjectClick(subject)}
                      className="w-full text-left p-4 bg-slate-900 border border-slate-700/50 hover:border-blue-500/50 rounded-xl transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-bold text-white">{subject.name}</h3>
                          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">{subject.code}</span>
                          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">
                      {subject.gradeLevelName} - {subject.sectionName}
                    </span>
                        </div>
                        <p className="text-sm text-slate-400 mb-2">
                          {subject.semesterName} • {subject.schoolYear}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span>Students: {subject.studentCount}</span>
                          {subject.stats && (
                              <>
                                <span>Sessions: {subject.stats.totalSessions}</span>
                                <span className="text-green-400">Present: {subject.stats.totalPresent}</span>
                                <span className="text-red-400">Absent: {subject.stats.totalAbsent}</span>
                                {subject.stats.totalLate > 0 && (
                                    <span className="text-yellow-400">Late: {subject.stats.totalLate}</span>
                                )}
                              </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                            className={`text-lg font-bold ${
                                ! subject.stats || subject.stats.averageAttendance === undefined
                                    ? "text-slate-500"
                                    : subject.stats.averageAttendance >= 90
                                        ? "text-green-400"
                                        : subject.stats.averageAttendance >= 75
                                            ? "text-yellow-400"
                                            :  "text-red-400"
                            }`}
                        >
                          {getAttendancePercentage(subject.stats)}
                        </p>
                        <p className="text-xs text-slate-500">Attendance</p>
                      </div>
                    </div>
                  </button>
              ))
          )}
        </div>
      </div>
  )
}