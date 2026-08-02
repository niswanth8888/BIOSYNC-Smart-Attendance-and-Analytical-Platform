import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './utils/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import SdkControlPage from './pages/SdkControlPage';
import CombinePage from './pages/CombinePage';
import RangeReportPage from './pages/RangeReportPage';

// Department Portal imports
import DepartmentDashboardLayout from './components/DepartmentDashboardLayout';
import DepartmentDashboardPage from './pages/DepartmentDashboardPage';
import DepartmentRangeReportPage from './pages/DepartmentRangeReportPage';

// User Dashboard imports
import UserDashboardLayout from './components/UserDashboardLayout';
import UserDashboardPage from './pages/UserDashboardPage';
import UserHistoricalPage from './pages/UserHistoricalPage';
import UserDownloadPage from './pages/UserDownloadPage';
import UserDailyPage from './pages/UserDailyPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected Admin Dashboard Routes */}
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<SdkControlPage />} />
            <Route path="combine" element={<CombinePage />} />
            <Route path="report" element={<RangeReportPage />} />
          </Route>

          {/* Protected Department Portal Routes */}
          <Route path="/department" element={<DepartmentDashboardLayout />}>
            <Route index element={<DepartmentDashboardPage />} />
            <Route path="dashboard" element={<DepartmentDashboardPage />} />
            <Route path="range-report" element={<DepartmentRangeReportPage />} />
          </Route>

          {/* Protected User Dashboard Routes */}
          <Route path="/user" element={<UserDashboardLayout />}>
            <Route index element={<UserDashboardPage />} />
            <Route path="daily" element={<UserDailyPage />} />
            <Route path="historical" element={<UserHistoricalPage />} />
            <Route path="download" element={<UserDownloadPage />} />
            {/* Redirect / Profile to Dashboard for now as placeholders */}
            <Route path="*" element={<UserDashboardPage />} />
          </Route>

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
