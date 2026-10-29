import { FormEvent, useState } from "react";
import { Screen } from "../../core/models/screens";
import { navigate } from "../../core/router";
import { Field, Button } from "../../shared/components/UI";

export function AuthView({ screen }: { screen: Screen }) {
  const register = screen.includes("registration");
  const admin = screen.startsWith("admin");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("Authentication endpoints are not implemented in the current backend.");
  };

  const storyTitle = admin ? (
    <>
      Build your<br />strongest<br /><em>technical teams.</em>
    </>
  ) : (
    <>
      Less noise.<br />More room<br /><em>to think.</em>
    </>
  );

  const formTitle = admin
    ? register
      ? "Create your hiring workspace."
      : "Welcome back."
    : register
      ? "Keep your conversations together."
      : "Your next conversation.";

  return (
    <div className={`auth-page ${admin ? "admin-auth" : "candidate-auth"} ${register ? "registration-auth" : ""}`}>
      {/* Left Column: Brand Story & Infrastructure */}
      <section className="auth-story">
        <small>{admin ? "RECRUITER SYSTEM / ADMIN ACCESS" : "CANDIDATE SYSTEM / YOUR SKILLS IN VIEW"}</small>
        <h1>{storyTitle}</h1>
        <p>
          {admin
            ? "A focused environment to coordinate interviews, review technical evidence and bring human judgment to every decision."
            : "One shared task. A resilient workspace. Constructive feedback you can use after the conversation ends."}
        </p>

        <div className="vault-card">
          <small>INTERVIEW INFRASTRUCTURE / HUMAN-LED</small>
          <div className="vault-grid">
            <div>
              <small>RESTRICTED IDENTITY</small>
              <b>identity_vault</b>
              <span>Encrypted origins. Separate access.</span>
              <small>PRESIDIO TOKENIZATION ↓</small>
            </div>
            <div>
              <small>TOKENIZED EVIDENCE</small>
              <b>interview_ops</b>
              <span>Technical skills. Code. Useful feedback.</span>
              <small className="teal-text">[NAME_1] / C-7K2</small>
            </div>
          </div>
        </div>

        <small className="story-footnote">
          {admin ? "IDENTITY IS ZERO-PII FOR ALL USER ACCESS" : "CONSENT BEFORE INTERVIEW CAPTURE"}
        </small>
      </section>

      {/* Right Column: Authentication Form */}
      <section className="auth-form">
        <small>{register ? "REGISTER" : "ACCESS"} / {admin ? "ADMIN & INTERVIEWER" : "CANDIDATE"}</small>
        <h2>{formTitle}</h2>
        <p>
          {register
            ? admin
              ? "Create your account to schedule human-led technical interviews."
              : "Create an account to keep your invitations and reports together."
            : admin
              ? "Sign in to your interview-management overview. This access is for authorized hiring teams."
              : "Sign in to view your invitations and revisit your interview reports."}
        </p>

        <form onSubmit={submit}>
          {register && (
            <>
              <Field label="FULL NAME" placeholder="Enter your name" />
              {admin && <Field label="ORGANIZATION" placeholder="Company or team name" />}
            </>
          )}

          <Field
            label={admin ? "WORK EMAIL" : "EMAIL ADDRESS"}
            placeholder={admin ? "you@company.com" : "Enter your email"}
            type="email"
          />

          <label className="field password-field">
            <small>PASSWORD</small>
            <input
              type={showPassword ? "text" : "password"}
              placeholder={register ? "Create a password" : "Enter your password"}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? "HIDE" : "SHOW"}
            </button>
          </label>

          {register && (
            <label className="field password-field">
              <small>CONFIRM PASSWORD</small>
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter your password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword((value) => !value)}
              >
                {showConfirmPassword ? "HIDE" : "SHOW"}
              </button>
            </label>
          )}

          {admin && !register && (
            <div className="auth-options admin-options">
              <label>
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(event) => setRememberDevice(event.target.checked)}
                />
                {" "}Remember this device
              </label>
              <button type="button" className="text-button">
                Forgot password?
              </button>
            </div>
          )}

          {!admin && !register && (
            <div className="auth-options candidate-options">
              <span />
              <button type="button" className="text-button">
                Forgot password?
              </button>
            </div>
          )}

          {register && (
            <label className="terms-check">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(event) => setTermsAccepted(event.target.checked)}
              />
              <span>
                I agree to the{" "}
                <button type="button" className="inline-link">
                  Terms of Service
                </button>{" "}
                and{" "}
                <button type="button" className="inline-link">
                  Privacy Policy
                </button>.
              </span>
            </label>
          )}

          <Button type="submit">
            {register
              ? "Create account"
              : admin
                ? "Sign in to interviews"
                : "Sign in"}{" "}
            →
          </Button>

          {error && <div className="error">{error}</div>}
        </form>

        {register && (
          <p className="password-note">
            Use at least 12 characters, including a number and a symbol.
          </p>
        )}

        {admin && !register && (
          <p className="permission-note">
            Your permissions determine which interviews and private reports you can access.
          </p>
        )}

        {!admin && !register && (
          <p className="permission-note candidate-permission">
            Identity details stay separate from interview evidence. Review consent before any recording starts.
          </p>
        )}

        <button
          className="text-button auth-switch"
          type="button"
          onClick={() =>
            navigate(
              register
                ? admin
                  ? "/admin/login"
                  : "/candidate/login"
                : admin
                  ? "/admin/register"
                  : "/candidate/register"
            )
          }
        >
          {register ? "Already have an account? Sign in →" : "Don't have an account? Register →"}
        </button>

        {register && (
          <p className="auth-switch-note">
            Protected identity stays separate from interview evidence.
          </p>
        )}

        {admin && !register && (
          <p className="auth-switch-note">
            Create an admin / interviewer account for your organization.
          </p>
        )}

        {!admin && !register && (
          <p className="auth-switch-note">
            Create a candidate account to keep your invitations and reports together.
          </p>
        )}

        {!admin && !register && (
          <div className="interview-code-card">
            <h3>Have an interview code?</h3>
            <p>
              Your invitation may allow code-only access. You do not need an account to use that invitation.
            </p>
            <button
              type="button"
              className="text-button"
              onClick={() => navigate("/join")}
            >
              Join with security code →
            </button>
          </div>
        )}

        {!register && admin && (
          <button
            type="button"
            className="text-button candidate-link"
            onClick={() => navigate("/candidate/login")}
          >
            Here for an interview? Candidate access →
          </button>
        )}

        {!admin && register && (
          <button
            type="button"
            className="text-button candidate-link"
            onClick={() => navigate("/join")}
          >
            Invited to an interview? Join with a security code →
          </button>
        )}
      </section>
    </div>
  );
}
