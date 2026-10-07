import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";

import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";

import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";
import Activities from "./pages/Activities.tsx";
import Emissions from "./pages/Emissions.tsx";
import Validation from "./pages/Validation";
import UploadData from "./pages/UploadData";
import Analytics from "./pages/Analytics";
import Assistant from "./pages/Assistant";
import Recommendations from "./pages/Recommendations";
import Simulator from "./pages/Simulator";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

function InitialRouteCheck({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  useEffect(() => {
    const sessionActive = sessionStorage.getItem("carbontrack_session_active");
    // Directly open /signin on app launch unless session is active or on an explicit sub-route
    if (!sessionActive && window.location.pathname === "/") {
      navigate("/signin", { replace: true });
    }
  }, [navigate]);

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <InitialRouteCheck>
          <Routes>
            <Route path="/signin" element={<SignIn />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/activities" element={<Activities />} />
              <Route path="/emissions" element={<Emissions />} />
              <Route path="/validation" element={<Validation />} />
              <Route path="/upload" element={<UploadData />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/assistant" element={<Assistant />} />
              <Route path="/recommendations" element={<Recommendations />} />
              <Route path="/simulator" element={<Simulator />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
        </InitialRouteCheck>
      </AuthProvider>
    </BrowserRouter>
  );
}