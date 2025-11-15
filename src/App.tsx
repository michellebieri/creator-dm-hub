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
import CreatorWaitlist from "./pages/CreatorWaitlist";
import SessionManagement from "./pages/SessionManagement";
import NotificationSettings from "./pages/NotificationSettings";
import ReferralProgram from "./pages/ReferralProgram";
import CollectionsManager from "./pages/CollectionsManager";
import PromotionManager from "./pages/PromotionManager";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
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
            <Route path="/waitlist-status" element={<CreatorWaitlist />} />
            <Route path="/sessions" element={<SessionManagement />} />
            <Route path="/notification-settings" element={<NotificationSettings />} />
            <Route path="/referrals" element={<ReferralProgram />} />
            <Route path="/collections" element={<CollectionsManager />} />
            <Route path="/promotions" element={<PromotionManager />} />
          </Route>
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
