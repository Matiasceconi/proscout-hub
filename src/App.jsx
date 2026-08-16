import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import RoleGuard from '@/components/RoleGuard';
import AgencyLayout from '@/components/agency/AgencyLayout';
import PlayerLayout from '@/components/player/PlayerLayout';
import SuperadminLayout from '@/components/superadmin/SuperadminLayout';
import Home from '@/pages/Home';
import Onboarding from '@/pages/Onboarding';
import CompanyAccess from '@/pages/CompanyAccess';
import AgencyDashboard from '@/pages/agency/AgencyDashboard';
import Players from '@/pages/agency/Players';
import PlayerProfile from '@/pages/agency/PlayerProfile';
import Directors from '@/pages/agency/Directors';
import DirectorProfile from '@/pages/agency/DirectorProfile';
import AgencyCalendar from '@/pages/agency/AgencyCalendar';
import AgencyMatches from '@/pages/agency/AgencyMatches';
import AgencyStats from '@/pages/agency/AgencyStats';
import AgencyDocuments from '@/pages/agency/AgencyDocuments';
import TeamManagement from '@/pages/agency/TeamManagement';
import AgencySettings from '@/pages/agency/AgencySettings';
import PlayerPortalHome from '@/pages/portal/PlayerPortalHome';
import PortalCalendar from '@/pages/portal/PortalCalendar';
import PortalMatches from '@/pages/portal/PortalMatches';
import PortalStats from '@/pages/portal/PortalStats';
import PortalPhysical from '@/pages/portal/PortalPhysical';
import PortalOpponent from '@/pages/portal/PortalOpponent';
import PortalCoaching from '@/pages/portal/PortalCoaching';
import PortalVideos from '@/pages/portal/PortalVideos';
import PortalMedical from '@/pages/portal/PortalMedical';
import PortalBenefits from '@/pages/portal/PortalBenefits';
import PortalDocuments from '@/pages/portal/PortalDocuments';
import PortalNotifications from '@/pages/portal/PortalNotifications';
import PortalProfile from '@/pages/portal/PortalProfile';
import SuperadminDashboard from '@/pages/superadmin/SuperadminDashboard';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import ProtectedRoute from '@/components/ProtectedRoute';
import ApiFootballClubMapping from '@/pages/agency/ApiFootballClubMapping';
import OrganizationGate from '@/components/OrganizationGate';
import ModulePermissionGuard from '@/components/ModulePermissionGuard';
import AcceptInvitation from '@/pages/AcceptInvitation';
import ActivatePortal from '@/pages/portal/ActivatePortal';
// Add page imports here

function AdminClubMappingRedirect() {
  const location = useLocation();
  return <Navigate to={`/agency/settings/integrations/api-football/clubs${location.search}`} replace />;
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError && authError.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/invite" element={<AcceptInvitation />} />
      <Route path="/portal/activate" element={<ActivatePortal />} />

      {/* Auth required, no org required */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/company-access" element={<CompanyAccess />} />
        <Route path="/company/create" element={<Onboarding />} />
      </Route>

      {/* Agency panel - auth + org required */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<RoleGuard allowedRoles={['organization_owner', 'organization_admin', 'representative', 'video_analyst', 'performance_staff', 'medical_staff']}><OrganizationGate><AgencyLayout /></OrganizationGate></RoleGuard>}>
          <Route path="/agency" element={<AgencyDashboard />} />
          <Route path="/agency/players" element={<ModulePermissionGuard permission="players"><Players /></ModulePermissionGuard>} />
          <Route path="/agency/players/:id" element={<ModulePermissionGuard permission="players"><PlayerProfile /></ModulePermissionGuard>} />
          <Route path="/agency/directors" element={<ModulePermissionGuard permission="players"><Directors /></ModulePermissionGuard>} />
          <Route path="/agency/directors/:id" element={<ModulePermissionGuard permission="players"><DirectorProfile /></ModulePermissionGuard>} />
          <Route path="/agency/calendar" element={<ModulePermissionGuard permission="calendar"><AgencyCalendar /></ModulePermissionGuard>} />
          <Route path="/agency/matches" element={<ModulePermissionGuard permission="matches"><AgencyMatches /></ModulePermissionGuard>} />
          <Route path="/agency/stats" element={<ModulePermissionGuard permission="statistics"><AgencyStats /></ModulePermissionGuard>} />
          <Route path="/agency/documents" element={<ModulePermissionGuard permission="documents"><AgencyDocuments /></ModulePermissionGuard>} />
          <Route path="/agency/team" element={<RoleGuard allowedRoles={['organization_owner', 'organization_admin']}><TeamManagement /></RoleGuard>} />
          <Route path="/agency/settings" element={<RoleGuard allowedRoles={['organization_owner', 'organization_admin']}><AgencySettings /></RoleGuard>} />
          <Route path="/agency/settings/integrations/api-football/clubs" element={<RoleGuard allowedRoles={['organization_owner', 'organization_admin']}><ApiFootballClubMapping /></RoleGuard>} />
        </Route>
      </Route>

      {/* Player portal - players only */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<RoleGuard allowedRoles={['player']}><PlayerLayout /></RoleGuard>}>
          <Route path="/portal" element={<PlayerPortalHome />} />
          <Route path="/portal/calendar" element={<PortalCalendar />} />
          <Route path="/portal/matches" element={<PortalMatches />} />
          <Route path="/portal/stats" element={<PortalStats />} />
          <Route path="/portal/physical" element={<PortalPhysical />} />
          <Route path="/portal/opponent" element={<PortalOpponent />} />
          <Route path="/portal/coaching" element={<PortalCoaching />} />
          <Route path="/portal/videos" element={<PortalVideos />} />
          <Route path="/portal/medical" element={<PortalMedical />} />
          <Route path="/portal/benefits" element={<PortalBenefits />} />
          <Route path="/portal/documents" element={<PortalDocuments />} />
          <Route path="/portal/notifications" element={<PortalNotifications />} />
          <Route path="/portal/profile" element={<PortalProfile />} />
        </Route>
      </Route>

      {/* Superadmin panel - platform admin only */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<RoleGuard allowedRoles={['platform_superadmin']}><SuperadminLayout /></RoleGuard>}>
          <Route path="/superadmin" element={<SuperadminDashboard />} />
        </Route>
      </Route>

      <Route path="/admin/club-mapping" element={<AdminClubMappingRedirect />} />
      <Route path="/onboarding" element={<Navigate to="/company-access" replace />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App