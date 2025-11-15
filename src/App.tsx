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
import MessagingInterface from "./pages/MessagingInterface";
import CreatorProfile from "./pages/CreatorProfile";
import PaymentSuccess from "./pages/PaymentSuccess";
import Creators from "./pages/Creators";
import ProfileSettings from "./pages/ProfileSettings";
import Conversations from "./pages/Conversations";
import PayoutSettings from "./pages/PayoutSettings";
import EarningsDashboard from "./pages/EarningsDashboard";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import Templates from "./pages/Templates";
import ContentVault from "./pages/ContentVault";
import ContentAnalytics from "./pages/ContentAnalytics";
import MyLibrary from "./pages/MyLibrary";
import PurchaseHistory from "./pages/PurchaseHistory";
import CreatorOnboarding from "./pages/CreatorOnboarding";
import AutoReplies from "./pages/AutoReplies";
import AdminDashboard from "./pages/AdminDashboard";
import UserManagement from "./pages/UserManagement";
import GlobalSearch from "./pages/GlobalSearch";
import ContentModeration from "./pages/ContentModeration";
import AdminModeration from "./pages/AdminModeration";
import CreatorWaitlist from "./pages/CreatorWaitlist";
import SessionManagement from "./pages/SessionManagement";
import NotificationSettings from "./pages/NotificationSettings";
import ReferralProgram from "./pages/ReferralProgram";
import CollectionsManager from "./pages/CollectionsManager";
import PromotionManager from "./pages/PromotionManager";
import RevenueAnalytics from "./pages/RevenueAnalytics";
import RefundManagement from "./pages/RefundManagement";
import VIPCustomers from "./pages/VIPCustomers";
import BroadcastMessages from "./pages/BroadcastMessages";
import CustomerSpendingAnalytics from "./pages/CustomerSpendingAnalytics";
import ConversionTracking from "./pages/ConversionTracking";
import TrafficSourceDashboard from "./pages/TrafficSourceDashboard";
import PerformanceBenchmarking from "./pages/PerformanceBenchmarking";
import ContentWatermark from "./pages/ContentWatermark";
import ContentExpiration from "./pages/ContentExpiration";
import ContentUpload from "./pages/ContentUpload";
import WelcomeAutomation from "./pages/WelcomeAutomation";
import PricingExperiments from "./pages/PricingExperiments";
import TwoFactorAuth from "./pages/TwoFactorAuth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AgeVerification from "./pages/AgeVerification";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Subscriptions from "./pages/Subscriptions";
import Following from "./pages/Following";
import Wishlist from "./pages/Wishlist";
import PrivacySettings from "./pages/PrivacySettings";
import AccountSettings from "./pages/AccountSettings";
import BlockedUsers from "./pages/BlockedUsers";
import { PromoCodeManager } from "./components/PromoCodeManager";
import { SubscriptionTiersManager } from "./components/SubscriptionTiersManager";
import SubscribersList from "./pages/SubscribersList";
import ContentTags from "./pages/ContentTags";
import CreatorVerification from "./pages/CreatorVerification";
import EmailPreferences from "./pages/EmailPreferences";
import ActivityFeed from "./pages/ActivityFeed";
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
          <Route path="/creator-onboarding" element={<CreatorOnboarding />} />
          <Route path="/creator/:username" element={<CreatorProfile />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          
          {/* Protected routes with sidebar */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<CreatorDashboard />} />
            <Route path="/messages" element={<MessagingInterface />} />
            <Route path="/conversations" element={<Conversations />} />
            <Route path="/creators" element={<Creators />} />
            <Route path="/profile-settings" element={<ProfileSettings />} />
            <Route path="/payout-settings" element={<PayoutSettings />} />
            <Route path="/earnings" element={<EarningsDashboard />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/vault" element={<ContentVault />} />
            <Route path="/content-analytics" element={<ContentAnalytics />} />
            <Route path="/library" element={<MyLibrary />} />
            <Route path="/purchase-history" element={<PurchaseHistory />} />
            <Route path="/auto-replies" element={<AutoReplies />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/search" element={<GlobalSearch />} />
            <Route path="/content-moderation" element={<ContentModeration />} />
            <Route path="/admin-moderation" element={<AdminModeration />} />
            <Route path="/waitlist-status" element={<CreatorWaitlist />} />
            <Route path="/sessions" element={<SessionManagement />} />
            <Route path="/notification-settings" element={<NotificationSettings />} />
            <Route path="/referrals" element={<ReferralProgram />} />
            <Route path="/collections" element={<CollectionsManager />} />
            <Route path="/promotions" element={<PromotionManager />} />
            <Route path="/revenue-analytics" element={<RevenueAnalytics />} />
            <Route path="/refunds" element={<RefundManagement />} />
            <Route path="/vip-customers" element={<VIPCustomers />} />
            <Route path="/broadcast" element={<BroadcastMessages />} />
            <Route path="/customer-spending" element={<CustomerSpendingAnalytics />} />
            <Route path="/conversion-tracking" element={<ConversionTracking />} />
            <Route path="/traffic-sources" element={<TrafficSourceDashboard />} />
            <Route path="/benchmarking" element={<PerformanceBenchmarking />} />
            <Route path="/content-watermark" element={<ContentWatermark />} />
            <Route path="/content-expiration" element={<ContentExpiration />} />
            <Route path="/welcome-automation" element={<WelcomeAutomation />} />
            <Route path="/pricing-experiments" element={<PricingExperiments />} />
            <Route path="/two-factor-auth" element={<TwoFactorAuth />} />
            <Route path="/age-verification" element={<AgeVerification />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/following" element={<Following />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/privacy-settings" element={<PrivacySettings />} />
            <Route path="/account-settings" element={<AccountSettings />} />
            <Route path="/blocked-users" element={<BlockedUsers />} />
            <Route path="/collections" element={<CollectionsManager />} />
            <Route path="/promo-codes" element={<PromoCodeManager />} />
            <Route path="/subscription-tiers" element={<SubscriptionTiersManager />} />
            <Route path="/subscribers" element={<SubscribersList />} />
            <Route path="/content-tags" element={<ContentTags />} />
            <Route path="/verification" element={<CreatorVerification />} />
            <Route path="/email-preferences" element={<EmailPreferences />} />
            <Route path="/activity-feed" element={<ActivityFeed />} />
            <Route path="/content-upload" element={<ContentUpload />} />
          </Route>
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
