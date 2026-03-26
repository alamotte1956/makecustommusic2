import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Layout from "./components/Layout";
import { QueuePlayerProvider } from "./contexts/QueuePlayerContext";
import QueuePlayerBar from "./components/QueuePlayerBar";
import TourTooltip from "./components/TourTooltip";
import OfflineIndicator from "./components/OfflineIndicator";
import PWAInstallBanner from "./components/PWAInstallBanner";
import { useReferral } from "./hooks/useReferral";
import { lazy, Suspense } from "react";

// ─── Route-level code splitting ───
// Home is eagerly loaded (landing page / LCP critical)
import Home from "./pages/Home";

// All other pages are lazily loaded to reduce initial bundle size
const Generator = lazy(() => import("./pages/Generator"));
const History = lazy(() => import("./pages/History"));
const Albums = lazy(() => import("./pages/Albums"));
const AlbumDetail = lazy(() => import("./pages/AlbumDetail"));
const Favorites = lazy(() => import("./pages/Favorites"));
const SongDetail = lazy(() => import("./pages/SongDetail"));
const Pricing = lazy(() => import("./pages/Pricing"));
const UsageDashboard = lazy(() => import("./pages/UsageDashboard"));
const Discover = lazy(() => import("./pages/Discover"));
const Upload = lazy(() => import("./pages/Upload"));
const SharedSong = lazy(() => import("./pages/SharedSong"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Referrals = lazy(() => import("./pages/Referrals"));
const Blog = lazy(() => import("./pages/Blog"));
const Mp3ToSheetMusic = lazy(() => import("./pages/Mp3ToSheetMusic"));
const BlogArticle = lazy(() => import("./pages/BlogArticle"));
const WorshipSetBuilder = lazy(() => import("./pages/WorshipSetBuilder"));
const ChurchLicensing = lazy(() => import("./pages/ChurchLicensing"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SheetMusicDebug = lazy(() => import("./pages/SheetMusicDebug"));

/** Minimal loading spinner for lazy route transitions */
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/generate"} component={Generator} />
        <Route path={"/history"} component={History} />
        <Route path={"/albums"} component={Albums} />
        <Route path={"/albums/:id"} component={AlbumDetail} />
        <Route path={"/favorites"} component={Favorites} />
        <Route path={"/songs/:id"} component={SongDetail} />
        <Route path={"/pricing"} component={Pricing} />
        <Route path={"/usage"} component={UsageDashboard} />
        <Route path={"/discover"} component={Discover} />
        <Route path={"/upload"} component={Upload} />
        <Route path={"/share/:token"} component={SharedSong} />
        <Route path={"/privacy"} component={Privacy} />
        <Route path={"/terms"} component={Terms} />
        <Route path={"/faq"} component={FAQ} />
        <Route path={"/referrals"} component={Referrals} />
        <Route path={"/mp3-to-sheet-music"} component={Mp3ToSheetMusic} />
        <Route path={"/blog"} component={Blog} />
        <Route path={"/blog/:slug"} component={BlogArticle} />
        <Route path={"/debug-sheet"} component={SheetMusicDebug} />
        <Route path={"/worship"} component={WorshipSetBuilder} />
        <Route path={"/licensing"} component={ChurchLicensing} />
        <Route path={"/admin"} component={AdminDashboard} />
        <Route path={"/admin/settings"} component={AdminSettings} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function ReferralCapture() {
  useReferral();
  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <QueuePlayerProvider>
          <TooltipProvider>
            <Toaster />
            <OfflineIndicator />
            <Layout>
              <Router />
            </Layout>
            <QueuePlayerBar />
            <PWAInstallBanner />
            <TourTooltip />
            <ReferralCapture />
          </TooltipProvider>
        </QueuePlayerProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
