import { 
  MessageCircle, 
  LayoutDashboard, 
  Users, 
  Settings, 
  DollarSign,
  BarChart3,
  FileText,
  CreditCard,
  Vault,
  Bot,
  Library,
  Receipt,
  Shield,
  Bell,
  Search,
  Monitor,
  Radio,
  Crown,
  RefreshCw,
  Droplet,
  Clock,
  Sparkles,
  FlaskConical,
  ShieldCheck,
  KeyRound,
  Heart,
  Ban,
  Mail,
  Activity,
  Upload,
  Building2
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useRoleCheck } from "@/hooks/useRoleCheck";
import { usePlatformOwner } from "@/hooks/usePlatformOwner";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { state } = useSidebar();
  const { user } = useAuth();
  const { isAdmin, isCreator: hasCreatorRole } = useRoleCheck();
  const { isPlatformOwner } = usePlatformOwner();
  const isCollapsed = state === "collapsed";

  // Use user_roles table as authoritative source (hasCreatorRole comes from useRoleCheck)
  const isCreator = hasCreatorRole;

  const creatorItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Conversations", url: "/conversations", icon: MessageCircle },
    { title: "Broadcast", url: "/broadcast", icon: Radio },
    { title: "Subscribers", url: "/subscribers", icon: Users },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
    { title: "Content Analytics", url: "/content-analytics", icon: BarChart3 },
    { title: "Revenue Analytics", url: "/revenue-analytics", icon: DollarSign },
    { title: "Customer Spending", url: "/customer-spending", icon: Users },
    { title: "Conversion Tracking", url: "/conversion-tracking", icon: Shield },
    { title: "Traffic Sources", url: "/traffic-sources", icon: Search },
    { title: "Benchmarking", url: "/benchmarking", icon: Shield },
    { title: "Earnings", url: "/earnings", icon: DollarSign },
    { title: "Refunds", url: "/refunds", icon: RefreshCw },
    { title: "VIP Customers", url: "/vip-customers", icon: Crown },
    { title: "Content Vault", url: "/vault", icon: Vault },
    { title: "Upload Content", url: "/content-upload", icon: Upload },
    { title: "Content Tags", url: "/content-tags", icon: FileText },
    { title: "Collections", url: "/collections", icon: Library },
    { title: "Content Watermark", url: "/content-watermark", icon: Droplet },
    { title: "Content Expiration", url: "/content-expiration", icon: Clock },
    { title: "Welcome Messages", url: "/welcome-automation", icon: Sparkles },
    { title: "Pricing Tests", url: "/pricing-experiments", icon: FlaskConical },
    { title: "Content Moderation", url: "/content-moderation", icon: Shield },
    { title: "Auto-Replies", url: "/auto-replies", icon: Bot },
    { title: "Templates", url: "/templates", icon: FileText },
    { title: "Subscription Tiers", url: "/subscription-tiers", icon: Crown },
    { title: "Promo Codes", url: "/promo-codes", icon: Receipt },
    { title: "Payouts", url: "/payout-settings", icon: CreditCard },
    { title: "Verification", url: "/verification", icon: ShieldCheck },
    { title: "Activity Feed", url: "/activity-feed", icon: Activity },
    ...(isAdmin ? [
      { title: "Admin Dashboard", url: "/admin", icon: Shield },
      { title: "Admin Moderation", url: "/admin-moderation", icon: Shield },
      { title: "User Management", url: "/users", icon: Users }
    ] : []),
    ...(isPlatformOwner ? [
      { title: "Platform Revenue", url: "/admin-revenue", icon: Building2 },
    ] : []),
    { title: "Search", url: "/search", icon: Search },
    { title: "Sessions", url: "/sessions", icon: Monitor },
    { title: "Two-Factor Auth", url: "/two-factor-auth", icon: KeyRound },
    { title: "Age Verification", url: "/age-verification", icon: ShieldCheck },
    { title: "Email Preferences", url: "/email-preferences", icon: Mail },
    { title: "Notifications", url: "/notification-settings", icon: Bell },
    { title: "Settings", url: "/profile-settings", icon: Settings },
  ];

  const customerItems = [
    { title: "Messages", url: "/messages", icon: MessageCircle },
    { title: "Activity Feed", url: "/activity-feed", icon: Activity },
    { title: "Search", url: "/search", icon: Search },
    { title: "My Library", url: "/library", icon: Library },
    { title: "Subscriptions", url: "/subscriptions", icon: Crown },
    { title: "Following", url: "/following", icon: Users },
    { title: "Wishlist", url: "/wishlist", icon: Heart },
    { title: "Purchase History", url: "/purchase-history", icon: Receipt },
    { title: "Conversations", url: "/conversations", icon: MessageCircle },
    { title: "Blocked Users", url: "/blocked-users", icon: Ban },
    { title: "Privacy", url: "/privacy-settings", icon: Shield },
    { title: "Account", url: "/account-settings", icon: Settings },
    { title: "Sessions", url: "/sessions", icon: Monitor },
    { title: "Two-Factor Auth", url: "/two-factor-auth", icon: KeyRound },
    { title: "Age Verification", url: "/age-verification", icon: ShieldCheck },
    { title: "Email Preferences", url: "/email-preferences", icon: Mail },
    { title: "Notifications", url: "/notification-settings", icon: Bell },
    { title: "Settings", url: "/profile-settings", icon: Settings },
  ];

  const items = isCreator ? creatorItems : customerItems;

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-60"}>
      <SidebarHeader className="border-b px-4 py-3">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">DM.me</span>
          </div>
        )}
        {isCollapsed && <MessageCircle className="h-6 w-6 text-primary mx-auto" />}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{isCollapsed ? "" : isCreator ? "Creator Tools" : "Navigation"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/dashboard" || item.url === "/messages"}
                      className="hover:bg-muted/50" 
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className={isCollapsed ? "h-4 w-4" : "mr-2 h-4 w-4"} />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
