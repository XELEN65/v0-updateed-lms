"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Filter, BarChart3, RefreshCw, Loader2, FileText } from "lucide-react"

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

interface GradeStats {
  subjectId: number
  totalSubmissions: number
  gradedCount: number
  pendingCount: number
  averageGrade: number | null
  passingCount: number
  failingCount:  number
  passingRate: number
}

interface SubjectWithGrades extends Subject {
  stats: GradeStats | null
}

interface SubjectForRedirect {
  id: number
  name: string
  code:  string
  sectionName: string
  gradeLevelName: string
  semesterName: string
  schoolYear: string
  studentCount: number
  color: string
}

interface InstructorGradesProps {
  teacherId: number | null | undefined
  onSubjectClick?:  (subject: SubjectForRedirect, tabType:  "grades") => void
}

export default function InstructorGrades({ teacherId, onSubjectClick }: InstructorGradesProps) {
  const [subjects, setSubjects] = useState<SubjectWithGrades[]>([])
  const [filters, setFilters] = useState<{ semesters: string[]; years: string[] }>({ semesters: [], years: [] })
  const [filterSemester, setFilterSemester] = useState("all")
  const [filterYear, setFilterYear] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Aggregate stats
  const [overallStats, setOverallStats] = useState({
    averagePassingRate: 0,
    averageFailingRate: 0,
    totalStudents: 0,
    averageGrade: 0,
  })

  const fetchSubjectsWithGrades = useCallback(async () => {
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

      if (! subjectsData.success) {
        setError(subjectsData.error || "Failed to fetch subjects")
        return
      }

      // Update filters on first load
      if (filters.semesters.length === 0 && subjectsData.filters) {
        setFilters(subjectsData.filters)
      }

      // Fetch grade stats for each subject
      const subjectsWithStats:  SubjectWithGrades[] = await Promise.all(
          subjectsData.subjects.map(async (subject:  Subject) => {
            try {
              const statsResponse = await fetch(`/api/teacher/subjects/${subject.id}/grades/stats`)
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
      const subjectsWithValidStats = subjectsWithStats. filter((s) => s.stats && s.stats.gradedCount > 0)

      const totalStudents = subjectsWithStats.reduce((sum, s) => sum + s.studentCount, 0)

      let avgPassingRate = 0
      let avgGrade = 0

      if (subjectsWithValidStats.length > 0) {
        avgPassingRate = Math. round(
            subjectsWithValidStats.reduce((sum, s) => sum + (s.stats?.passingRate || 0), 0) / subjectsWithValidStats.length
        )

        const gradesSum = subjectsWithValidStats. reduce((sum, s) => sum + (s.stats?.averageGrade || 0), 0)
        avgGrade = Math.round((gradesSum / subjectsWithValidStats.length) * 10) / 10
      }

      setOverallStats({
        averagePassingRate: avgPassingRate,
        averageFailingRate: 100 - avgPassingRate,
        totalStudents,
        averageGrade: avgGrade,
      })
    } catch (err) {
      console.error("Failed to fetch grades data:", err)
      setError("Failed to connect to server")
    } finally {
      setIsLoading(false)
    }
  }, [teacherId, filterSemester, filterYear, filters. semesters. length])

  useEffect(() => {
    fetchSubjectsWithGrades()
  }, [fetchSubjectsWithGrades])

  // Sort subjects
  const sortedSubjects = [... subjects].sort((a, b) => {
    if (sortBy === "name") {
      const nameCompare = a.name.localeCompare(b.name)
      if (nameCompare !== 0) return nameCompare
      return a.sectionName.localeCompare(b.sectionName)
    } else if (sortBy === "passingRate") {
      const rateA = a.stats?.passingRate ??  -1
      const rateB = b.stats?.passingRate ??  -1
      return rateB - rateA
    } else if (sortBy === "averageGrade") {
      const gradeA = a.stats?. averageGrade ?? -1
      const gradeB = b. stats?.averageGrade ?? -1
      return gradeB - gradeA
    }
    return 0
  })

  const handleSubjectClick = (subject: SubjectWithGrades) => {
    const redirectSubject: SubjectForRedirect = {
      id: subject. id,
      name: subject. name,
      code: subject. code,
      sectionName:  subject.sectionName,
      gradeLevelName: subject.gradeLevelName,
      semesterName: subject.semesterName,
      schoolYear: subject.schoolYear,
      studentCount: subject.studentCount,
      color: subject.color,
    }
    onSubjectClick?.(redirectSubject, "grades")
  }

  const getGradeColor = (rate: number | null | undefined) => {
    if (rate === null || rate === undefined) {
      return { bg: "bg-slate-800/50", text: "text-slate-400", border: "border-slate-700/50" }
    }
    if (rate >= 70) return { bg: "bg-green-900/30", text: "text-green-400", border: "border-green-500/30" }
    if (rate >= 50) return { bg: "bg-yellow-900/30", text:  "text-yellow-400", border: "border-yellow-500/30" }
    return { bg: "bg-red-900/30", text: "text-red-400", border: "border-red-500/30" }
  }

  const getAverageColor = (rate:  number) => {
    if (rate === 0) return "text-slate-500"
    if (rate >= 70) return "text-green-400"
    if (rate >= 50) return "text-yellow-400"
    return "text-red-400"
  }

  // No teacher ID
  if (!teacherId) {
    return (
        <div className="space-y-6 p-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Grades</h1>
            <p className="text-slate-400">Monitor student grades and class performance</p>
          </div>
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
            <p className="text-yellow-400">Unable to load grades.  Please log in again.</p>
          </div>
        </div>
    )
  }

  // Loading state
  if (isLoading && subjects.length === 0) {
    return (
        <div className="space-y-6 p-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Grades</h1>
            <p className="text-slate-400">Monitor student grades and class performance</p>
          </div>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            <span className="ml-3 text-slate-400">Loading grades data...</span>
          </div>
        </div>
    )
  }

  // Error state
  if (error && subjects.length === 0) {
    return (
        <div className="space-y-6 p-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Grades</h1>
            <p className="text-slate-400">Monitor student grades and class performance</p>
          </div>
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-center gap-3">
            <p className="text-red-400">{error}</p>
            <button
                onClick={fetchSubjectsWithGrades}
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
            <h1 className="text-3xl font-bold text-white mb-2">Grades</h1>
            <p className="text-slate-400">Monitor student grades and class performance</p>
          </div>
          <button
              onClick={fetchSubjectsWithGrades}
              disabled={isLoading}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors disabled:opacity-50"
              title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border border-slate-700/50 bg-slate-900">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Average Passing Rate</p>
                  <p className={`text-3xl font-bold mt-1 ${getAverageColor(overallStats.averagePassingRate)}`}>
                    {overallStats.averagePassingRate > 0 ? `${overallStats.averagePassingRate}%` : "N/A"}
                  </p>
                </div>
                <BarChart3 className={`h-8 w-8 opacity-50 ${getAverageColor(overallStats.averagePassingRate)}`} />
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-700/50 bg-slate-900">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Average Failing Rate</p>
                  <p
                      className={`text-3xl font-bold mt-1 ${
                          overallStats.averageFailingRate === 100
                              ? "text-slate-500"
                              : overallStats.averageFailingRate >= 30
                                  ? "text-red-400"
                                  : "text-yellow-400"
                      }`}
                  >
                    {overallStats.averagePassingRate > 0 ? `${overallStats.averageFailingRate}%` : "N/A"}
                  </p>
                </div>
                <BarChart3
                    className={`h-8 w-8 opacity-50 ${
                        overallStats. averageFailingRate >= 30 ? "text-red-400" : "text-yellow-400"
                    }`}
                />
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-700/50 bg-slate-900">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Average Grade</p>
                  <p className={`text-3xl font-bold mt-1 ${getAverageColor(overallStats. averageGrade)}`}>
                    {overallStats.averageGrade > 0 ?  overallStats.averageGrade :  "N/A"}
                  </p>
                </div>
                <BarChart3 className={`h-8 w-8 opacity-50 ${getAverageColor(overallStats.averageGrade)}`} />
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-700/50 bg-slate-900">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Students</p>
                  <p className="text-3xl font-bold text-blue-400 mt-1">{overallStats.totalStudents}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-400 opacity-50" />
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
                  onChange={(e) => setFilterSemester(e. target.value)}
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
              <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 outline-none hover:border-slate-600 transition-colors"
              >
                <option value="name">Sort by Name</option>
                <option value="passingRate">Sort by Passing Rate</option>
                <option value="averageGrade">Sort by Average Grade</option>
              </select>
            </div>
            <div className="ml-auto text-sm text-slate-400">
              {subjects.length} subject{subjects.length !== 1 ? "s" : ""} found
            </div>
          </div>
        </div>

        {/* Subjects List */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-white">Grades by Subject</h2>

          {sortedSubjects.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/30 border border-slate-700/30 rounded-xl">
                <FileText size={48} className="mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400 font-medium mb-2">No subjects found</p>
                <p className="text-slate-500 text-sm">
                  {filterSemester !== "all" || filterYear !== "all"
                      ? "Try adjusting your filters"
                      :  "You have not been assigned to any subjects yet"}
                </p>
              </div>
          ) : (
              sortedSubjects.map((subject) => {
                const gradeColor = getGradeColor(subject.stats?.passingRate)
                const hasGrades = subject.stats && subject.stats.gradedCount > 0

                return (
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
                          <p className="text-sm text-slate-400 mb-3">
                            {subject.semesterName} • {subject.schoolYear} • {subject.studentCount} students
                          </p>

                          {/* Stats Row */}
                          <div className="flex items-center gap-4 flex-wrap">
                            {hasGrades ?  (
                                <>
                                  <div className={`flex items-center gap-2 p-3 rounded-lg ${gradeColor.bg} border ${gradeColor.border}`}>
                            <span className={`text-sm font-semibold ${gradeColor.text}`}>
                              Passing Rate: {subject.stats?.passingRate}%
                            </span>
                                  </div>
                                  <div className="text-sm text-slate-400">
                                    <span className="text-green-400">{subject.stats?.passingCount} passing</span>
                                    {" • "}
                                    <span className="text-red-400">{subject.stats?.failingCount} failing</span>
                                    {" • "}
                                    <span>Avg: {subject.stats?.averageGrade?. toFixed(1)}</span>
                                  </div>
                                </>
                            ) : (
                                <div className="text-sm text-slate-500">
                                  {subject.stats?.totalSubmissions
                                      ? `${subject.stats. pendingCount} submissions pending grading`
                                      : "No grades recorded yet"}
                                </div>
                            )}
                          </div>
                        </div>

                        {/* Right side - Quick stats */}
                        {hasGrades && (
                            <div className="text-right">
                              <p className={`text-2xl font-bold ${gradeColor.text}`}>
                                {subject.stats?.averageGrade?.toFixed(1)}
                              </p>
                              <p className="text-xs text-slate-500">Average</p>
                            </div>
                        )}
                      </div>
                    </button>
                )
              })
          )}
        </div>
      </div>
  )
}