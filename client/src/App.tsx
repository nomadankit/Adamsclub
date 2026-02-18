import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { RoleBasedRedirect } from "@/components/RoleBasedRedirect";
import Home from "@/pages/Home";
import Bookings from "@/pages/Bookings";
import Accounts from "@/pages/Accounts";
import PaymentHistory from "@/pages/PaymentHistory";
import Settings from "@/pages/Settings";
import Help from "@/pages/Help";
import EditProfile from "@/pages/EditProfile";
import ManageSubscription from "@/pages/ManageSubscription";
import UpgradePlan from "@/pages/UpgradePlan";
import Benefits from "@/pages/Benefits";
import NotFound from "@/pages/not-found";
import { ErrorBoundary } from "react-error-boundary";
import QRViewer from "@/pages/QRViewer"
import PaymentSuccess from "@/pages/PaymentSuccess"
import Profile from "@/pages/Profile"
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ExploreGear } from "@/components/ExploreGear";
import { LandingPage } from "@/components/LandingPage";
import PaymentMethods from "@/pages/PaymentMethods";
// import Auth from "@/pages/Auth";
import AuthCallback from "@/pages/AuthCallback";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import { MemberEvents } from "@/pages/MemberEvents";
import StaffHome from "@/pages/StaffHome";
import StaffDashboard from "@/pages/StaffDashboard";
import StaffCheckIn from "@/pages/StaffCheckIn";
import StaffSchedule from "@/pages/StaffSchedule";
import StaffInventory from "@/pages/StaffInventory";
import StaffConsumables from "@/pages/StaffConsumables";
import StaffArrivals from "@/pages/StaffArrivals";
import StaffScan from "@/pages/StaffScan";
import MemberScan from "@/pages/MemberScan";
import AdminHome from "@/pages/AdminHome";
import AdminPerks from "@/pages/AdminPerks";
import AdminGear from "@/pages/AdminGear";
import AdminConsumables from "@/pages/AdminConsumables";
import AdminLocations from "@/pages/AdminLocations";
import AdminPeople from "@/pages/AdminPeople";
import AdminEmailConfig from "@/pages/AdminEmailConfig";
import ResetPassword from "@/pages/ResetPassword";
import MemberCheckouts from "@/pages/MemberCheckouts";
import { AppSidebar } from "@/components/AppSidebar";
import { AdminDashboard } from "@/components/AdminDashboard";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

function ErrorFallback({ error }: { error: Error }) {
  // Don't show error for auth issues - let the app handle redirect
  const isAuthError = error.message.includes('401') || error.message.includes('Unauthorized');

  if (isAuthError) {
    // Redirect to login page
    window.location.href = '/login';
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
        <p className="text-muted-foreground mb-4">Please refresh the page to try again</p>
        <button
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          onClick={() => window.location.reload()}
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}

function Router() {
  const [pathname] = useLocation();
  const { user, isLoading: loading } = useAuth();

  // Always call useEffect at the top level
  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo(0, 0);
  }, [pathname]);

  // Special case: Payment success should be accessible regardless of auth state
  if (pathname === '/payment-success') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto pb-20">
          <PaymentSuccess />
        </main>
        <BottomNavigation />
      </div>
    );
  }

  // Show loading state only for initial load
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Initializing session...</p>
        </div>
      </div>
    );
  }

  // If not authenticated (user is null or undefined after loading), show waitlist landing page
  // If not authenticated (user is null or undefined after loading), show auth pages or redirect to login
  if (!user) {
    // If we are on a protected route but not logged in, force redirect to login
    const publicRoutes = ['/', '/login', '/signup', '/auth/callback', '/payment-success'];
    const isPublicRoute = publicRoutes.some(route => 
      pathname === route || pathname.startsWith('/reset-password/')
    );

    if (!isPublicRoute && pathname !== '/login') {
      window.location.href = '/login';
      return null;
    }

    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/auth/callback" component={AuthCallback} />
        <Route path="/reset-password/:token" component={ResetPassword} />
        <Route path="/payment-success" component={PaymentSuccess} />
        {/* Show LandingPage at root for marketing/welcome page */}
        <Route path="/" component={LandingPage} />
        <Route component={() => {
          window.location.href = '/login';
          return null;
        }} />
      </Switch>
    );
  }

  // If authenticated, show role-based content with navigation
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 overflow-y-auto pb-20">
        <Switch>
          <Route path="/" component={RoleBasedRedirect} />
          <Route path="/auth/callback" component={AuthCallback} />
          {/* Member routes */}
          <Route path="/home" component={Home} />
          <Route path="/checkouts" component={user?.role === 'member' ? MemberCheckouts : RoleBasedRedirect} />
          <Route path="/explore" component={() => <ExploreGear />} />
          <Route path="/bookings" component={Bookings} />
          {/* Staff routes */}
          <Route path="/staff/home" component={user?.role === 'staff' ? StaffHome : RoleBasedRedirect} />
          <Route path="/staff/dashboard" component={user?.role === 'staff' ? StaffDashboard : RoleBasedRedirect} />
          <Route path="/staff/checkin" component={user?.role === 'staff' ? StaffCheckIn : RoleBasedRedirect} />
          <Route path="/staff/schedule" component={user?.role === 'staff' ? StaffSchedule : RoleBasedRedirect} />
          <Route path="/staff/inventory" component={user?.role === 'staff' ? StaffInventory : RoleBasedRedirect} />
          <Route path="/staff/consumables" component={user?.role === 'staff' ? StaffConsumables : RoleBasedRedirect} />
          <Route path="/staff/arrivals" component={user?.role === 'staff' ? StaffArrivals : RoleBasedRedirect} />
          <Route path="/staff/scan" component={user?.role === 'staff' ? StaffScan : RoleBasedRedirect} />
          <Route path="/staff/members/scan" component={user?.role === 'staff' ? MemberScan : RoleBasedRedirect} />
          <Route path="/account" component={Accounts} />
          <Route path="/accounts" component={Accounts} />
          <Route path="/credits" component={Accounts} />
          <Route path="/payment-history" component={PaymentHistory} />
          <Route path="/payment-methods" component={PaymentMethods} />
          <Route path="/payment-success" component={PaymentSuccess} />
          <Route path="/settings" component={Settings} />
          <Route path="/edit-profile" component={EditProfile} />
          <Route path="/benefits" component={Benefits} />
          <Route path="/help" component={Help} />
          <Route path="/subscription" component={ManageSubscription} />
          <Route path="/upgrade" component={UpgradePlan} />
          <Route path="/events" component={MemberEvents} />
          {/* Admin routes */}
          <Route path="/admin" component={user?.role === 'admin' ? AdminHome : RoleBasedRedirect} />
          <Route path="/admin/home" component={user?.role === 'admin' ? AdminHome : RoleBasedRedirect} />
          <Route path="/admin/dashboard" component={user?.role === 'admin' ? AdminDashboard : RoleBasedRedirect} />
          <Route path="/admin/perks" component={user?.role === 'admin' ? AdminPerks : RoleBasedRedirect} />
          <Route path="/admin/gear" component={user?.role === 'admin' ? AdminGear : RoleBasedRedirect} />
          <Route path="/admin/consumables" component={user?.role === 'admin' ? AdminConsumables : RoleBasedRedirect} />
          <Route path="/admin/locations" component={user?.role === 'admin' ? AdminLocations : RoleBasedRedirect} />

          <Route path="/admin/people" component={user?.role === 'admin' ? AdminPeople : RoleBasedRedirect} />
          <Route path="/admin/email-config" component={user?.role === 'admin' ? AdminEmailConfig : RoleBasedRedirect} />
          <Route path="/qr/:bookingId" component={QRViewer} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <BottomNavigation />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="adams-club-theme">
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;