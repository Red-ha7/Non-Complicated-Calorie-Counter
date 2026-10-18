import { useEffect, useState } from "react";
import { Auth } from "./components/Auth";
import { Ideas } from "./components/Ideas";
import { Insights } from "./components/Insights";
import { Library } from "./components/Library";
import { Settings } from "./components/Settings";
import { Today } from "./components/Today";
import { TabBar, Toast } from "./components/ui";
import { Weight } from "./components/Weight";
import { StoreProvider, useStore } from "./store";
import { Onboarding } from "./components/Onboarding";
import type { Overlay, Tab } from "./types";

function Shell() {
  const [tab, setTab] = useState<Tab>("today");
  const [overlay, setOverlay] = useState<Overlay>(null);

  // Each screen starts at the top, like a fresh page.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab, overlay]);

  const goTab = (t: Tab) => {
    setOverlay(null);
    setTab(t);
  };

  let screen;
  if (overlay === "library") screen = <Library onBack={() => setOverlay(null)} />;
  else if (overlay === "settings")
    screen = <Settings onBack={() => setOverlay(null)} />;
  else if (tab === "today")
    screen = (
      <Today onOpenLibrary={() => setOverlay("library")} onOpenSettings={() => setOverlay("settings")} />
    );
  else if (tab === "insights") screen = <Insights />;
  else if (tab === "weight") screen = <Weight />;
  else screen = <Ideas />;

  return (
    <>
      <main
        className="app"
        style={{ paddingBottom: overlay === "settings" || (tab === "today" && !overlay) ? 200 : undefined }}
      >
        {screen}
      </main>
      <TabBar active={overlay ? null : tab} onChange={goTab} />
    </>
  );
}

function Gate() {
  const { loading, loadError, retry, signOut, signedIn, onboarded } = useStore();

  if (loadError) {
    return (
      <main className="auth">
        <div className="card empty">
          <h3>Couldn&rsquo;t load your data.</h3>
          <p>Check your connection and try again.</p>
          <button className="btn primary inline" style={{ margin: "24px auto 0" }} onClick={retry}>
            Try again
          </button>
          <button className="link" style={{ marginTop: 16 }} onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </main>
    );
  }
  if (loading) {
    return (
      <main className="auth" aria-busy="true" aria-label="Loading">
        <p className="brand">
          NC<sup>3</sup>
        </p>
      </main>
    );
  }
  if (!signedIn) return <Auth />;
  if (!onboarded) return <Onboarding />;
  return <Shell />;
}

export default function App() {
  return (
    <StoreProvider>
      <Gate />
      <Toast />
    </StoreProvider>
  );
}
