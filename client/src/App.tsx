import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Suspense, lazy, useEffect } from "react";
const NotFound = lazy(() => import("@/pages/not-found"));
const Login = lazy(() => import("@/pages/Login"));
const Landing = lazy(() => import("@/pages/Landing"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const SuperAdminDashboard = lazy(() => import("@/pages/SuperAdminDashboard"));
const Clients = lazy(() => import("@/pages/Clients"));
const Employees = lazy(() => import("@/pages/Employees"));
const Services = lazy(() => import("@/pages/Services"));
const Appointments = lazy(() => import("@/pages/Appointments"));
const Finance = lazy(() => import("@/pages/Finance"));
const Inventory = lazy(() => import("@/pages/Inventory"));
const Branches = lazy(() => import("@/pages/Branches"));
const Settings = lazy(() => import("@/pages/Settings"));
const PublicBooking = lazy(() => import("@/pages/PublicBooking"));
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import { auth } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Landing} />
      <Route path="/book/:tenantId" component={PublicBooking} />
      <Route path="/dashboard">
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/finance">
        <ProtectedRoute>
          <Layout>
            <Finance />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/inventory">
        <ProtectedRoute>
          <Layout>
            <Inventory />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/branches">
        <ProtectedRoute>
          <Layout>
            <Branches />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <Layout>
            <Settings />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/super-admin">
        <ProtectedRoute>
          <Layout>
            <SuperAdminDashboard />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/clients">
        <ProtectedRoute>
          <Layout>
            <Clients />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/employees">
        <ProtectedRoute>
          <Layout>
            <Employees />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/services">
        <ProtectedRoute>
          <Layout>
            <Services />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/appointments">
        <ProtectedRoute>
          <Layout>
            <Appointments />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/finance">
        <ProtectedRoute>
          <Layout>
            <Finance />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/inventory">
        <ProtectedRoute>
          <Layout>
            <Inventory />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/branches">
        <ProtectedRoute>
          <Layout>
            <Branches />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    const id = setInterval(() => {
      auth.refreshIfNeeded(45).catch(() => {
        // ignore
      });
    }, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Suspense fallback={<div className="p-6">Загрузка...</div>}>
          <I18nProvider>
            <Router />
          </I18nProvider>
        </Suspense>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
