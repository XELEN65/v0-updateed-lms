"use client"

import { useState } from "react"
import LandingPage from "@/components/landing-page"
import LoginPage from "@/components/login-page"
import TeacherDashboard from "@/components/teacher-dashboard"
import StudentLayout from "@/components/student/student-layout"
import InstructorLayout from "@/components/instructor/instructor-layout"
import AdminLayout from "@/components/admin/admin-layout"

// User type for storing logged-in user info
interface CurrentUser {
  id: number
  username: string
  email: string
  fullName: string
  role: "teacher" | "admin" | "student" | "instructor"
}

export default function Home() {
  const [currentPage, setCurrentPage] = useState<"landing" | "login" | "teacher" | "admin" | "student" | "instructor">(
      "landing",
  )
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)

  const handleLogin = (
      role: "teacher" | "admin" | "student" | "instructor",
      username?: string,
      userId?: number,
      email?: string,
      fullName?: string
  ) => {
    // Store user data
    setCurrentUser({
      id: userId || 0,
      username:  username || "",
      email: email || "",
      fullName: fullName || username || "",
      role: role,
    })

    // Navigate to appropriate dashboard
    if (role === "teacher" || role === "instructor") {
      setCurrentPage("instructor")
    } else if (role === "admin") {
      setCurrentPage("admin")
    } else if (role === "student") {
      setCurrentPage("student")
    }
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setCurrentPage("landing")
  }

  const renderPage = () => {
    switch (currentPage) {
      case "landing":
        return <LandingPage onNavigate={(page) => setCurrentPage(page)} />
      case "login":
        return <LoginPage onLogin={handleLogin} onBack={() => setCurrentPage("landing")} />
      case "teacher":
        return <TeacherDashboard onLogout={handleLogout} />
      case "admin":
        return (
            <AdminLayout
                onLogout={handleLogout}
                userId={currentUser?.id}
                userName={currentUser?.fullName || currentUser?.username}
            />
        )
      case "student":
        return (
            <StudentLayout
                onLogout={handleLogout}
                studentName={currentUser?.fullName || currentUser?.username || ""}
                initialPage="profile"
                userId={currentUser?.id}
            />
        )
      case "instructor":
        return (
            <InstructorLayout
                onLogout={handleLogout}
                instructorName={currentUser?.fullName || currentUser?. username || ""}
                initialPage="profile"
                userId={currentUser?.id}
            />
        )
      default:
        return <LandingPage onNavigate={(page) => setCurrentPage(page)} />
    }
  }

  return <div className="min-h-screen w-full bg-background overflow-x-hidden">{renderPage()}</div>
}