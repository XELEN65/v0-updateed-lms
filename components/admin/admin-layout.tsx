"use client"

import { useState } from "react"
import { Menu, X, User, Users, BarChart3, BookOpen, LogOut } from "lucide-react"
import AdminProfile from "./pages/profile-page"
import AdminDashboard from "./pages/dashboard-page"
import AccountsPage from "./pages/accounts-page"
import CoursesPage from "./pages/courses-page"
import LogsPage from "./pages/logs-page"

interface AdminLayoutProps {
  onLogout: () => void
  adminName?:  string
  userId?: number
  userName?: string
  initialPage?: "dashboard" | "profile" | "accounts" | "courses" | "logs"
}

export default function AdminLayout({
                                      onLogout,
                                      adminName = "Admin User",
                                      userId,
                                      userName,
                                      initialPage = "dashboard",
                                    }: AdminLayoutProps) {
  const [currentPage, setCurrentPage] = useState<"dashboard" | "profile" | "accounts" | "courses" | "logs">(initialPage)
  const [currentTab, setCurrentTab] = useState<"students" | "instructors" | "admins">("students")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [courseSubPage, setCourseSubPage] = useState<"years" | "semester" | "assignInstructor" | "assignStudent">(
      "years",
  )

  const navItems = [
    { id:  "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "profile", label: "Profile", icon: User },
    { id: "accounts", label: "Accounts", icon: Users },
    { id:  "courses", label: "Courses", icon: BookOpen },
    { id: "logs", label:  "Logs", icon: LogOut },
  ]

  const handleNavigation = (pageId: string, tab?: string) => {
    if (tab) {
      setCurrentTab(tab as any)
    }
    if (pageId === "courses") {
      setCourseSubPage("years")
    }
    setCurrentPage(pageId as any)
    setSidebarOpen(false)
  }

  const handleLogout = () => {
    setSidebarOpen(false)
    onLogout()
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <AdminDashboard onNavigate={handleNavigation} />
      case "profile":
        return <AdminProfile userId={userId} />
      case "accounts":
        return <AccountsPage initialTab={currentTab} />
      case "courses":
        return <CoursesPage />
      case "logs":
        return <LogsPage />
      default:
        return <AdminDashboard onNavigate={handleNavigation} />
    }
  }

  return (
      <div className="min-h-screen bg-slate-950">
        <div
            className={`fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity duration-300 ${
                sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            onClick={() => setSidebarOpen(false)}
        />

        <aside
            className={`fixed left-0 top-0 h-screen w-64 bg-slate-900 border-r border-slate-700/50 shadow-2xl transition-transform duration-300 z-50 flex flex-col ${
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
            } md:translate-x-0`}
        >
          {/* Gradient Header */}
          <div className="bg-gradient-to-b from-blue-600 to-blue-700 p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <svg className="h-8 w-8" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M 60 80 Q 50 80 50 90 L 50 160 Q 50 170 60 170 L 80 170 Q 90 170 90 160 L 90 110 M 90 110 L 110 60 Q 115 45 125 45 Q 135 45 140 55 L 140 160 Q 140 170 150 170 L 160 170 Q 170 170 170 160 L 160 90"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
              </svg>
              <h2 className="text-xl font-bold">PRESENT</h2>
            </div>
            <p className="text-sm opacity-90">Admin Portal</p>
            {userName && (
                <p className="text-xs opacity-75 mt-2 truncate">Welcome, {userName}</p>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item. id
              return (
                  <button
                      key={item.id}
                      onClick={() => handleNavigation(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                          isActive
                              ? "bg-blue-500/20 text-blue-300 border-l-2 border-blue-500"
                              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                      }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
              )
            })}
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-slate-700">
            <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors font-medium"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="md:ml-64 transition-all duration-300">
          {/* Sticky Header */}
          <header className="sticky top-0 z-30 border-b border-slate-700/50 bg-slate-900/75 backdrop-blur-md">
            <div className="flex items-center justify-between p-4 sm:px-6">
              <button
                  onClick={() => setSidebarOpen(! sidebarOpen)}
                  className="md:hidden p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-300"
              >
                {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <div className="flex-1" />
            </div>
          </header>

          {/* Page Content */}
          <div className="bg-slate-950">{renderPage()}</div>
        </main>
      </div>
  )
}