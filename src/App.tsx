import { useEffect } from "react";
import Wizard from "./components/Wizard";
import PhotoChecker from "./components/PhotoChecker";
import { useAppStore, type AppMode } from "./state/store";
import { GitHubStarLink, REPO_URL } from "./components/ui/GitHubStar";
import FeedbackDialog from "./components/ui/FeedbackDialog";
import { useFeedback } from "./state/feedback";
import { BRAND } from "./brand";
import ExamTool from "./components/ExamTool";
import BackgroundRemover from "./components/BackgroundRemover";
import { isExamPath } from "./utils/examRoute";
import { backgroundPath } from "./utils/backgroundRoute";

/** The footer strip, written as the machine-readable zone of an ID card ("I<" document code). */
const MRZ = `I<UTO${BRAND.toUpperCase().replace(/\s+/g, "")}<<PASSPORT<VISA<ID<LICENCE<<FREE<<NO<UPLOAD<<<<<<<<`;

const MODES: Array<{ id: AppMode; label: string; hint: string }> = [
  { id: "make", label: "Make a photo", hint: "from any picture" },
  { id: "check", label: "Check a photo", hint: "you already have" }
];

export default function App() {
  const examMode = isExamPath();
  const backgroundMode = !!backgroundPath();
  const mode = useAppStore(s => s.mode);
  const setMode = useAppStore(s => s.setMode);
  const editing = useAppStore(s => s.mode === "make" && s.step > 1);

  // The prerendered section below the app (country links, a document's requirements) is for
  // arriving and browsing. Once a photo is being worked on it only pushes the page around,
  // so index.css hides it. Crawlers see the first step, where it is shown.
  useEffect(() => {
    document.documentElement.toggleAttribute("data-editing", editing);
  }, [editing]);

  const showFeedback = useFeedback(s => s.show);
  // The prerendered requirements link to #report: static HTML can't open the form itself.
  useEffect(() => {
    const fromHash = () => {
      if (window.location.hash !== "#report") return;
      history.replaceState(null, "", window.location.pathname + window.location.search);
      showFeedback({ topic: "spec" });
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [showFeedback]);

  return (
    <div className="app">
      <header className="topbar">
        {/* A link home: document pages are entry points from search, and the full catalogue
            lives on the homepage. */}
        <a className="brand" href="/">
          <span className="mark">[+]</span>
          {BRAND}
        </a>
        <a className="examNav" href="/exam">Exam photos</a>
        <a className="examNav" href="/background-remover">Remove background</a>

        <div className="topbarRight">
          <span className="trustbadge">
            <span className="dot" />
            Runs on your device — nothing is uploaded
          </span>
          <GitHubStarLink />
        </div>
      </header>

      <main className="main">
        {backgroundMode ? (
          <BackgroundRemover />
        ) : examMode ? (
          <ExamTool />
        ) : (
          <>
            <div className="modeSwitch" role="tablist" aria-label="What to do">
              {MODES.map(m => (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={mode === m.id}
                  className={`modeTab ${mode === m.id ? "active" : ""}`}
                  onClick={() => setMode(m.id)}
                >
                  {m.label} <span className="modeHint">{m.hint}</span>
                </button>
              ))}
            </div>

            {mode === "make" ? <Wizard /> : <PhotoChecker />}
          </>
        )}
      </main>

      <footer className="footer">
        <div className="footerRow">
          <span>
            Free and open source. No account, no tracking, no photo ever leaves your browser.
          </span>
          <span className="footerLinks">
            <button type="button" className="linkish" onClick={() => showFeedback()}>
              Send feedback
            </button>
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              Source on GitHub
            </a>
          </span>
        </div>
        {/* The matting weights are CC BY-NC-SA and every visitor downloads them, so the
            credit and licence belong on the site, not only in the README. */}
        <div className="footerCredits">
          Background removal:{" "}
          <a href="https://github.com/ZHKKKe/MODNet" target="_blank" rel="noreferrer">MODNet</a>{" "}
          by Zhanghan Ke et al., pretrained weights (converted to fp16) under{" "}
          <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer">
            CC BY-NC-SA 4.0
          </a>
          . Face and pose detection:{" "}
          <a href="https://ai.google.dev/edge/mediapipe/solutions/guide" target="_blank" rel="noreferrer">
            MediaPipe
          </a>{" "}
          (Apache-2.0). App code:{" "}
          <a href={`${REPO_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer">MIT</a>.
        </div>
        <div className="mrz mono" aria-hidden="true">
          {MRZ}
        </div>
      </footer>

      <FeedbackDialog />
    </div>
  );
}
