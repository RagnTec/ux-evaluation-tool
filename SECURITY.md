# Security Policy

## Supported Versions

We currently support the following version with security updates and vulnerability triage:

| Version | Supported |
| :--- | :--- |
| `v0.1 Open Source Preview` | :white_check_mark: |

---

## Reporting a Vulnerability

We take the security of this project seriously. If you discover a security vulnerability, please report it responsibly:

### Recommended Channel
* **GitHub Private Vulnerability Reporting**: If private vulnerability reporting is enabled for this repository, please use the "Report a vulnerability" workflow under the **Security** tab of the GitHub repository. This initiates a confidential advisory draft visible only to repository maintainers.

### Reporting Guidelines
* Please include detailed steps to reproduce the issue, including environment details, sample payloads, or screen captures if applicable.
* Allow reasonable time for the maintainers to review, investigate, and mitigate the issue before disclosing it publicly.
* Sensitive security vulnerabilities should not be reported in public GitHub issues.

---

## Architecture & Privacy Notice

* **Client-Side Execution**: The current `v0.1` preview is a browser-based client application. It executes locally in the user's browser and does not implement a backend image processing or upload service.
* **Local First**: Uploaded design mockups and entered parameters remain within the local browser runtime session.
