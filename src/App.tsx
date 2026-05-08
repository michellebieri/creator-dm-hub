import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CreatorAuth from "./pages/CreatorAuth";
import Creators from "./pages/Creators";
import Dashboard from "./pages/Dashboard";
import CreatorDashboard from "./pages/CreatorDashboard";
import More from "./pages/More";
import Conversations from "./pages/Conversations";
import NotificationSettings from "./pages/NotificationSettings";
import ContentVault from "./pages/ContentVault";
import Vault from "./pages/Vault";
import ContentUpload from "./pages/ContentUpload";
import ProfileSettings from "./pages/ProfileSettings";
import AccountSettings from "./pages/AccountSettings";
import PrivacySettings from "./pages/PrivacySettings";
import Following from "./pages/Following";
import SubscribersList from "./pages/SubscribersList";
import Subscriptions from "./pages/Subscriptions";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import RevenueAnalytics from "./pages/RevenueAnalytics";
import BroadcastMessages from "./pages/BroadcastMessages";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CreatorProfile from "./pages/CreatorProfile";
import CustomerProfile from "./pages/CustomerProfile";
import NotFound from "./pages/NotFound";
import PaymentSuccess from "./pages/PaymentSuccess";
import Lists from "./pages/Lists";
import Nudges from "./pages/Nudges";
import ContentMenu from "./pages/ContentMenu";
import MessagingInterface from "./pages/MessagingInterface";
import WelcomeMessage from "./pages/WelcomeMessage";
import MessagingSettings from "./pages/settings/MessagingSettings";
import SubscriptionSettings from "./pages/settings/SubscriptionSettings";
import BundleSettings from "./pages/settings/BundleSettings";
import SocialsSettings from "./pages/settings/SocialsSettings";
import ProfileSettings2 from "./pages/settings/ProfileSettings";
import GeneralSettings from "./pages/settings/GeneralSettings";
import AccountManagement from "./pages/settings/AccountManagement";
import AIPersonaSettings from "./pages/settings/AIPersonaSettings";
import PaymentMethods from "./pages/PaymentMethods";
import Wallet from "./pages/Wallet";
import CreatorRevenue from "./pages/CreatorRevenue";
import AdminRevenue from "./pages/AdminRevenue";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes without layout */}
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/creator-auth" element={<CreatorAuth />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          
          {/* Public creator profile routes - accessible without login */}
          <Route path="/creator/:id" element={<CreatorProfile />} />
          <Route path="/:id" element={<CreatorProfile />} />

          {/* Routes with bottom navigation */}
          <Route element={<AppLayout />}>
            {/* Browse pages */}
            <Route path="/browse" element={<Creators />} />
            <Route path="/customer/:id" element={
              <ProtectedRoute requireCreator>
                <CustomerProfile />
              </ProtectedRoute>
            } />
            
            {/* Dashboard route - different for creators vs customers */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            {/* Creator-specific dashboard */}
            <Route path="/creator-dashboard" element={
              <ProtectedRoute requireCreator>
                <CreatorDashboard />
              </ProtectedRoute>
            } />
            
            {/* Vault - different for creators vs customers */}
            <Route path="/vault" element={
              <ProtectedRoute>
                <Vault />
              </ProtectedRoute>
            } />
            <Route path="/content-vault" element={
              <ProtectedRoute requireCreator>
                <ContentVault />
              </ProtectedRoute>
            } />
            <Route path="/content-upload" element={
              <ProtectedRoute requireCreator>
                <ContentUpload />
              </ProtectedRoute>
            } />
            <Route path="/subscribers" element={
              <ProtectedRoute requireCreator>
                <SubscribersList />
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute requireCreator>
                <AnalyticsDashboard />
              </ProtectedRoute>
            } />
            <Route path="/revenue" element={
              <ProtectedRoute requireCreator>
                <RevenueAnalytics />
              </ProtectedRoute>
            } />
            <Route path="/broadcast" element={
              <ProtectedRoute requireCreator>
                <BroadcastMessages />
              </ProtectedRoute>
            } />
            
            {/* Shared authenticated routes */}
            <Route path="/conversations" element={
              <ProtectedRoute>
                <Conversations />
              </ProtectedRoute>
            } />
            <Route path="/messages" element={
              <ProtectedRoute>
                <MessagingInterface />
              </ProtectedRoute>
            } />
            <Route path="/notifications" element={
              <ProtectedRoute>
                <NotificationSettings />
              </ProtectedRoute>
            } />
            <Route path="/more" element={
              <ProtectedRoute>
                <More />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfileSettings />
              </ProtectedRoute>
            } />
            <Route path="/account-settings" element={
              <ProtectedRoute>
                <AccountSettings />
              </ProtectedRoute>
            } />
            <Route path="/welcome-message/:messageNumber" element={
              <ProtectedRoute requireCreator>
                <WelcomeMessage />
              </ProtectedRoute>
            } />
            <Route path="/settings/account" element={
              <ProtectedRoute>
                <GeneralSettings />
              </ProtectedRoute>
            } />
            <Route path="/settings/profile" element={
              <ProtectedRoute>
                <ProfileSettings2 />
              </ProtectedRoute>
            } />
            <Route path="/settings/messaging" element={
              <ProtectedRoute requireCreator>
                <MessagingSettings />
              </ProtectedRoute>
            } />
            <Route path="/settings/subscription" element={
              <ProtectedRoute requireCreator>
                <SubscriptionSettings />
              </ProtectedRoute>
            } />
            <Route path="/settings/bundle" element={
              <ProtectedRoute requireCreator>
                <BundleSettings />
              </ProtectedRoute>
            } />
            <Route path="/settings/socials" element={
              <ProtectedRoute requireCreator>
                <SocialsSettings />
              </ProtectedRoute>
            } />
            <Route path="/settings/management" element={
              <ProtectedRoute>
                <AccountManagement />
              </ProtectedRoute>
            } />
            <Route path="/settings/ai-persona" element={
              <ProtectedRoute requireCreator>
                <AIPersonaSettings />
              </ProtectedRoute>
            } />
            <Route path="/privacy-settings" element={
              <ProtectedRoute>
                <PrivacySettings />
              </ProtectedRoute>
            } />
            <Route path="/notification-settings" element={
              <ProtectedRoute>
                <NotificationSettings />
              </ProtectedRoute>
            } />
            <Route path="/following" element={
              <ProtectedRoute>
                <Following />
              </ProtectedRoute>
            } />
            <Route path="/lists" element={
              <ProtectedRoute>
                <Lists />
              </ProtectedRoute>
            } />
            <Route path="/nudges" element={
              <ProtectedRoute requireCreator>
                <Nudges />
              </ProtectedRoute>
            } />
            <Route path="/content-menu" element={
              <ProtectedRoute requireCreator>
                <ContentMenu />
              </ProtectedRoute>
            } />
            <Route path="/subscriptions" element={
              <ProtectedRoute>
                <Subscriptions />
              </ProtectedRoute>
            } />
            <Route path="/payment-methods" element={
              <ProtectedRoute>
                <PaymentMethods />
              </ProtectedRoute>
            } />
            <Route path="/earnings" element={
              <ProtectedRoute requireCreator>
                <RevenueAnalytics />
              </ProtectedRoute>
            } />
            <Route path="/wallet" element={
              <ProtectedRoute>
                <Wallet />
              </ProtectedRoute>
            } />
            <Route path="/creator-revenue" element={
              <ProtectedRoute requireCreator>
                <CreatorRevenue />
              </ProtectedRoute>
            } />
            <Route path="/admin-revenue" element={
              <ProtectedRoute requireAdmin>
                <AdminRevenue />
              </ProtectedRoute>
            } />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
