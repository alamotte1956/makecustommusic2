import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Generator from "./pages/Generator";
import History from "./pages/History";
import Albums from "./pages/Albums";
import AlbumDetail from "./pages/AlbumDetail";
import Favorites from "./pages/Favorites";
import SongDetail from "./pages/SongDetail";
import Pricing from "./pages/Pricing";
import UsageDashboard from "./pages/UsageDashboard";
import Discover from "./pages/Discover";
import Upload from "./pages/Upload";
import SharedSong from "./pages/SharedSong";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Layout from "./components/Layout";
import { QueuePlayerProvider } from "./contexts/QueuePlayerContext";
import QueuePlayerBar from "./components/QueuePlayerBar";
import TourTooltip from "./components/TourTooltip";

function Router() {
  return (
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
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <QueuePlayerProvider>
          <TooltipProvider>
            <Toaster />
            <Layout>
              <Router />
            </Layout>
            <QueuePlayerBar />
            <TourTooltip />
          </TooltipProvider>
        </QueuePlayerProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
