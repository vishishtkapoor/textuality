# Textuality ✍️

A Medium-style blogging platform. Sign up, write articles, publish them, and read what others have written — all running serverless on **AWS**.

> **Live app:** https://dhn5hiatd0jpf.cloudfront.net

---

## ✨ Features

- **User accounts** — sign up / sign in with JWT authentication
- **Skip login** — browse the public feed without an account
- **Write & publish** — a clean editor for your posts
- **Publish guard** — logged-out users get a friendly "log in first" prompt instead of the editor
- **Real publication dates** — every post shows when it was published
- **Reading time** — estimated minutes per article
- **Responsive design** — works on desktop and mobile

## 🏗️ Architecture

The app is fully hosted on AWS and split into three parts:

```
┌────────────────────┐        HTTPS + JSON        ┌───────────────────────────┐
│  Frontend          │  ───────────────────────►  │  Backend                  │
│  React + Vite      │   /api/v1/...              │  Hono on AWS Lambda       │
│  (S3 + CloudFront) │   JWT in Authorization     │  + API Gateway            │
└────────────────────┘   header                   └────────────┬──────────────┘
                                                               │
                                                    ┌──────────▼───────────────┐
                                                    │  PostgreSQL (AWS RDS,   │
                                                    │  via Prisma ORM)         │
                                                    └──────────────────────────┘
```

| Layer | Technology | Where it runs |
|---|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, React Router | S3 bucket + CloudFront CDN |
| **Backend API** | Hono (Node.js), Zod validation, JWT auth | AWS Lambda + API Gateway (HTTP API) |
| **Database** | PostgreSQL via Prisma ORM | AWS RDS (db.t4g.micro) |
| **Infrastructure** | Terraform | `infra/` directory |

The frontend never talks to the database — every request goes through the backend's REST API.

## 📁 Project structure

```
textuality/
├── frontend/                 # React + Vite + Tailwind app
│   └── src/
│       ├── components/       # Appbar, BlogCard, FullBlog, Auth, ...
│       ├── pages/            # Signup, Signin, Blogs (feed), Blog, Publish
│       └── hooks/            # useBlog / useBlogs data fetching
├── backend/                  # Hono API (runs on AWS Lambda)
│   ├── src/
│   │   ├── index.ts          # Hono app: /api/v1/user + /api/v1/blog routers
│   │   ├── lambda.ts         # Lambda entry point (hono/aws-lambda adapter)
│   │   └── route/            # User.ts (auth) + Blog.ts (CRUD)
│   └── prisma/               # Schema + migrations
└── infra/                    # Terraform stack + deploy scripts (see infra/README.md)
```

## 🚀 API overview

Base URL: `https://iko8kowogg.execute-api.ap-south-1.amazonaws.com`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/user/signup` | — | Create an account, returns a JWT |
| POST | `/api/v1/user/signin` | — | Log in, returns a JWT |
| GET | `/api/v1/blog/bulk` | public | List all posts with author names |
| GET | `/api/v1/blog/:id` | public | Fetch a single post |
| POST | `/api/v1/blog` | required | Publish a new post |
| PUT | `/api/v1/blog` | required | Update a post |

## 💻 Local development

```bash
# Backend (uses your AWS RDS database)
cd backend
npm install
npm run dev            # starts a local server on :8787

# Frontend
cd frontend
npm install
npm run dev            # starts Vite on :5173
```

Set `VITE_BACKEND_URL` when building if you want the frontend to point somewhere other than the deployed API.

## ☁️ Deployment (AWS)

Everything is provisioned with Terraform — one command creates the RDS database, Lambda backend, API Gateway, S3 bucket, and CloudFront distribution. See **[`infra/README.md`](infra/README.md)** for the full step-by-step guide.

Quick summary:

```bash
cd infra
./build-lambda.sh      # package the backend into lambda.zip
terraform init && terraform apply
DATABASE_URL="postgresql://postgres:<pw>@<rds-endpoint>:5432/medium" \
  npx prisma migrate deploy   # from ../backend
./deploy-frontend.sh   # build + upload the React app to S3/CloudFront
```

To tear everything down: `terraform destroy`.

## 🛠️ Tech highlights

- **React + Vite + Tailwind** — fast, typed, utility-first UI
- **Hono** — lightweight, framework-agnostic HTTP framework (runs identically on Workers, Lambda, or Node)
- **Prisma + PostgreSQL** — type-safe database access with migrations
- **Zod** — shared runtime validation with TypeScript inference
- **JWT** — stateless authentication
- **Terraform** — infrastructure as code; the whole AWS stack is reproducible

Happy writing! 🚀✨
