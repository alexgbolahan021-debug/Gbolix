import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/ThemeProvider";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";

// Setup
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo-icon.jpg`,
  },
  variables: {
    colorPrimary: "#00FF66",
    colorForeground: "#FFFFFF",
    colorMutedForeground: "#CBD5E1",
    colorDanger: "#ef4444",
    colorBackground: "#121821",
    colorInput: "#0B0F14",
    colorInputForeground: "#FFFFFF",
    colorNeutral: "#1e293b",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#121821] rounded-2xl w-[440px] max-w-full overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-white",
    headerSubtitle: "text-slate-400",
    socialButtonsBlockButtonText: "text-white",
    formFieldLabel: "text-white",
    footerActionLink: "text-[#00FF66] hover:text-[#00cc52]",
    footerActionText: "text-slate-400",
    dividerText: "text-slate-400",
    identityPreviewEditButton: "text-[#00FF66]",
    formFieldSuccessText: "text-[#00FF66]",
    alertText: "text-red-500",
    logoBox: "",
    logoImage: "h-8",
    socialButtonsBlockButton: "border-slate-800 hover:bg-slate-800/50",
    formButtonPrimary: "bg-[#00FF66] text-black hover:bg-[#00cc52]",
    formFieldInput: "bg-[#0B0F14] border-slate-800 text-white focus:border-[#00FF66]",
    footerAction: "",
    dividerLine: "bg-slate-800",
    alert: "border-red-500/50 bg-red-500/10",
    otpCodeFieldInput: "border-slate-800 bg-[#0B0F14] text-white focus:border-[#00FF66]",
    formFieldRow: "",
    main: "",
  },
};

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);
  return null;
}

// Pages
import Home from "@/pages/Home";
import Services from "@/pages/Services";
import Products from "@/pages/Products";
import Pricing from "@/pages/Pricing";
import Dashboard from "@/pages/Dashboard";
import Tasks from "@/pages/Tasks";
import Files from "@/pages/Files";
import Messages from "@/pages/Messages";
import Profile from "@/pages/Profile";
import NewRequest from "@/pages/NewRequest";
import Onboarding from "@/pages/Onboarding";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminProjects from "@/pages/admin/AdminProjects";
import AdminMessages from "@/pages/admin/AdminMessages";
import AdminFiles from "@/pages/admin/AdminFiles";
import AdminInsights from "@/pages/admin/AdminInsights";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import DevRoutes from "@/pages/dev/DevRoutes";

import { useGetMe } from "@workspace/api-client-react";

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <Home />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component, adminOnly = false }: { component: any, adminOnly?: boolean }) {
  const { data: profile, isLoading } = useGetMe();
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded || isLoading) return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Loading...</div>;

  if (!isSignedIn) return <Redirect to="/sign-in" />;

  if (profile && !profile.onboardingCompleted) {
    return <Redirect to="/onboarding" />;
  }

  if (adminOnly && profile?.role !== 'admin') {
    return <Redirect to="/dashboard" />;
  }

  return <Component />;
}

function OnboardingRoute() {
  const { data: profile, isLoading } = useGetMe();
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded || isLoading) return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Loading...</div>;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  if (profile?.onboardingCompleted) return <Redirect to="/dashboard" />;

  return <Onboarding />;
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      
      {/* Public Routes */}
      <Route path="/services" component={Services} />
      <Route path="/products" component={Products} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />

      {/* Dev Tools (development only) */}
      {import.meta.env.DEV && <Route path="/dev/routes" component={DevRoutes} />}

      {/* Auth Routes */}
      <Route path="/onboarding" component={OnboardingRoute} />

      {/* Client Portal */}
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/tasks"><ProtectedRoute component={Tasks} /></Route>
      <Route path="/files"><ProtectedRoute component={Files} /></Route>
      <Route path="/messages"><ProtectedRoute component={Messages} /></Route>
      <Route path="/profile"><ProtectedRoute component={Profile} /></Route>
      <Route path="/new-request"><ProtectedRoute component={NewRequest} /></Route>

      {/* Admin Portal */}
      <Route path="/admin">
        <ProtectedRoute component={() => <Redirect to="/admin/dashboard" />} adminOnly />
      </Route>
      <Route path="/admin/dashboard"><ProtectedRoute component={AdminDashboard} adminOnly /></Route>
      <Route path="/admin/users"><ProtectedRoute component={AdminUsers} adminOnly /></Route>
      <Route path="/admin/projects"><ProtectedRoute component={AdminProjects} adminOnly /></Route>
      <Route path="/admin/messages"><ProtectedRoute component={AdminMessages} adminOnly /></Route>
      <Route path="/admin/files"><ProtectedRoute component={AdminFiles} adminOnly /></Route>
      <Route path="/admin/insights"><ProtectedRoute component={AdminInsights} adminOnly /></Route>

      <Route>404 Not Found</Route>
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      localization={{
        signIn: {
          start: {
            title: "Welcome Back",
            subtitle: "Access your Gbolix workspace.",
          },
        },
        signUp: {
          start: {
            title: "Create Your Account",
            subtitle: "Start building, automating, and scaling today.",
          },
        },
      }}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <AppRouter />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="gbolix-theme">
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
