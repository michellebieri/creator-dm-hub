import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CreatorAuth from "./pages/CreatorAuth";
import Creators from "./pages/Creators";
import CreatorDashboard from "./pages/CreatorDashboard";
import More from "./pages/More";
import Conversations from "./pages/Conversations";
import NotificationSettings from "./pages/NotificationSettings";
import ContentVault from "./pages/ContentVault";
import ContentUpload from "./pages/ContentUpload";
import ProfileSettings from "./pages/ProfileSettings";
import AccountSettings from "./pages/AccountSettings";
import PrivacySettings from "./pages/PrivacySettings";
import Following from "./pages/Following";
import SubscribersList from "./pages/SubscribersList";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import RevenueAnalytics from "./pages/RevenueAnalytics";
import BroadcastMessages from "./pages/BroadcastMessages";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CreatorProfile from "./pages/CreatorProfile";
import NotFound from "./pages/NotFound";
import Lists from "./pages/Lists";
import Nudges from "./pages/Nudges";
import ContentMenu from "./pages/ContentMenu";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes without layout */}
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/creator-auth" element={<CreatorAuth />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />

          {/* Routes with bottom navigation */}
          <Route element={<AppLayout />}>
            {/* Browse and creator profile pages */}
            <Route path="/browse" element={<Creators />} />
            <Route path="/creator/:username" element={<CreatorProfile />} />
            
            {/* Creator-only routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute requireCreator>
                <CreatorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/vault" element={
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
                <SubscribersList />
              </ProtectedRoute>
            } />
            <Route path="/earnings" element={
              <ProtectedRoute requireCreator>
                <RevenueAnalytics />
              </ProtectedRoute>
            } />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
