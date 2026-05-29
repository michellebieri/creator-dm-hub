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
import AuthCallback from "./pages/AuthCallback";
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
import AiDraftsReview from "./pages/AiDraftsReview";
import PaymentMethods from "./pages/PaymentMethods";
import Wallet from "./pages/Wallet";
import CreatorRevenue from "./pages/CreatorRevenue";
import AdminRevenue from "./pages/AdminRevenue";

// Additional pages
import ActivityFeed from "./pages/ActivityFeed";
import AutoReplies from "./pages/AutoReplies";
import BlockedUsers from "./pages/BlockedUsers";
import CollectionsManager from "./pages/CollectionsManager";
import ContentAnalytics from "./pages/ContentAnalytics";
import ContentExpiration from "./pages/ContentExpiration";
import ContentModeration from "./pages/ContentModeration";
import ContentTags from "./pages/ContentTags";
import ContentWatermark from "./pages/ContentWatermark";
import ConversionTracking from "./pages/ConversionTracking";
import CreatorOnboarding from "./pages/CreatorOnboarding";
import CreatorVerification from "./pages/CreatorVerification";
import CreatorWaitlist from "./pages/CreatorWaitlist";
import CreatorApplicationPending from "./pages/CreatorApplicationPending";
import CustomerSpendingAnalytics from "./pages/CustomerSpendingAnalytics";
import EmailPreferences from "./pages/EmailPreferences";
import GlobalSearch from "./pages/GlobalSearch";
import MyLibrary from "./pages/MyLibrary";
import PayoutSettings from "./pages/PayoutSettings";
import PerformanceBenchmarking from "./pages/PerformanceBenchmarking";
import PricingExperiments from "./pages/PricingExperiments";
import PromotionManager from "./pages/PromotionManager";
import PurchaseHistory from "./pages/PurchaseHistory";
import ReferralProgram from "./pages/ReferralProgram";
import RefundManagement from "./pages/RefundManagement";
import SessionManagement from "./pages/SessionManagement";
import Templates from "./pages/Templates";
import TrafficSourceDashboard from "./pages/TrafficSourceDashboard";
import TwoFactorAuth from "./pages/TwoFactorAuth";
import UserManagement from "./pages/UserManagement";
import VIPCustomers from "./pages/VIPCustomers";
import WelcomeAutomation from "./pages/WelcomeAutomation";
import Wishlist from "./pages/Wishlist";
import AdminDashboard from "./pages/AdminDashboard";
import AdminModeration from "./pages/AdminModeration";
import AgeVerification from "./pages/AgeVerification";

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
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/creator-auth" element={<CreatorAuth />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/creator-onboarding" element={<CreatorOnboarding />} />
          <Route path="/creator-waitlist" element={<CreatorWaitlist />} />
          <Route path="/creator-application-pending" element={<CreatorApplicationPending />} />

          {/* Public creator profile routes - accessible without login */}
          <Route path="/creator/:id" element={<CreatorProfile />} />
          <Route path="/:id" element={<CreatorProfile />} />

          {/* Routes with bottom navigation */}
          <Route element={<AppLayout />}>
            {/* /browse removed — platform is invite-only via creator direct links */}
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
            <Route path="/ai-drafts" element={
              <ProtectedRoute requireCreator>
                <AiDraftsReview />
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

            {/* Creator analytics & tools */}
            <Route path="/content-analytics" element={
              <ProtectedRoute requireCreator>
                <ContentAnalytics />
              </ProtectedRoute>
            } />
            <Route path="/revenue-analytics" element={
              <ProtectedRoute requireCreator>
                <RevenueAnalytics />
              </ProtectedRoute>
            } />
            <Route path="/customer-spending" element={
              <ProtectedRoute requireCreator>
                <CustomerSpendingAnalytics />
              </ProtectedRoute>
            } />
            <Route path="/conversion-tracking" element={
              <ProtectedRoute requireCreator>
                <ConversionTracking />
              </ProtectedRoute>
            } />
            <Route path="/traffic-sources" element={
              <ProtectedRoute requireCreator>
                <TrafficSourceDashboard />
              </ProtectedRoute>
            } />
            <Route path="/benchmarking" element={
              <ProtectedRoute requireCreator>
                <PerformanceBenchmarking />
              </ProtectedRoute>
            } />
            <Route path="/vip-customers" element={
              <ProtectedRoute requireCreator>
                <VIPCustomers />
              </ProtectedRoute>
            } />
            <Route path="/refunds" element={
              <ProtectedRoute requireCreator>
                <RefundManagement />
              </ProtectedRoute>
            } />
            <Route path="/pricing-experiments" element={
              <ProtectedRoute requireCreator>
                <PricingExperiments />
              </ProtectedRoute>
            } />
            <Route path="/promotion-manager" element={
              <ProtectedRoute requireCreator>
                <PromotionManager />
              </ProtectedRoute>
            } />

            {/* Creator content management */}
            <Route path="/content-tags" element={
              <ProtectedRoute requireCreator>
                <ContentTags />
              </ProtectedRoute>
            } />
            <Route path="/collections" element={
              <ProtectedRoute requireCreator>
                <CollectionsManager />
              </ProtectedRoute>
            } />
            <Route path="/content-watermark" element={
              <ProtectedRoute requireCreator>
                <ContentWatermark />
              </ProtectedRoute>
            } />
            <Route path="/content-expiration" element={
              <ProtectedRoute requireCreator>
                <ContentExpiration />
              </ProtectedRoute>
            } />
            <Route path="/content-moderation" element={
              <ProtectedRoute requireCreator>
                <ContentModeration />
              </ProtectedRoute>
            } />
            <Route path="/welcome-automation" element={
              <ProtectedRoute requireCreator>
                <WelcomeAutomation />
              </ProtectedRoute>
            } />
            <Route path="/auto-replies" element={
              <ProtectedRoute requireCreator>
                <AutoReplies />
              </ProtectedRoute>
            } />
            <Route path="/templates" element={
              <ProtectedRoute requireCreator>
                <Templates />
              </ProtectedRoute>
            } />
            <Route path="/payout-settings" element={
              <ProtectedRoute requireCreator>
                <PayoutSettings />
              </ProtectedRoute>
            } />
            <Route path="/verification" element={
              <ProtectedRoute requireCreator>
                <CreatorVerification />
              </ProtectedRoute>
            } />

            {/* Customer-only routes */}
            <Route path="/library" element={
              <ProtectedRoute>
                <MyLibrary />
              </ProtectedRoute>
            } />
            <Route path="/wishlist" element={
              <ProtectedRoute>
                <Wishlist />
              </ProtectedRoute>
            } />
            <Route path="/purchase-history" element={
              <ProtectedRoute>
                <PurchaseHistory />
              </ProtectedRoute>
            } />
            <Route path="/blocked-users" element={
              <ProtectedRoute>
                <BlockedUsers />
              </ProtectedRoute>
            } />

            {/* Shared routes */}
            <Route path="/activity-feed" element={
              <ProtectedRoute>
                <ActivityFeed />
              </ProtectedRoute>
            } />
            <Route path="/search" element={
              <ProtectedRoute>
                <GlobalSearch />
              </ProtectedRoute>
            } />
            <Route path="/email-preferences" element={
              <ProtectedRoute>
                <EmailPreferences />
              </ProtectedRoute>
            } />
            <Route path="/sessions" element={
              <ProtectedRoute>
                <SessionManagement />
              </ProtectedRoute>
            } />
            <Route path="/two-factor-auth" element={
              <ProtectedRoute>
                <TwoFactorAuth />
              </ProtectedRoute>
            } />
            <Route path="/age-verification" element={
              <ProtectedRoute>
                <AgeVerification />
              </ProtectedRoute>
            } />
            <Route path="/referral" element={
              <ProtectedRoute>
                <ReferralProgram />
              </ProtectedRoute>
            } />

            {/* Admin routes */}
            <Route path="/admin" element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin-moderation" element={
              <ProtectedRoute requireAdmin>
                <AdminModeration />
              </ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute requireAdmin>
                <UserManagement />
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
