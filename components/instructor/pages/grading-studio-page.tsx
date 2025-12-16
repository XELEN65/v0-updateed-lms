"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Save, Loader2, Search, CheckCircle, Clock, XCircle } from "lucide-react"

interface GradingStudioProps {
  subject: any
  taskId: number | null
  taskTitle: string
  onBack: () => void
}

interface StudentGrade {
  id: number
  name: string
  email: string
  studentNumber?: string
  studentSubmissionId?: number
  attemptNumber?: number
  submittedAt?: string
  grade: number | null
  feedback: string
  gradedAt?: string
  status: "not_submitted" | "submitted" | "graded"
}

interface SubmissionDetails {
  id: number
  name: string
  description?: string
  dueDate?: string
  dueTime?: string
  maxAttempts?: number
}

export default function GradingStudio({ subject, taskId, taskTitle, onBack }: GradingStudioProps) {
  const [students, setStudents] = useState<StudentGrade[]>([])
  const [submission, setSubmission] = useState<SubmissionDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "not_submitted" | "submitted" | "graded">("all")

  // Track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const fetchGrades = useCallback(async () => {
    if (!subject?.id || !taskId) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/teacher/subjects/${subject.id}/submissions/${taskId}/grades`)
      const data = await response.json()

      if (data.success) {
        setSubmission(data.submission)
        setStudents(
            data.students.map((s: any) => ({
              ...s,
              grade: s.grade,
              feedback: s.feedback || "",
            }))
        )
      } else {
        setError(data.error || "Failed to fetch grades")
      }
    } catch (err) {
      console.error("Failed to fetch grades:", err)
      setError("Failed to connect to server")
    } finally {
      setIsLoading(false)
    }
  }, [subject?.id, taskId])

  useEffect(() => {
    fetchGrades()
  }, [fetchGrades])

  const updateGrade = (studentId: number, grade: number | null) => {
    setStudents(
        students.map((s) =>
            s.id === studentId ? { ...s, grade, status: grade !== null ? "graded" : s.status } : s
        )
    )
    setHasUnsavedChanges(true)
  }

  const updateFeedback = (studentId: number, feedback: string) => {
    setStudents(students.map((s) => (s.id === studentId ? { ...s, feedback } : s)))
    setHasUnsavedChanges(true)
  }

  const handleSaveAll = async () => {
    if (!subject?.id || !taskId) return

    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const gradesToSave = students
          .filter((s) => s.grade !== null)
          .map((s) => ({
            studentId: s.id,
            grade: s.grade,
            feedback: s.feedback,
          }))

      const response = await fetch(`/api/teacher/subjects/${subject.id}/submissions/${taskId}/grades`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grades: gradesToSave }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccessMessage("Grades saved successfully!")
        setHasUnsavedChanges(false)
        setTimeout(() => setSuccessMessage(null), 3000)
        fetchGrades() // Refresh to get updated data
      } else {
        setError(data.error || "Failed to save grades")
      }
    } catch (err) {
      console.error("Failed to save grades:", err)
      setError("Failed to save grades")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveSingleGrade = async (student: StudentGrade) => {
    if (!subject?.id || !taskId || student.grade === null) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/teacher/subjects/${subject.id}/submissions/${taskId}/grades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          grade: student.grade,
          feedback: student.feedback,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccessMessage(`Grade saved for ${student.name}`)
        setTimeout(() => setSuccessMessage(null), 2000)
      } else {
        setError(data.error || "Failed to save grade")
      }
    } catch (err) {
      console.error("Failed to save grade:", err)
    } finally {
      setIsSaving(false)
    }
  }

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "all" || s.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // Stats
  const totalStudents = students.length
  const gradedCount = students.filter((s) => s.status === "graded" || s.grade !== null).length
  const submittedCount = students.filter((s) => s.status === "submitted").length
  const notSubmittedCount = students.filter((s) => s.status === "not_submitted" && s.grade === null).length

  // Calculate average grade
  const gradesWithValues = students.filter((s) => s.grade !== null)
  const averageGrade =
      gradesWithValues.length > 0
          ? (gradesWithValues.reduce((sum, s) => sum + (s.grade || 0), 0) / gradesWithValues.length).toFixed(1)
          : "N/A"

  if (isLoading) {
    return (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center gap-2 text-primary hover:text-primary/80">
              <ArrowLeft className="h-5 w-5" />
              <span>Back</span>
            </button>
            <h1 className="text-2xl font-bold text-white">Loading...</h1>
          </div>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        </div>
    )
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center gap-2 text-primary hover:text-primary/80">
              <ArrowLeft className="h-5 w-5" />
              <span>Back</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Grading: {taskTitle || submission?.name}</h1>
              <p className="text-slate-400">{subject.name}</p>
            </div>
          </div>
          <Button
              onClick={handleSaveAll}
              disabled={isSaving || !hasUnsavedChanges}
              className="bg-green-600 hover:bg-green-700 gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save All Grades"}
          </Button>
        </div>

        {/* Messages */}
        {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">{error}</div>
        )}
        {successMessage && (
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-green-400">
              {successMessage}
            </div>
        )}

        {/* Submission Details */}
        {submission && (
            <Card className="border border-slate-700/50 bg-slate-900">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-white mb-2">{submission.name}</h3>
                {submission.description && <p className="text-slate-400 text-sm mb-3">{submission.description}</p>}
                <div className="flex gap-4 text-sm text-slate-500">
                  {submission.dueDate && <span>Due: {submission.dueDate}</span>}
                  {submission.maxAttempts && <span>Max Attempts: {submission.maxAttempts}</span>}
                </div>
              </CardContent>
            </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border border-slate-700/50 bg-slate-900">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-white">{totalStudents}</p>
              <p className="text-xs text-slate-400">Total Students</p>
            </CardContent>
          </Card>
          <Card className="border border-slate-700/50 bg-slate-900">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-green-400">{gradedCount}</p>
              <p className="text-xs text-slate-400">Graded</p>
            </CardContent>
          </Card>
          <Card className="border border-slate-700/50 bg-slate-900">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-yellow-400">{submittedCount}</p>
              <p className="text-xs text-slate-400">Pending</p>
            </CardContent>
          </Card>
          <Card className="border border-slate-700/50 bg-slate-900">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-red-400">{notSubmittedCount}</p>
              <p className="text-xs text-slate-400">Not Submitted</p>
            </CardContent>
          </Card>
          <Card className="border border-slate-700/50 bg-slate-900">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-blue-400">{averageGrade}</p>
              <p className="text-xs text-slate-400">Average</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary"
            />
          </div>
          <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary"
          >
            <option value="all">All Status</option>
            <option value="graded">Graded</option>
            <option value="submitted">Submitted (Pending)</option>
            <option value="not_submitted">Not Submitted</option>
          </select>
        </div>

        {/* Students List */}
        {students.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/30 border border-slate-700/30 rounded-xl">
              <p className="text-slate-400 font-medium">No students enrolled in this subject</p>
            </div>
        ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-slate-400">No students match your filters</div>
        ) : (
            <div className="space-y-3">
              {filteredStudents.map((student) => (
                  <Card key={student.id} className="border border-slate-700/50 bg-slate-900">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        {/* Student Info */}
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold flex-shrink-0">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-white">{student.name}</p>
                            <p className="text-xs text-slate-400">{student.studentNumber || student.email}</p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                          {student.status === "graded" || student.grade !== null ? (
                              <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-900/30 text-green-300">
                        <CheckCircle className="w-3 h-3" />
                        Graded
                      </span>
                          ) : student.status === "submitted" ? (
                              <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-yellow-900/30 text-yellow-300">
                        <Clock className="w-3 h-3" />
                        Pending
                      </span>
                          ) : (
                              <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-900/30 text-red-300">
                        <XCircle className="w-3 h-3" />
                        Not Submitted
                      </span>
                          )}
                        </div>

                        {/* Grade Input */}
                        <div className="flex items-center gap-4 flex-wrap">
                          <div>
                            <label className="text-xs text-slate-400 block mb-1">Grade</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={student.grade ?? ""}
                                onChange={(e) =>
                                    updateGrade(student.id, e.target.value ? parseFloat(e.target.value) : null)
                                }
                                placeholder="0-100"
                                className="w-24 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-center focus:outline-none focus:border-primary"
                            />
                          </div>
                          <div className="flex-1 min-w-[200px]">
                            <label className="text-xs text-slate-400 block mb-1">Feedback (optional)</label>
                            <input
                                type="text"
                                value={student.feedback}
                                onChange={(e) => updateFeedback(student.id, e.target.value)}
                                placeholder="Add feedback..."
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary"
                            />
                          </div>
                          <Button
                              onClick={() => handleSaveSingleGrade(student)}
                              disabled={isSaving || student.grade === null}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 mt-5"
                          >
                            Save
                          </Button>
                        </div>
                      </div>

                      {/* Submission Info */}
                      {student.submittedAt && (
                          <div className="mt-3 pt-3 border-t border-slate-700/50 text-xs text-slate-500">
                            Submitted: {new Date(student.submittedAt).toLocaleString()}
                            {student.attemptNumber && ` (Attempt ${student.attemptNumber})`}
                          </div>
                      )}
                    </CardContent>
                  </Card>
              ))}
            </div>
        )}

        {/* Unsaved Changes Warning */}
        {hasUnsavedChanges && (
            <div className="fixed bottom-4 right-4 bg-yellow-600 text-white px-4 py-2 rounded-lg shadow-lg">
              You have unsaved changes
            </div>
        )}
      </div>
  )
}