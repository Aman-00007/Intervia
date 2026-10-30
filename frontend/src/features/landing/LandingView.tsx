import { useState } from "react";
import { navigate } from "../../core/router";
import { setDesktopSimulationMode } from "../../core/desktop";

export function LandingView({
  theme,
  onThemeChange,
}: {
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
}) {
  const [activeCodeTab, setActiveCodeTab] = useState<"solution" | "tests">("solution");

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className={`landing-page ${theme}`}>
      {/* 1. Global Navigation Bar */}
      <header className="landing-topbar">
        <div className="landing-topbar-inner">
          <div className="landing-brand" onClick={() => navigate("/")}>
            <img src="/assets/block-mark.svg" alt="" className="brand-logo" />
            <span className="brand-name">Intervia</span>
          </div>

          <nav className="landing-nav-links">
            <button type="button" onClick={() => scrollToSection("platform")} className="nav-link-btn">
              PLATFORM
            </button>
            <button type="button" onClick={() => scrollToSection("reporting")} className="nav-link-btn">
              REPORTING
            </button>
            <button type="button" onClick={() => scrollToSection("desktop-app")} className="nav-link-btn highlight-desktop-nav">
              DESKTOP APP ⬇
            </button>
            <button type="button" onClick={() => scrollToSection("contact")} className="nav-link-btn">
              CONTACT
            </button>
          </nav>

          <div className="landing-nav-actions">
            <button
              type="button"
              className="sign-in-link candidate-link"
              onClick={() => navigate("/candidate/login")}
            >
              CANDIDATE SIGN IN
            </button>
            <button
              type="button"
              className="sign-in-link recruiter-link"
              onClick={() => navigate("/admin/login")}
            >
              RECRUITER SIGN IN
            </button>
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={() => onThemeChange(theme === "light" ? "dark" : "light")}
              aria-label="Toggle theme"
            >
              {theme === "light" ? "☼" : "☾"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container constrained to 1440px and centered */}
      <main className="landing-main-container">
        {/* =========================================================================
            Hero Section (Figma Fig. 01)
            ========================================================================= */}
        <section className="landing-hero-section">
          {/* Left Column: Headline & Action Cards */}
          <div className="hero-left-col">
            <div className="hero-eyebrow-row">
              <span className="eyebrow-tag">INTERVIEW INFRASTRUCTURE</span>
              <span className="eyebrow-tag">SECURE BY DESIGN</span>
            </div>

            <h1 className="hero-main-title">
              Secure,
              <br />
              Autonomous
              <br />
              AI
              <br />
              <span className="hero-teal-gradient">Technical</span>
              <br />
              <span className="hero-teal-gradient">Interviews.</span>
            </h1>

            <p className="hero-description">
              A controlled environment for evaluating technical talent—with protected execution, resilient sessions, and intelligence you can audit.
            </p>

            <div className="hero-action-cards">
              <div
                className="hero-role-card candidate-card"
                onClick={() => navigate("/join")}
                role="button"
                tabIndex={0}
              >
                <div className="card-role-meta">
                  <span className="role-tag candidate-tag">C-01</span>
                  <div className="card-text-group">
                    <span className="role-title">Candidate</span>
                    <span className="role-desc">Enter a scheduled interview</span>
                  </div>
                </div>
                <span className="card-arrow">→</span>
              </div>

              <div
                className="hero-role-card recruiter-card"
                onClick={() => navigate("/admin/login")}
                role="button"
                tabIndex={0}
              >
                <div className="card-role-meta">
                  <span className="role-tag recruiter-tag">R-02</span>
                  <div className="card-text-group">
                    <span className="role-title">Recruiter</span>
                    <span className="role-desc">Create, manage and review interviews</span>
                  </div>
                </div>
                <span className="card-arrow">→</span>
              </div>

              {/* Desktop App Proctored Client Banner */}
              <div
                className="hero-desktop-client-banner"
                onClick={() => scrollToSection("desktop-app")}
                role="button"
                tabIndex={0}
              >
                <div className="banner-left">
                  <span className="banner-icon">💻</span>
                  <div className="banner-copy">
                    <span className="banner-badge">PROCTORED DESKTOP APP</span>
                    <span className="banner-title">Taking a scheduled candidate interview?</span>
                    <span className="banner-sub">
                      Download the Intervia Desktop App for an isolated, tamper-proof environment (Unhire-grade) →
                    </span>
                  </div>
                </div>
                <span className="banner-arrow">↓</span>
              </div>
            </div>
          </div>

          {/* Right Column: FIG. 01 Active Session Mockup */}
          <div className="hero-right-col">
            <div className="figure-label">ACTIVE SESSION</div>

            <div className="session-mockup-card">
              {/* Top Bar of Session */}
              <div className="mockup-header-bar">
                <div className="live-status-indicator">
                  <span className="pulse-dot"></span>
                  <span className="status-text">LIVE SESSION</span>
                </div>
                <div className="session-id-text">INT-0842 / BACKEND SYSTEMS</div>
                <div className="encryption-badge">
                  <span className="lock-icon">🔒</span> E2E ENCRYPTED
                </div>
              </div>

              {/* Mockup Split Editor & AI Signal */}
              <div className="mockup-body-grid">
                {/* Editor Left Side */}
                <div className="mockup-editor-area">
                  <div className="editor-tab-strip">
                    <button
                      type="button"
                      className={`editor-tab ${activeCodeTab === "solution" ? "active" : ""}`}
                      onClick={() => setActiveCodeTab("solution")}
                    >
                      &lt;/&gt; solution.ts
                    </button>
                    <button
                      type="button"
                      className={`editor-tab ${activeCodeTab === "tests" ? "active" : ""}`}
                      onClick={() => setActiveCodeTab("tests")}
                    >
                      tests.ts
                    </button>
                    <span className="editor-role-pill">Candidate</span>
                  </div>

                  <div className="editor-code-lines">
                    <div className="code-line">
                      <span className="line-num">18</span>
                      <span className="line-code">
                        <span className="token-keyword">async function</span> <span className="token-function">processQueue</span>(tasks) &#123;
                      </span>
                    </div>
                    <div className="code-line">
                      <span className="line-num">19</span>
                      <span className="line-code">&nbsp;&nbsp;<span className="token-keyword">const</span> results = [];</span>
                    </div>
                    <div className="code-line">
                      <span className="line-num">20</span>
                      <span className="line-code">&nbsp;&nbsp;<span className="token-keyword">for</span> (<span className="token-keyword">const</span> task <span className="token-keyword">of</span> tasks) &#123;</span>
                    </div>
                    <div className="code-line highlighted-execution-line">
                      <span className="line-num">21</span>
                      <span className="line-code">&nbsp;&nbsp;&nbsp;&nbsp;results.push(<span className="token-keyword">await</span> <span className="token-function">execute</span>(task));</span>
                    </div>
                    <div className="code-line">
                      <span className="line-num">22</span>
                      <span className="line-code">&nbsp;&nbsp;&#125;</span>
                    </div>
                    <div className="code-line">
                      <span className="line-num">23</span>
                      <span className="line-code">&nbsp;&nbsp;<span className="token-keyword">return</span> results;</span>
                    </div>
                    <div className="code-line">
                      <span className="line-num">24</span>
                      <span className="line-code">&#125;</span>
                    </div>
                  </div>

                  <div className="editor-status-bar">
                    <span className="tests-passed-stat">✓ 12/12 tests</span>
                    <span className="runtime-stat">runtime 184ms</span>
                    <span className="memory-stat">memory 42MB</span>
                  </div>
                </div>

                {/* AI Signal Right Side */}
                <div className="mockup-ai-signal-area">
                  <div className="ai-signal-header">
                    <span className="signal-lbl">AI SIGNAL</span>
                    <span className="signal-analyzing">ANALYZING</span>
                  </div>

                  {/* Waveform Equalizer */}
                  <div className="waveform-visualizer">
                    <span className="wave-bar bar-1"></span>
                    <span className="wave-bar bar-2"></span>
                    <span className="wave-bar bar-3"></span>
                    <span className="wave-bar bar-4"></span>
                    <span className="wave-bar bar-5"></span>
                    <span className="wave-bar bar-6"></span>
                    <span className="wave-bar bar-7"></span>
                    <span className="wave-bar bar-8"></span>
                    <span className="wave-bar bar-9"></span>
                  </div>

                  {/* AI Metrics */}
                  <div className="ai-metrics-list">
                    <div className="ai-metric-row">
                      <span className="metric-k">Reasoning</span>
                      <span className="metric-v teal">Strong</span>
                    </div>
                    <div className="ai-metric-row">
                      <span className="metric-k">Complexity</span>
                      <span className="metric-v teal">O(n)</span>
                    </div>
                    <div className="ai-metric-row">
                      <span className="metric-k">Integrity</span>
                      <span className="metric-v teal">Verified</span>
                    </div>
                  </div>

                  {/* AI Copilot Note Box */}
                  <div className="ai-copilot-observation-card">
                    <span className="obs-timestamp">01:42</span>
                    <p className="obs-text">
                      Candidate identified the concurrency bottleneck without prompting.
                    </p>
                  </div>
                </div>
              </div>

              {/* Timeline Scrubber Bar */}
              <div className="mockup-timeline-footer">
                <span className="time-code">43:17</span>
                <div className="scrub-track">
                  <div className="scrub-fill" style={{ width: "95%" }}></div>
                  <div className="scrub-knob" style={{ left: "95%" }}></div>
                </div>
                <div className="time-bounds">
                  <span>00:00</span>
                  <span>45:00</span>
                </div>
              </div>
            </div>

            <div className="geo-coordinates">37.7749° N, 122.4194° W</div>
          </div>
        </section>

        {/* =========================================================================
            Section: Intervia Desktop App (Unhire-style Proctored Standalone Client)
            ========================================================================= */}
        <section id="desktop-app" className="landing-feature-section section-desktop-app">
          <div className="feature-section-header">
            <span className="large-step-num">APP</span>
            <span className="step-tag-lbl">PROCTORED INTERVIEW CLIENT</span>
          </div>

          <div className="feature-grid-2col">
            <div className="feature-text-side">
              <span className="feature-sub-tag">STANDALONE DESKTOP RUNTIME / UNHIRE-GRADE</span>
              <h2 className="feature-headline">
                The Intervia Desktop App.
                <br />
                Direct code entry. Zero distractions.
              </h2>
              <p className="feature-body-copy">
                Designed specifically for candidates taking scheduled technical interviews. The desktop application boots directly into your interview invitation code—bypassing the website, locking background apps, and protecting session integrity.
              </p>

              <div className="desktop-features-pills">
                <div className="desktop-pill-item">
                  <span className="pill-dot teal"></span>
                  <span><strong>Direct Code Launch:</strong> Opens immediately to invitation verification; no landing page or web navigation.</span>
                </div>
                <div className="desktop-pill-item">
                  <span className="pill-dot teal"></span>
                  <span><strong>Isolated Environment:</strong> Disables background extensions, secondary monitor leakage, and clipboard contamination.</span>
                </div>
                <div className="desktop-pill-item">
                  <span className="pill-dot teal"></span>
                  <span><strong>Resilient Local Buffer:</strong> Captures keystrokes and session audio locally if network connection fluctuates.</span>
                </div>
              </div>
            </div>

            <div className="feature-visual-side">
              <div className="desktop-download-card">
                <div className="download-card-header">
                  <div className="app-brand-badge">
                    <img src="/assets/block-mark.svg" alt="" className="app-icon" />
                    <div className="app-version-info">
                      <span className="app-name">Intervia Desktop Client</span>
                      <span className="app-ver">Version 1.4.2 · Secure Proctored Edition</span>
                    </div>
                  </div>
                  <span className="platform-tag">64-BIT SECURE</span>
                </div>

                <div className="download-buttons-grid">
                  <button
                    type="button"
                    className="os-download-btn primary-os"
                    onClick={() => alert("Intervia Desktop App (Windows 10/11 .exe installer) download initiated.")}
                  >
                    <span className="os-icon">⊞</span>
                    <div className="os-details">
                      <span className="os-name">Download for Windows</span>
                      <span className="os-file">Windows 10 / 11 (.exe) · 78 MB</span>
                    </div>
                    <span className="dl-icon">⬇</span>
                  </button>

                  <button
                    type="button"
                    className="os-download-btn"
                    onClick={() => alert("Intervia Desktop App (macOS Universal .dmg) download initiated.")}
                  >
                    <span className="os-icon"></span>
                    <div className="os-details">
                      <span className="os-name">Download for macOS</span>
                      <span className="os-file">Apple Silicon & Intel (.dmg) · 84 MB</span>
                    </div>
                    <span className="dl-icon">⬇</span>
                  </button>

                  <button
                    type="button"
                    className="os-download-btn"
                    onClick={() => alert("Intervia Desktop App (Linux AppImage / .deb) download initiated.")}
                  >
                    <span className="os-icon">🐧</span>
                    <div className="os-details">
                      <span className="os-name">Download for Linux</span>
                      <span className="os-file">AppImage / .deb · 74 MB</span>
                    </div>
                    <span className="dl-icon">⬇</span>
                  </button>
                </div>

                {/* Direct Simulator for Desktop App Mode */}
                <div className="desktop-sim-box">
                  <div className="sim-text-group">
                    <span className="sim-title">Test Desktop Client View</span>
                    <span className="sim-sub">
                      Experience how the desktop app launches directly into code verification without website menus.
                    </span>
                  </div>
                  <button
                    type="button"
                    className="sim-launch-btn"
                    onClick={() => {
                      setDesktopSimulationMode(true);
                      navigate("/join");
                    }}
                  >
                    Simulate Desktop Mode →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            Section 01: Protected Execution (Figma Image 2)
            ========================================================================= */}
        <section id="platform" className="landing-feature-section section-01">
          <div className="feature-section-header">
            <span className="large-step-num">01</span>
            <span className="step-tag-lbl">PROTECTED EXECUTION</span>
          </div>

          <div className="feature-grid-2col">
            <div className="feature-text-side">
              <span className="feature-sub-tag">SECURITY / INTEGRITY</span>
              <h2 className="feature-headline">Every action leaves a verifiable trace.</h2>
              <p className="feature-body-copy">
                Intervia isolates code execution, monitors session integrity, and creates a tamper-evident event record—without turning the interview into surveillance theatre.
              </p>
            </div>

            <div className="feature-visual-side">
              <div className="security-architecture-diagram">
                {/* Central Isolated Runtime Lock */}
                <div className="diagram-center-lock">
                  <div className="lock-graphic">
                    <span className="lock-shackle"></span>
                    <span className="lock-body">ISOLATED RUNTIME</span>
                  </div>

                  {/* Radiating Connectors */}
                  <div className="diagram-node node-top">
                    <span className="node-dot"></span>
                    <span className="node-lbl">IDE input</span>
                    <span className="node-status-pill">VERIFIED</span>
                  </div>
                  <div className="diagram-node node-right">
                    <span className="node-dot"></span>
                    <span className="node-lbl">Runtime output</span>
                    <span className="node-status-pill">SIGNED</span>
                  </div>
                  <div className="diagram-node node-bottom">
                    <span className="node-dot"></span>
                    <span className="node-lbl">Session record</span>
                    <span className="node-status-pill">SEALED</span>
                  </div>
                </div>

                {/* Audit Ledger List on Right */}
                <div className="audit-ledger-card">
                  <div className="audit-row">
                    <span className="audit-time">00:02:10</span>
                    <span className="audit-event">Environment initialized</span>
                    <span className="audit-hash">0xA1DF</span>
                  </div>
                  <div className="audit-row">
                    <span className="audit-time">00:15:44</span>
                    <span className="audit-event">Identity handshake verified</span>
                    <span className="audit-hash">0xC107</span>
                  </div>
                  <div className="audit-row">
                    <span className="audit-time">00:24:32</span>
                    <span className="audit-event">Code event signed</span>
                    <span className="audit-hash">0xF644</span>
                  </div>
                  <div className="audit-row">
                    <span className="audit-time">00:44:18</span>
                    <span className="audit-event">Artifact hash committed</span>
                    <span className="audit-hash">0x8857</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            Section 02: Resilient By Default (Figma Image 3)
            ========================================================================= */}
        <section className="landing-feature-section section-02">
          <div className="feature-section-header">
            <span className="large-step-num">02</span>
            <span className="step-tag-lbl">RESILIENT BY DEFAULT</span>
          </div>

          <div className="feature-grid-2col reverse-on-mobile">
            <div className="feature-text-side">
              <span className="feature-sub-tag">BLACK BOX / OFFLINE MODE</span>
              <h2 className="feature-headline">
                The interview continues.
                <br />
                Even when the network doesn't.
              </h2>
            </div>
            <div className="feature-text-side description-only">
              <p className="feature-body-copy">
                A local encrypted record preserves every event during a connection loss, then synchronizes safely once connectivity returns.
              </p>
            </div>
          </div>

          {/* Timeline Black Box Strip */}
          <div className="resilient-timeline-card">
            <div className="timeline-time-labels">
              <span>10:14</span>
              <span>10:16</span>
              <span>10:18</span>
              <span>10:20</span>
              <span>10:22</span>
            </div>

            <div className="timeline-visual-track">
              <div className="track-segment connected-seg">
                <span className="track-node"></span>
              </div>
              <div className="track-segment disconnected-box">
                <span className="black-box-label">LOCAL BLACK BOX RECORDING</span>
                <span className="track-node pulse-purple"></span>
              </div>
              <div className="track-segment reconnect-seg">
                <span className="track-node"></span>
              </div>
            </div>

            <div className="timeline-status-row">
              <div className="status-col">
                <span className="status-title">CONNECTED</span>
                <span className="status-desc">Secure session active</span>
              </div>
              <div className="status-col text-center">
                <span className="status-title purple">NETWORK LOST</span>
                <span className="status-desc">Session continues locally</span>
              </div>
              <div className="status-col text-right">
                <span className="status-title teal">SYNCHRONIZED</span>
                <span className="status-desc">18 events verified</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            Section 03: Coordinated Intelligence (Figma Image 4)
            ========================================================================= */}
        <section className="landing-feature-section section-03">
          <div className="feature-section-header">
            <span className="large-step-num">03</span>
            <span className="step-tag-lbl">COORDINATED INTELLIGENCE</span>
          </div>

          <div className="feature-grid-2col">
            <div className="feature-text-side">
              <span className="feature-sub-tag">INTERVIEWER COPILOT</span>
              <h2 className="feature-headline">Intelligence that supports your judgment.</h2>
              <p className="feature-body-copy">
                Equip interviewers with precise, contextual assistance in real time.
              </p>
            </div>

            <div className="feature-visual-side">
              <div className="copilot-cards-triad">
                <div className="copilot-card card-1">
                  <span className="card-number-tag">#1</span>
                  <h4 className="card-heading">Adaptive prompt</h4>
                  <span className="card-caption">Calibrated to role</span>
                </div>

                <div className="copilot-card card-2 center-engine-card">
                  <div className="engine-pulse-wave">
                    <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
                      <path d="M0 12H10L14 3L20 21L26 9L30 15H40" stroke="#17C3B2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h4 className="card-heading">Intervia engine</h4>
                  <span className="card-caption">Evidence orchestration</span>
                </div>

                <div className="copilot-card card-3">
                  <span className="card-number-tag">#3</span>
                  <h4 className="card-heading">Structured signal</h4>
                  <span className="card-caption">Auditable assessment</span>
                </div>
              </div>

              <div className="copilot-legend-row">
                <span className="legend-item"><span className="legend-dot teal"></span> LIVE EVIDENCE</span>
                <span className="legend-item"><span className="legend-dot purple"></span> INTERVIEWER COPILOT</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            Section 04: Dual-Sided Reporting (Figma Image 5)
            ========================================================================= */}
        <section id="reporting" className="landing-feature-section section-04">
          <div className="feature-section-header">
            <span className="large-step-num">04</span>
            <span className="step-tag-lbl">DUAL-SIDED REPORTING</span>
          </div>

          <div className="feature-grid-2col reverse-on-mobile">
            <div className="feature-text-side">
              <span className="feature-sub-tag">ONE INTERVIEW / TWO PERSPECTIVES</span>
              <h2 className="feature-headline">Useful signal for everyone.</h2>
            </div>
            <div className="feature-text-side description-only">
              <p className="feature-body-copy">
                Decisions for hiring teams. Meaningful feedback for candidates. Generated from the same verified evidence.
              </p>
            </div>
          </div>

          {/* 2 Perspective Cards */}
          <div className="dual-reporting-cards-grid">
            {/* Candidate Perspective */}
            <div className="perspective-card candidate-perspective">
              <span className="perspective-badge candidate-badge">CANDIDATE REPORT</span>
              <h3 className="perspective-title">Performance summary</h3>

              <div className="score-metric-box">
                <div className="score-num-wrap">
                  <span className="score-value">84</span>
                  <span className="score-max">/100</span>
                </div>
                <div className="score-bar-track">
                  <div className="score-bar-fill" style={{ width: "84%" }}></div>
                </div>
              </div>

              <p className="perspective-text">
                Strong systems reasoning and communication. Consider more explicit edge-case testing.
              </p>
            </div>

            {/* Recruiter Perspective */}
            <div className="perspective-card recruiter-perspective">
              <span className="perspective-badge recruiter-badge">RECRUITER REPORT</span>
              <h3 className="perspective-title">Hiring evidence</h3>

              <div className="evidence-rows-list">
                <div className="evidence-metric-row">
                  <span className="metric-title">Problem solving</span>
                  <span className="metric-status-badge exceeds">EXCEEDS</span>
                </div>
                <div className="evidence-metric-row">
                  <span className="metric-title">Code quality</span>
                  <span className="metric-status-badge strong">STRONG</span>
                </div>
                <div className="evidence-metric-row">
                  <span className="metric-title">Role calibration</span>
                  <span className="metric-value-text">87%</span>
                </div>
              </div>

              <div className="recommendation-pill">
                <span className="check-icon">✓</span> Advance to final stage
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            Section 05: Call to Action (CTA) & Infrastructure Banner
            ========================================================================= */}
        <section id="contact" className="landing-cta-section">
          <div className="cta-inner-card">
            <span className="cta-eyebrow">INFRASTRUCTURE / READY FOR DEPLOYMENT</span>
            <h2 className="cta-headline">Interview infrastructure built for engineering excellence.</h2>
            <p className="cta-subtext">
              Deploy private, tamper-evident technical interviews across your engineering organization.
            </p>

            <div className="cta-actions-row">
              <button
                type="button"
                className="cta-primary-btn"
                onClick={() => navigate("/join")}
              >
                Enter Scheduled Interview →
              </button>
              <button
                type="button"
                className="cta-secondary-btn download-cta-btn"
                onClick={() => scrollToSection("desktop-app")}
              >
                Download Desktop App (v1.4) ↓
              </button>
              <button
                type="button"
                className="cta-secondary-btn"
                onClick={() => navigate("/admin/login")}
              >
                Recruiter Admin Sign In →
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* 6. Landing Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="footer-brand-side">
            <div className="footer-brand">
              <img src="/assets/block-mark.svg" alt="" className="brand-logo" />
              <span>Intervia</span>
            </div>
            <p className="footer-tagline">
              Privacy-first, AI-assisted technical interviews.
            </p>
          </div>

          <div className="footer-links-group">
            <a href="#platform" onClick={(e) => { e.preventDefault(); scrollToSection("platform"); }}>Platform</a>
            <a href="#desktop-app" onClick={(e) => { e.preventDefault(); scrollToSection("desktop-app"); }}>Download Desktop App</a>
            <a href="#reporting" onClick={(e) => { e.preventDefault(); scrollToSection("reporting"); }}>Reporting</a>
            <a href="/candidate/login" onClick={(e) => { e.preventDefault(); navigate("/candidate/login"); }}>Candidate Login</a>
            <a href="/admin/login" onClick={(e) => { e.preventDefault(); navigate("/admin/login"); }}>Recruiter Login</a>
            <a href="/join" onClick={(e) => { e.preventDefault(); navigate("/join"); }}>Security Code Access</a>
          </div>

          <div className="footer-legal-row">
            <span>ZERO-PII EVALUATION ENGINE · CRYPTOGRAPHICALLY SECURED</span>
            <span>© 2026 Intervia. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
