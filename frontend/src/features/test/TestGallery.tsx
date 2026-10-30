import { navigate } from "../../core/router";
import { Page, Panel } from "../../shared/components/UI";

const groups: Array<[string, string[]]> = [
  [
    "Landing and Overview",
    ["/", "/landing"],
  ],
  [
    "Authentication",
    [
      "/admin/login",
      "/candidate/login",
      "/admin/register",
      "/candidate/register",
    ],
  ],
  [
    "Invitation and onboarding",
    ["/join", "/candidate/consent", "/candidate/resume", "/candidate/lobby"],
  ],
  [
    "Interviewer",
    [
      "/interviewer",
      "/interviewer/create",
      "/interviewer/manage",
      "/interviewer/workspace",
      "/interviewer/reports",
      "/interviewer/reports/executive",
    ],
  ],
  [
    "Candidate",
    [
      "/candidate",
      "/candidate/workspace",
      "/candidate/workspace/shared",
      "/candidate/recovery",
      "/candidate/reports",
      "/candidate/reports/detail",
    ],
  ],
];

export function TestGallery() {
  return (
    <Page eyebrow="INTERVIA / UI TEST ROUTES" title="Frontend screen gallery.">
      <p className="page-intro">
        Open each route to review the Figma-derived Light/Dark layout and verify
        navigation behavior.
      </p>
      <div className="gallery-grid">
        {groups.map(([name, paths]) => (
          <Panel key={name}>
            <h2>{name}</h2>
            <div className="gallery-links">
              {paths.map((path) => (
                <button
                  className="text-button"
                  key={path}
                  onClick={() => navigate(path)}
                >
                  {path}
                </button>
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </Page>
  );
}
