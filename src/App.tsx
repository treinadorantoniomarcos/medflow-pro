import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Agenda from "./pages/Agenda";
import PublicBooking from "./pages/PublicBooking";
import MinhaAgenda from "./pages/MinhaAgenda";
import Pacientes from "./pages/Pacientes";
import Mensagens from "./pages/Mensagens";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import PatientHome from "./pages/PatientHome";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/agendar/:slug" element={<PublicBooking />} />

              {/* Protected routes */}
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/agenda" element={<ProtectedRoute allowedRoles={["owner", "admin", "receptionist"]}><Agenda /></ProtectedRoute>} />
              <Route path="/paciente/home" element={<ProtectedRoute allowedRoles={["patient"]}><PatientHome /></ProtectedRoute>} />
              <Route path="/super-admin" element={<ProtectedRoute allowedRoles={["super_admin"]}><SuperAdminDashboard /></ProtectedRoute>} />
              <Route path="/minha-agenda" element={<ProtectedRoute allowedRoles={["owner", "admin", "professional"]}><MinhaAgenda /></ProtectedRoute>} />
              <Route path="/pacientes" element={<ProtectedRoute allowedRoles={["owner", "admin", "receptionist"]}><Pacientes /></ProtectedRoute>} />
              <Route path="/mensagens" element={<ProtectedRoute allowedRoles={["owner", "admin", "receptionist", "patient"]}><Mensagens /></ProtectedRoute>} />
              <Route path="/relatorios" element={<ProtectedRoute allowedRoles={["owner", "admin"]}><Relatorios /></ProtectedRoute>} />
              <Route path="/configuracoes" element={<ProtectedRoute allowedRoles={["owner", "admin"]}><Configuracoes /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
