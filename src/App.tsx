import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { DemoProvider } from "@/hooks/useDemoMode";
import ProtectedRoute from "@/components/ProtectedRoute";
import { TrialBanner } from "@/components/TrialBanner";
import { DemoBanner } from "@/components/DemoBanner";

// Public pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiesPolicy from "./pages/CookiesPolicy";
import PublicBooking from "./pages/PublicBooking";
import BookingSuccess from "./pages/BookingSuccess";
import ClienteHome from "./pages/cliente/ClienteHome";
import ClienteMisCitas from "./pages/cliente/ClienteMisCitas";
import NotFound from "./pages/NotFound";

// Protected pages
import Dashboard from "./pages/Dashboard";
import NailAnalysis from "./pages/NailAnalysis";
import ChatAssistant from "./pages/ChatAssistant";
import TreatmentRecommender from "./pages/TreatmentRecommender";
import AppointmentManagement from "./pages/AppointmentManagement";
import DemandPrediction from "./pages/DemandPrediction";
import PrivacyManagementPage from "./pages/PrivacyManagementPage";
import NailConditions from "./pages/NailConditions";
import NailConditionDetail from "./pages/NailConditionDetail";
import Subscribe from "./pages/Subscribe";
import Checkout from "./pages/Checkout";
import Account from "./pages/Account";
import EmployeesPage from "./pages/EmployeesPage";
import AdminPage from "./pages/AdminPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DemoProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <TrialBanner />
            <DemoBanner />
            <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/terminos" element={<TermsOfService />} />
            <Route path="/privacidad" element={<PrivacyPolicy />} />
            <Route path="/cookies" element={<CookiesPolicy />} />
            <Route path="/reservar/:centerId" element={<PublicBooking />} />
            <Route path="/reservar/exito" element={<BookingSuccess />} />

            {/* App cliente */}
            <Route path="/cliente" element={<ClienteHome />} />
            <Route path="/cliente/mis-citas" element={<ClienteMisCitas />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/analisis-ungueal" element={
              <ProtectedRoute><NailAnalysis /></ProtectedRoute>
            } />
            <Route path="/asistente-chat" element={
              <ProtectedRoute><ChatAssistant /></ProtectedRoute>
            } />
            <Route path="/recomendador-tratamientos" element={
              <ProtectedRoute><TreatmentRecommender /></ProtectedRoute>
            } />
            <Route path="/gestion-citas" element={
              <ProtectedRoute><AppointmentManagement /></ProtectedRoute>
            } />
            <Route path="/prediccion-demanda" element={
              <ProtectedRoute><DemandPrediction /></ProtectedRoute>
            } />
            <Route path="/gestion-privacidad" element={
              <ProtectedRoute><PrivacyManagementPage /></ProtectedRoute>
            } />
            <Route path="/nail-conditions" element={
              <ProtectedRoute><NailConditions /></ProtectedRoute>
            } />
            <Route path="/nail-conditions/:id" element={
              <ProtectedRoute><NailConditionDetail /></ProtectedRoute>
            } />
            {/* Public subscription pages */}
            <Route path="/subscribe" element={<Subscribe />} />
            <Route path="/planes" element={<Subscribe />} />
            <Route path="/checkout" element={
              <ProtectedRoute><Checkout /></ProtectedRoute>
            } />
            <Route path="/account" element={
              <ProtectedRoute><Account /></ProtectedRoute>
            } />
            <Route path="/equipo" element={
              <ProtectedRoute><EmployeesPage /></ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute><AdminPage /></ProtectedRoute>
            } />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </DemoProvider>
  </AuthProvider>
</QueryClientProvider>
);

export default App;
