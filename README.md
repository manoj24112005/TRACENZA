# TRACENZA
### AI-Powered Application Validation, Document Authentication & Regulatory Compliance Verification

**Smart India Hackathon 2026 | Problem Statement: SIH26261**

[Live Demo](https://tracenza.vercel.app) · [Backend API](https://tracenza-api.onrender.com/docs) · [GitHub Repository](https://github.com/manoj24112005/TRACENZA)

---

## About the Project

TRACENZA is an application validation and regulatory compliance verification platform developed for Smart India Hackathon 2026 Problem Statement SIH26261.

The platform is designed to assist institutional authorities in reviewing applications, examining supporting documents, identifying potential inconsistencies, and organizing compliance-related findings through a centralized digital workflow.

TRACENZA aims to reduce repetitive manual verification work while providing a structured and explainable review process.

**Important:** TRACENZA is an independent academic prototype. It is not an official AICTE platform and is not endorsed by AICTE.

## Problem Statement

**SIH26261 – AI-Powered Application Validation, Document Authentication and Regulatory Compliance Verification**

The challenge focuses on improving the validation of institutional applications, authentication of supporting documents, and identification of regulatory compliance issues.

TRACENZA explores a technology-assisted approach to these processes while retaining human authority over final decisions.

## Key Features

- **Application Management:** Centralized application records and review workflows.
- **Document Processing:** Document upload and information extraction workflows.
- **Document Verification:** Checks for potential inconsistencies and document-related issues.
- **Compliance Validation:** Rule-based evaluation of application information.
- **Risk and Findings Dashboard:** Displays flagged applications, findings, and review information.
- **Workflow Management:** Organizes application status transitions and review activities.
- **Administrative Controls:** User management and administrative configuration.
- **Verification Simulation:** Demonstrates verification workflows using simulated external sources.

## System Architecture

```text
             USERS / INSTITUTIONS
                     |
                     v
              REACT FRONTEND
                     |
                  REST API
                     |
                     v
              FASTAPI BACKEND
                     |
          +----------+----------+
          |          |          |
          v          v          v
      Application  Document   Compliance
      Management   Processing Validation
          |          |          |
          +----------+----------+
                     |
                     v
                DATABASE
                PostgreSQL
                     |
                     v
             REVIEW DASHBOARD
```

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Backend | FastAPI |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Migrations | Alembic |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |
| Containerization | Docker |

## Application Workflow

1. An authorized user accesses the TRACENZA platform.
2. Application information and supporting documents are submitted.
3. The backend processes the submitted information.
4. Validation and compliance checks identify potential issues.
5. Findings are organized for review.
6. Authorized users examine the results and manage the application workflow.

## Live Deployment

| Service | Link |
|---|---|
| Frontend Application | https://tracenza.vercel.app |
| Backend Health | https://tracenza-api.onrender.com/health |
| API Documentation | https://tracenza-api.onrender.com/docs |
| Source Code | https://github.com/manoj24112005/TRACENZA |

## Running Locally

### Prerequisites

- Git
- Python
- Node.js and npm
- PostgreSQL

### Clone the Repository

```bash
git clone https://github.com/manoj24112005/TRACENZA.git
cd TRACENZA
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Backend Setup

Follow the backend dependency, database, and environment configuration provided in the backend project files.

Do not use production credentials or commit secret environment variables to GitHub.

## Prototype Limitations

TRACENZA is currently an academic prototype and demonstration platform.

- The authority connector currently uses an in-process mock implementation.
- Geographical data is simulated.
- The graph functionality currently uses an in-process implementation.
- File storage currently uses local-disk storage.
- Live integration with restricted AICTE or government databases is not established.
- Prototype verification results are not official regulatory decisions.

Actual institutional deployment would require authorized external integrations, secure persistent storage, appropriate access controls, and validation against official regulatory requirements.

## Future Enhancements

- Integration with authorized government and regulatory systems.
- Improved document authenticity and tampering detection.
- Expanded automated compliance validation.
- Secure and scalable document storage.
- Advanced analytics and reporting.
- Improved auditability and workflow automation.

## Team

**WE AREN'T ROBOTS**

Smart India Hackathon 2026

## Disclaimer

TRACENZA is an independent academic prototype developed for Smart India Hackathon 2026 under Problem Statement SIH26261.

It is not an official AICTE system, does not claim official AICTE endorsement, and does not provide legally binding regulatory verification or approval decisions.

All simulated authority responses and demonstration records are intended for educational and evaluation purposes.

---

<p align="center">

**TRACENZA — Bringing Structure, Transparency and Intelligence to Application Verification.**

</p>
