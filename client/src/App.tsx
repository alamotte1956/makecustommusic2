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
import Layout from "./components/Layout";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/generate"} component={Generator} />
      <Route path={"/history"} component={History} />
      <Route path={"/albums"} component={Albums} />
      <Route path={"/albums/:id"} component={AlbumDetail} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Layout>
            <Router />
          </Layout>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
