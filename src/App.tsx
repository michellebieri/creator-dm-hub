import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CreatorDashboard from "./pages/CreatorDashboard";
import More from "./pages/More";
import Conversations from "./pages/Conversations";
import NotificationSettings from "./pages/NotificationSettings";
import ContentVault from "./pages/ContentVault";
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

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/creator/:username" element={<CreatorProfile />} />

          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<CreatorDashboard />} />
            <Route path="/conversations" element={<Conversations />} />
            <Route path="/notifications" element={<NotificationSettings />} />
            <Route path="/more" element={<More />} />
            <Route path="/vault" element={<ContentVault />} />
            <Route path="/profile" element={<ProfileSettings />} />
            <Route path="/account-settings" element={<AccountSettings />} />
            <Route path="/privacy-settings" element={<PrivacySettings />} />
            <Route path="/notification-settings" element={<NotificationSettings />} />
            <Route path="/following" element={<Following />} />
            <Route path="/subscribers" element={<SubscribersList />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/revenue" element={<RevenueAnalytics />} />
            <Route path="/broadcast" element={<BroadcastMessages />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
