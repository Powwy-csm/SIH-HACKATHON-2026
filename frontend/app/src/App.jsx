import React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';

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

export default function App() {
  return (
    <Routes>
      {/* Root points to Login */}
      <Route path="/" element={<Login />} />
      
      {/* Student Portal Routes */}
      <Route path="/student" element={<StudentLayout />}>
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
      <Route path="/institution" element={<InstitutionLayout />}>
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
      <Route path="/industry" element={<IndustryLayout />}>
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
