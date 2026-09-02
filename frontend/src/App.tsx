import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";

import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

import StudentDashboard from "./pages/student/Dashboard";
import StudentProfile from "./pages/student/Profile";
import StudentOpportunities from "./pages/student/Opportunities";
import StudentApplications from "./pages/student/Applications";
import StudentAIHub from "./pages/student/AIHub";
import StudentMentorChat from "./pages/student/MentorChat";
import StudentMockInterview from "./pages/student/MockInterview";

import CompanyDashboard from "./pages/company/Dashboard";
import CompanyJobPost from "./pages/company/JobPost";
import CompanyApplicants from "./pages/company/Applicants";
import CompanyExpectations from "./pages/company/IndustryExpectations";

import CollegeDashboard from "./pages/college/Dashboard";
import CollegeAnalytics from "./pages/college/Analytics";
import CollegeCollaboration from "./pages/college/IndustryCollaboration";

import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminVerification from "./pages/admin/Verification";

import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route element={<ProtectedRoute allow={["STUDENT"]} />}>
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/profile" element={<StudentProfile />} />
          <Route path="/student/opportunities" element={<StudentOpportunities />} />
          <Route path="/student/applications" element={<StudentApplications />} />
          <Route path="/student/ai-hub" element={<StudentAIHub />} />
          <Route path="/student/mentor" element={<StudentMentorChat />} />
          <Route path="/student/mock-interview" element={<StudentMockInterview />} />
        </Route>

        <Route element={<ProtectedRoute allow={["COMPANY"]} />}>
          <Route path="/company" element={<CompanyDashboard />} />
          <Route path="/company/jobs/new" element={<CompanyJobPost />} />
          <Route path="/company/jobs/:id/applicants" element={<CompanyApplicants />} />
          <Route path="/company/industry-expectations" element={<CompanyExpectations />} />
        </Route>

        <Route element={<ProtectedRoute allow={["COLLEGE"]} />}>
          <Route path="/college" element={<CollegeDashboard />} />
          <Route path="/college/analytics" element={<CollegeAnalytics />} />
          <Route path="/college/collaboration" element={<CollegeCollaboration />} />
        </Route>

        <Route element={<ProtectedRoute allow={["ADMIN"]} />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/verification" element={<AdminVerification />} />
        </Route>

        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
