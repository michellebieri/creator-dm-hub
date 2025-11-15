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
  Bell
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
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
  const isCollapsed = state === "collapsed";

  // Determine if user is creator based on their profile
  const isCreator = user?.user_metadata?.role === 'creator';

  // Check if user is admin (in production, check against user_roles table)
  const isAdminEmail = user?.email === 'admin@dm.me';

  const creatorItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Conversations", url: "/conversations", icon: MessageCircle },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
    { title: "Content Analytics", url: "/content-analytics", icon: BarChart3 },
    { title: "Earnings", url: "/earnings", icon: DollarSign },
    { title: "Content Vault", url: "/vault", icon: Vault },
    { title: "Auto-Replies", url: "/auto-replies", icon: Bot },
    { title: "Templates", url: "/templates", icon: FileText },
    { title: "Payouts", url: "/payout-settings", icon: CreditCard },
    ...(isAdminEmail ? [{ title: "Admin", url: "/admin", icon: Shield }] : []),
    { title: "Notifications", url: "/notification-settings", icon: Bell },
    { title: "Settings", url: "/profile-settings", icon: Settings },
  ];

  const customerItems = [
    { title: "Browse Creators", url: "/creators", icon: Users },
    { title: "Messages", url: "/messages", icon: MessageCircle },
    { title: "My Library", url: "/library", icon: Library },
    { title: "Purchase History", url: "/purchase-history", icon: Receipt },
    { title: "Conversations", url: "/conversations", icon: MessageCircle },
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
