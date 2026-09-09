import React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';

import StudentLayout from './layouts/StudentLayouts';
import InstitutionLayout from './layouts/InstitutionLayout';
import IndustryLayout from './layouts/IndustryLayout';

import StudentDashboard from './pages/student/StudentDashboard';
import StudentProfile from './pages/student/StudentProfile';
import StudentOpportunities from './pages/student/StudentOpportunities';
import StudentAssessment from './pages/student/StudentAssessment';
import StudentApplications from './pages/student/StudentApplications';
import StudentPortfolio from './pages/student/StudentPortfolio';
import StudentLearning from './pages/student/StudentLearning';
import StudentEvents from './pages/student/StudentEvents';
import StudentRoadmap from './pages/student/StudentRoadmap';
import StudentSettings from './pages/student/StudentSettings';
import StudentResume from './pages/student/StudentResume';

import InstitutionDashboard from './pages/institution/InstitutionDashboard';
import StudentReadiness from './pages/institution/StudentReadiness';
import IndustryDemand from './pages/institution/IndustryDemand';
import InstitutionProfile from './pages/institution/InstitutionProfile';
import {
  StudentOpportunities as InstitutionOpportunities,
  FacultyOpportunities,
  Collaborations as InstitutionCollaborations,
  Placements as InstitutionPlacements,
} from './pages/institution/ComingSoonViews';

import IndustryDashboard from './pages/industry/IndustryDashboard';
import IndustryTalent from './pages/industry/IndustryTalent';
import IndustryOpportunities from './pages/industry/IndustryOpportunities';
import IndustryApplications from './pages/industry/IndustryApplications';
import IndustryDemandView from './pages/industry/IndustryDemand';
import IndustryEvents from './pages/industry/IndustryEvents';
import IndustryCollaborations from './pages/industry/IndustryCollaborations';
import IndustryAnalytics from './pages/industry/IndustryAnalytics';
import IndustrySettings from './pages/industry/IndustrySettings';
import IndustryHelp from './pages/industry/IndustryHelp';
import CompanyProfileView from './pages/industry/CompanyProfileView';
import RoleSelection from './pages/RoleSelection';
import StudentOnboarding from './pages/student/StudentOnboarding';
import { useAuth } from './context/AuthContext';

function getDefaultPathForRole(role) {
  if (role.includes('faculty') || role.includes('academic') || role.includes('institution')) {
    return '/institution/dashboard';
  }
  if (role.includes('industry') || role.includes('company') || role.includes('employer')) {
    return '/industry/dashboard';
  }
  return '/student/dashboard';
}

function isRoleAllowed(currentRole, requiredRole) {
  if (!requiredRole) return true;
  const curr = String(currentRole || '').toLowerCase();
  const req = String(requiredRole || '').toLowerCase();

  if (req === 'student') {
    return curr.includes('student') || curr === '' || curr === 'authenticated';
  }
  if (req === 'institution') {
    return curr.includes('institution') || curr.includes('faculty') || curr.includes('academic');
  }
  if (req === 'industry') {
    return curr.includes('industry') || curr.includes('company') || curr.includes('employer') || curr.includes('recruiter');
  }
  return curr.includes(req);
}

function ProtectedRoute({ children, role, allowIncompleteOnboarding = false }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const currentRole = String(user.role || 'student').toLowerCase();
  if (role && !isRoleAllowed(currentRole, role)) {
    return <Navigate to={getDefaultPathForRole(currentRole)} replace />;
  }

  // Student onboarding check
  if (currentRole.includes('student')) {
    const isOnboarded = !!user.onboarding_completed;
    if (!isOnboarded && !allowIncompleteOnboarding) {
      return <Navigate to="/student/onboarding" replace />;
    }
    if (isOnboarded && allowIncompleteOnboarding) {
      return <Navigate to="/student/dashboard" replace />;
    }
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Root points to Role Selection landing */}
      <Route path="/" element={<RoleSelection />} />
      <Route path="/login" element={<Login />} />
      <Route path="/login/:portalRole" element={<Login />} />
      <Route path="/login/:role" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Student Onboarding Route (full-screen, rendered outside sidebar) */}
      <Route
        path="/student/onboarding"
        element={
          <ProtectedRoute role="student" allowIncompleteOnboarding={true}>
            <StudentOnboarding />
          </ProtectedRoute>
        }
      />
      
      {/* Student Portal Routes */}
      <Route path="/student" element={<ProtectedRoute role="student"><StudentLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="resume" element={<StudentResume />} />
        <Route path="opportunities" element={<StudentOpportunities />} />
        <Route path="assessment" element={<StudentAssessment />} />
        <Route path="applications" element={<StudentApplications />} />
        <Route path="portfolio" element={<StudentPortfolio />} />
        <Route path="learning" element={<StudentLearning />} />
        <Route path="events" element={<StudentEvents />} />
        <Route path="roadmap" element={<StudentRoadmap />} />
        <Route path="settings" element={<StudentSettings />} />
      </Route>

      {/* Institution Portal Routes */}
      <Route path="/institution" element={<ProtectedRoute role="institution"><InstitutionLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<InstitutionDashboard />} />
        <Route path="students" element={<StudentReadiness />} />
        <Route path="demand" element={<IndustryDemand />} />
        <Route path="opportunities" element={<InstitutionOpportunities />} />
        <Route path="faculty" element={<FacultyOpportunities />} />
        <Route path="collaborations" element={<InstitutionCollaborations />} />
        <Route path="placements" element={<InstitutionPlacements />} />
        <Route path="profile" element={<InstitutionProfile />} />
      </Route>

      {/* Industry Portal Routes */}
      <Route path="/industry" element={<ProtectedRoute role="industry"><IndustryLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<IndustryDashboard />} />
        <Route path="profile" element={<CompanyProfileView />} />
        <Route path="talent" element={<IndustryTalent />} />
        <Route path="opportunities" element={<IndustryOpportunities />} />
        <Route path="applications" element={<IndustryApplications />} />
        <Route path="demand" element={<IndustryDemandView />} />
        <Route path="events" element={<IndustryEvents />} />
        <Route path="collaborations" element={<IndustryCollaborations />} />
        <Route path="analytics" element={<IndustryAnalytics />} />
        <Route path="settings" element={<IndustrySettings />} />
        <Route path="help" element={<IndustryHelp />} />
      </Route>

      {/* 404 Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
