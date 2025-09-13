import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/Clients";
import Employees from "@/pages/Employees";
import Services from "@/pages/Services";
import Appointments from "@/pages/Appointments";
import Finance from "@/pages/Finance";
import Inventory from "@/pages/Inventory";
import Branches from "@/pages/Branches";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <ProtectedRoute>
          <Layout>
            <Dashboard />
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
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
