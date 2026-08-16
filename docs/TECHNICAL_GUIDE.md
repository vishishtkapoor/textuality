# Textuality — Complete Technical Guide (Interview Prep)

This document explains **everything** about the Textuality app — how it works, what every technology does, why it was chosen, and the fundamentals behind it. It's written so you can truly understand your own project and answer interview questions at any depth.

---

## Table of Contents

1. [The 30-second pitch](#1-the-30-second-pitch)
2. [The big picture](#2-the-big-picture)
3. [How a request travels end-to-end](#3-how-a-request-travels-end-to-end)
4. [Frontend fundamentals](#4-frontend-fundamentals)
5. [Backend fundamentals](#5-backend-fundamentals)
6. [Authentication with JWT](#6-authentication-with-jwt)
7. [Database: PostgreSQL + Prisma](#7-database-postgresql--prisma)
8. [AWS — every service explained](#8-aws--every-service-explained)
9. [Terraform — infrastructure as code](#9-terraform--infrastructure-as-code)
10. [How the app gets deployed](#10-how-the-app-gets-deployed)
11. [Interview Q&A](#11-interview-qa)
12. [Glossary of key terms](#12-glossary-of-key-terms)
13. [Known limitations & honest answers](#13-known-limitations--honest-answers)

---

## 1. The 30-second pitch

> "Textuality is a Medium-style blogging platform. Users sign up with email + password, get a JWT token, and use it to publish articles. Anyone can read the feed without logging in. The frontend is a React single-page app served from S3 + CloudFront. It talks over HTTPS/JSON to a REST API built with the Hono framework, running on AWS Lambda behind API Gateway. Data is stored in PostgreSQL on AWS RDS, accessed through the Prisma ORM. The entire AWS infrastructure is defined in Terraform, so the whole stack is reproducible with one command."

That's the whole project in 5 sentences. Now let's unpack every sentence.

---

## 2. The big picture

A web app has **three tiers**. Textuality has all three:

```
┌──────────────────────┐         ┌──────────────────────┐         ┌───────────────┐
│  1. Frontend (UI)    │  HTTPS  │  2. Backend (logic)  │   SQL   │  3. Database  │
│   React + Vite       │ ──────► │   Hono on Lambda     │ ──────► │   PostgreSQL  │
│   (S3 + CloudFront)  │  JSON   │   + API Gateway      │  Prisma │   (RDS)       │
└──────────────────────┘         └──────────────────────┘         └───────────────┘
```

**Why three tiers?** Separation of concerns:

- **Frontend** = what the user sees. It renders HTML/JS in the browser. It should NOT touch the database directly (that would leak credentials and let anyone modify data).
- **Backend** = the rules. It validates input, checks "is this user logged in?", talks to the DB, and returns data. It's the only thing allowed to touch the database.
- **Database** = the source of truth. Where users and posts live permanently.

The frontend never talks to PostgreSQL directly. Every piece of data comes through the backend's REST API.

### What is "the backend"? (fundamental)

A **server** is just a computer that's always on, listening for network requests. The backend is the code running on that server. When the frontend does `axios.post(...)`, it sends an HTTP request over the internet to the backend's URL. The backend code receives it, does work, and sends back an HTTP response.

In Textuality, the "server" isn't a physical machine you rent — it's **AWS Lambda**, a *serverless* function. More on that in [Section 8](#8-aws--every-service-explained).

---

## 3. How a request travels end-to-end

Let's trace two real flows through the entire stack. This is the single most important thing to understand.

### Flow A: User signs up

1. **User** types name, email, password into the form on `localhost:5173` (or the CloudFront URL) and clicks "Create account".
2. **React** (in the browser) reads the form inputs into a `postInputs` state object, then calls:
   ```ts
   axios.post(`${BACKEND_URL}/api/v1/user/signup`, postInputs)
   ```
3. `BACKEND_URL` = `https://iko8kowogg.execute-api.ap-south-1.amazonaws.com`. So the browser makes an **HTTPS POST request** to:
   ```
   POST https://iko8kowogg.execute-api.ap-south-1.amazonaws.com/api/v1/user/signup
   Content-Type: application/json
   Body: {"name":"Vishisht","username":"vishishtkapoor2@gmail.com","password":"..."}
   ```
4. The request travels over the internet to **AWS**. **API Gateway** (a managed entry point) receives it and forwards it to the **Lambda function** that runs your Hono app.
5. **Hono** matches the path `/api/v1/user/signup` to the signup handler in `User.ts`.
6. The handler:
   - Reads the JSON body: `const body = await c.req.json();`
   - **Validates** it with Zod (`signupInput.safeParse(body)`). If invalid → returns **411** "Inputs not correct".
   - Creates a **PrismaClient** (a DB connection) using `DATABASE_URL` from the environment.
   - Runs `prisma.user.create({...})` → Prisma generates SQL → sends it to **RDS PostgreSQL** → a row is inserted.
   - Creates a **JWT** signing `{ id: user.id }` with `JWT_SECRET` using HMAC-SHA256.
   - Returns the JWT as the response body.
7. The response (the JWT string) travels back through API Gateway to the browser.
8. React stores it: `localStorage.setItem("token", jwt)` and navigates to `/allblogs`.

**Result:** a row in the `User` table + a token in the browser's localStorage that proves "I am user #5".

### Flow B: User reads the feed (without logging in)

1. React mounts the `Blogs` page. Its `useBlogs()` hook fires:
   ```ts
   axios.get(`${BACKEND_URL}/api/v1/blog/bulk`)
   ```
2. Same path as above: browser → API Gateway → Lambda → Hono's `blogRouter`.
3. Hono's **middleware** runs first: `blogRouter.use("/*", ...)`. It checks `if (c.req.method === "GET")` → since this is a GET, it calls `next()` immediately. **Reading is public.**
4. The `GET /bulk` handler runs `prisma.blog.findMany({ select: { ..., author: { select: { name: true } } } })` → Prisma generates a SQL query with a **JOIN** between `Blog` and `User` tables → returns every blog with its author's name.
5. Hono wraps it: `c.json({ blogs })` → serializes to JSON → response travels back.
6. React receives `{ blogs: [...] }`, stores it in state, and maps over it to render `<BlogCard>` components.

### Flow C: User publishes (must be logged in)

1. Clicking "Write" → React checks `localStorage.getItem("token")`. If null → shows "Please log in first". (Frontend guard.)
2. If a token exists, the editor shows. On "Publish post":
   ```ts
   axios.post(`${BACKEND_URL}/api/v1/blog`, { title, content: description }, {
     headers: { Authorization: localStorage.getItem("token") }
   })
   ```
3. Backend middleware runs. Method is POST (not GET), so it **verifies the JWT**:
   ```ts
   const user = await verify(authHeader, getEnv(c, "JWT_SECRET"));
   c.set("userId", user.id);
   ```
   If verification fails → **403** "You are not logged in".
4. Handler validates with Zod, then `prisma.blog.create({ data: { title, content, authorId: Number(authorId) } })` — the `authorId` came from the **verified JWT**, not from the request body. This is important: the client can't fake who they are because only the server can sign tokens.
5. Returns `{ id: blog.id }` → React navigates to `/blog/<id>`.

**Key insight for interviews:** the frontend guard (Step 1) is just UX. The **real** security is the backend middleware (Step 3). Never trust the frontend.

---

## 4. Frontend fundamentals

### What is React?

React is a JavaScript **library for building user interfaces**. Its core idea: **describe what the UI should look like for a given state, and React figures out how to update the DOM**.

- **Components** — reusable pieces of UI. Textuality has `Appbar`, `BlogCard`, `FullBlog`, `Auth`, `Quote`, etc. A component is just a function that returns JSX (HTML-like syntax).
- **Props** — inputs passed to a component, e.g. `<BlogCard title="Hello" authorName="Vishisht" />`. Props are read-only.
- **State** — data that lives inside a component and can change over time. When state changes, React **re-renders** that component. Example in `Auth.tsx`: `useState<SignupInput>({ name: "", username: "", password: "" })` — every keystroke updates state, and the input's `value` re-renders.
- **Hooks** — functions React provides to "hook into" features:
  - `useState` — hold local state.
  - `useEffect` — run code after render (side effects). Used in `hooks/index.ts` to fetch blogs from the API when the page loads.
  - `useNavigate` — programmatic navigation (e.g. after login, go to `/allblogs`).
  - `useParams` — read URL params (`/blog/:id` → gives you `id`).
- **Virtual DOM** — React keeps an in-memory copy of the UI, compares it to the previous one ("diffing"), and makes the **minimum** DOM changes. This is why it's fast.

### The component tree

```
<App>
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Signup/>}>        // or /signup
      <Route path="/signin" element={<Signin/>}>  // both render <Auth type="..."> + <Quote>
      <Route path="/allblogs" element={<Blogs/>}> // feed
      <Route path="/blog/:id" element={<Blog/>}>  // single article
      <Route path="/publish" element={<Publish/>}>// editor
    </Routes>
  </BrowserRouter>
</App>
```

### Routing — how multiple "pages" work in one HTML file

A React app is a **Single Page Application (SPA)**: one `index.html`, one JS bundle. There's no page reload when you navigate. **React Router** intercepts the URL, matches it against `<Route>` definitions, and swaps which component renders. The URL changes via the browser's History API (`pushState`), so back/forward buttons still work.

### Data fetching with axios + hooks

`hooks/index.ts` defines two custom hooks:

```ts
export const useBlogs = () => {
  const [loading, setLoading] = useState(true);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  useEffect(() => {
    axios.get(`${BACKEND_URL}/api/v1/blog/bulk`)
      .then(response => { setBlogs(response.data.blogs); setLoading(false); })
  }, []);
  return { loading, blogs };
};
```

- `useEffect(..., [])` runs once when the component mounts. `[]` = empty dependency array = run only once.
- `axios` is an HTTP client — a nicer wrapper around the browser's built-in `fetch`.
- While `loading` is true, the page shows **skeletons** (animated placeholders). When data arrives, `setBlogs` triggers a re-render with real cards.
- **Note:** axios automatically parses the JSON response into `response.data`.

### Tailwind CSS

Tailwind is a **utility-first CSS framework**. Instead of writing CSS classes in a `.css` file, you compose small utility classes directly in JSX: `className="text-2xl font-bold text-green-700"`. It scans your source files for class names and generates only the CSS you actually use (that's why the final CSS is small). The config (`tailwind.config.js`) extends it with custom fonts (Lora serif + Inter sans).

### Why Vite?

Vite is a **build tool** — it bundles your many TypeScript/JSX files into a few optimized files the browser can load, and gives you a dev server with **Hot Module Replacement** (you save a file, the page updates instantly without a full reload).

### localStorage — where the token lives

`localStorage` is a small key-value store in the browser that persists across page reloads. On login we save the JWT. On every subsequent page load, components check `localStorage.getItem("token")` to know if the user is logged in.

---

## 5. Backend fundamentals

### What is HTTP?

HTTP is the protocol browsers and servers use to talk. A request has:
- **Method** — the action: `GET` (read), `POST` (create), `PUT` (update), `DELETE` (remove).
- **URL** — what resource.
- **Headers** — metadata (Content-Type, Authorization, ...).
- **Body** — optional data (usually JSON for POST/PUT).

A response has:
- **Status code** — the result: `200` OK, `201` Created, `403` Forbidden, `404` Not Found, `411` Length Required (used loosely here for "bad input"), `500` Server Error.
- **Body** — the data (JSON).

### What is REST?

REST is a style of designing APIs where **URLs name resources** and **HTTP methods are the actions**:

| Method | URL | Meaning |
|---|---|---|
| POST | `/api/v1/user/signup` | Create a user |
| POST | `/api/v1/user/signin` | Log in |
| GET | `/api/v1/blog/bulk` | List all blogs |
| GET | `/api/v1/blog/:id` | Get one blog |
| POST | `/api/v1/blog` | Create a blog |
| PUT | `/api/v1/blog` | Update a blog |

Note `/api/v1/` — "versioning" the API so future breaking changes can live under `/v2`.

### What is Hono?

Hono is a **lightweight web framework** for JavaScript/TypeScript. It does the routing: "when a request comes in with this method + path, run this handler." It's framework-agnostic — the same code can run on Cloudflare Workers, AWS Lambda, Node, etc. This is exactly why it was chosen: the project originally ran on Cloudflare and moved to AWS Lambda **without rewriting the routes**.

### The app entry point

```ts
const app = new Hono<{ Bindings: { DATABASE_URL: string; JWT_SECRET: string } }>();
app.use('/*', cors());
app.route("/api/v1/user", userRouter);
app.route("/api/v1/blog", blogRouter);
```

- `app.use('/*', cors())` — **CORS middleware** (see glossary): tells browsers "this API is allowed to be called from other origins" (e.g. from the CloudFront domain).
- `app.route(...)` — mounts the two routers.

### Middleware — the gatekeeper

```ts
blogRouter.use("/*", async (c, next) => {
  if (c.req.method === "GET") { await next(); return; }   // public reads
  const authHeader = c.req.header("authorization") || "";
  try {
    const user = await verify(authHeader, getEnv(c, "JWT_SECRET"));
    if (user) { c.set("userId", user.id); await next(); }
    else { c.status(403); return c.json({ message: "You are not logged in" }); }
  } catch (e) { c.status(403); return c.json({ message: "You are not logged in" }); }
});
```

**Middleware** is code that runs *before* the route handler. `next()` passes control onward. This middleware protects all blog routes: any non-GET request must present a valid JWT, or it gets a 403. This is the **single security checkpoint** for writing.

### Zod validation — don't trust the client

```ts
const { success } = signupInput.safeParse(body);
if (!success) { c.status(411); return c.json({ message: "Inputs not correct" }); }
```

**Zod** is a validation library. You define a *schema* (shape of valid data), then `safeParse` checks the incoming body against it. If a user sends `{"password": 123}` (a number, not a string), it's rejected. The schemas live in the shared package `@100xdevs/medium-common`, so the **same** schema is used on frontend (for TypeScript types) and backend (for runtime validation) — one source of truth.

### Env variables — secrets

```ts
export function getEnv(c, key) {
  const binding = (c.env as Record<string, string> | undefined)?.[key];
  return binding || process.env[key] || "";
}
```

Secrets (`DATABASE_URL`, `JWT_SECRET`) are **not** in the code. They're injected by the platform (Lambda environment variables). `getEnv` reads them. This is why the repo has no secrets in it (they used to be committed in `wrangler.toml` — a security mistake that was fixed).

---

## 6. Authentication with JWT

### The problem

When a user logs in, the server needs to prove "this person is who they say they are" on every request. Options:
1. **Sessions** — server stores a session in memory/DB and hands the client an opaque ID. Requires server-side storage.
2. **JWT (chosen)** — the server *signs* a small token; the client presents it; the server *verifies the signature*. No server-side storage needed → **stateless**.

### What's inside a JWT?

A JWT is three base64-encoded parts joined by dots:

```
eyJhbGciOiJIUzI1NiJ9 . eyJpZCI6NX0 . SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
└──── header ────┘   └── payload ──┘   └────────── signature ──────────┘
```

1. **Header** — `{"alg":"HS256","typ":"JWT"}` (algorithm = HMAC-SHA256).
2. **Payload** — the claims: `{"id": 5, "iat": ...}` (your user id + issued-at time).
3. **Signature** — computed as `HMAC-SHA256( base64(header) + "." + base64(payload), JWT_SECRET )`.

### Why can't someone forge it?

The signature is computed with a **secret only the server knows** (`JWT_SECRET`). If an attacker changes `id` from 5 to 1 (to become the admin), the signature no longer matches, and `verify()` throws. They can't recompute the signature without the secret. The payload is only *encoded* (base64 is not encryption — anyone can read it), but it's **tamper-evident**: any modification breaks verification.

### The flow in Textuality

1. **Signup/Signin** → server looks up/creates the user → `sign({ id: user.id }, JWT_SECRET)` → returns token.
2. **Browser** stores token in `localStorage`.
3. **Write a post** → frontend sends `Authorization: <token>` header.
4. **Backend middleware** → `verify(token, JWT_SECRET)` → if valid, extracts `user.id` → `c.set("userId", user.id)` → the handler uses that id as `authorId`.

**Why is authorId from the token and not the body?** Because the body can be forged. The token can't.

### Honest caveats (interview gold)

- Passwords are stored **plaintext** in the DB — no hashing. Real apps hash with bcrypt/argon2 (one-way function + salt). This is the #1 thing to say you'd improve.
- JWT secret is short ("haaagu" was the old one) — should be a long random string (the Terraform setup now generates one).
- Tokens never expire in this app (no `exp` claim checked). Real apps add expiry + refresh tokens.

---

## 7. Database: PostgreSQL + Prisma

### What is a relational database?

A relational DB stores data in **tables** (like spreadsheets) with **rows** (records) and **columns** (fields), and **relations** between tables. PostgreSQL is a mature, open-source relational database.

### Textuality's schema

```prisma
model User {
  id       Int     @id @default(autoincrement())
  name     String?
  username String  @unique
  password String
  blogs    Blog[]          // a user has many blogs
}

model Blog {
  id        Int      @id @default(autoincrement())
  authorId  Int
  title     String
  content   String
  published Boolean  @default(false)
  createdAt DateTime @default(now())
  author    User     @relation(fields: [authorId], references: [id])  // each blog belongs to one user
}
```

Key concepts here:

- **Primary key** — `@id`. Every row is uniquely identified by its `id`. PostgreSQL auto-generates it (`autoincrement`).
- **Foreign key** — `authorId` references `User.id`. This creates the **one-to-many** relationship: one user → many blogs.
- **@unique** — no two users can have the same `username`.
- **@default(now())** — `createdAt` is filled automatically at insert time. (This was added in a later migration so the feed could show real publication dates.)
- **Indexes** — a DB can look up rows by `id` quickly because primary keys are indexed. In production you'd add an index on `authorId` too.

### What does the SQL look like?

When you `prisma.blog.findMany(...)`, Prisma generates roughly:

```sql
SELECT b.id, b.title, b.content, b.createdAt, u.name
FROM "Blog" b
INNER JOIN "User" u ON u.id = b."authorId";
```

A **JOIN** combines rows from two tables based on the foreign key — that's how the feed shows each post with its author's name in one query.

### What is an ORM (Prisma)?

An ORM (**Object-Relational Mapper**) lets you use your programming language instead of raw SQL. Prisma gives you:
- **Type safety** — `prisma.blog.create({ data: { title, content, authorId } })` is checked at compile time. Wrong field name = compile error, not runtime crash.
- **Migrations** — SQL files that version your schema. `schema.prisma` is the source of truth; changing it + `prisma migrate` produces a migration file that alters the real DB safely.
- **Client generation** — `prisma generate` creates the typed client code in `node_modules/@prisma/client`.

### What is a migration?

A migration is a record of a schema change, e.g. `20240829120000_add_blog_created_at/migration.sql`:

```sql
ALTER TABLE "Blog" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
```

Migrations let you evolve the DB without losing data and keep every environment (dev/prod) in sync. `npx prisma migrate deploy` applies pending migrations.

### The Lambda detail (good to know)

Prisma needs a "query engine" binary. Lambda runs on Amazon Linux, so the schema specifies a **binary target**: `rhel-openssl-3.0.x`. The build script zips this binary *into* the Lambda package — that's why `lambda.zip` was ~46MB.

---

## 8. AWS — every service explained

### Why AWS at all?

The app needs three things hosted somewhere: the static frontend, the API backend, and the database. AWS provides all three as managed services. (The project originally used Cloudflare Workers + Aiven + Vercel; the AWS move was made to consolidate everything, and the whole stack is now reproducible with Terraform.)

### The services, one by one

**1. S3 (Simple Storage Service)** — object storage (files in buckets). Your built React app (`dist/`) is uploaded here. S3 alone is just files; it doesn't serve a website with HTTPS.

**2. CloudFront** — a **CDN** (Content Delivery Network) that sits in front of S3. It caches copies of your files at edge locations worldwide (fast load times), serves them over **HTTPS** with a real domain, and handles SPA routing (all routes fall back to `index.html`). It uses **OAC (Origin Access Control)** so S3 only accepts requests coming through CloudFront.

**3. Lambda** — **serverless functions**. You upload your code (the zip), and AWS runs it on demand, scaling automatically from 0 to thousands of concurrent requests. You pay only for execution time, not for idle servers. In Textuality, the entire Hono app runs as one Lambda function.

**4. API Gateway** — the managed HTTP entry point. It gives your Lambda a public URL (`https://iko8kowogg.execute-api.ap-south-1.amazonaws.com`), handles HTTPS, and forwards requests to Lambda. It's configured with CORS enabled and **payload v2** (the event format Lambda receives).

**5. RDS (Relational Database Service)** — managed PostgreSQL. You get a Postgres instance without running/maintaining the server yourself. `db.t4g.micro` is a small, cheap instance (2 vCPU, 1GB RAM — fine for a portfolio app). Data persists on EBS volumes with automatic backups available.

**6. IAM (Identity and Access Management)** — AWS's permission system. Every service gets an **IAM role** defining what it may do (e.g., Lambda's role allows it to write CloudWatch logs). Your CLI user (`mediumdev`) has its own credentials/permissions to run Terraform.

**7. CloudWatch** — logging/monitoring. Lambda automatically logs every invocation; you can view them to debug (this is how the "zod missing" bug was found).

### The critical mental model: serverless

A traditional server is a machine that's *always running* — you pay for it 24/7 even if idle. **Serverless** means: you upload code + config; AWS spins up a container only when a request arrives, runs your function, then shuts it down. The Lambda runtime reads your bundled JS, calls `handler(event)`, and returns the result. Hono's `handle(app)` adapter (in `src/lambda.ts`) translates between AWS's event format and Hono's request format:

```ts
import { handle } from "hono/aws-lambda";
import app from "./index";
export const handler = handle(app);
```

**Cold starts** — the downside: if no request has come for a while, the first request pays a penalty while AWS boots a new container (adds latency, typically a few hundred ms to ~1s). Warm requests are fast.

---

## 9. Terraform — infrastructure as code

### What is it?

Terraform is a tool that **defines cloud infrastructure in code** and provisions it reproducibly. Instead of clicking around the AWS console (error-prone, unrepeatable), you write `.tf` files describing *what* you want, and `terraform apply` makes it real.

### What does Textuality's `infra/` create?

- `database.tf` → RDS PostgreSQL instance + security group (firewall rules).
- `backend.tf` → the Lambda function (with env vars `DATABASE_URL`, `JWT_SECRET`), its IAM role, and the API Gateway HTTP API wired to it.
- `frontend.tf` → S3 bucket + CloudFront distribution with OAC + SPA error routing.
- `outputs.tf` → prints the final URLs after apply.

### The workflow

```bash
terraform init      # download providers (aws plugin)
terraform plan      # show what WOULD change (dry run, safe)
terraform apply     # make it real (type "yes" to confirm)
terraform destroy   # tear it all down
```

- **State** — Terraform records what it created in `terraform.tfstate`, so it knows what to update/destroy later. (Gitignored; contains sensitive values.)
- **Plan** — the safety net: you see exactly what will be created/changed before touching anything.
- **Variables** — secrets like `db_password` and `jwt_secret` are passed via `terraform.tfvars` (gitignored), never hardcoded.

**Why is this impressive in an interview?** Because you can say: "The entire production environment — database, API, CDN — is defined as code. Anyone can reproduce it with `terraform apply`, and `terraform destroy` removes everything. No click-ops."

---

## 10. How the app gets deployed

### Backend deploy (build + apply)

```bash
./infra/build-lambda.sh   # 1. bundle + package
cd infra && terraform apply  # 2. push to AWS
```

1. **esbuild** bundles `src/lambda.ts` + all its imports (Hono, Prisma client, zod, etc.) into ONE file `dist/index.js` (`--packages=external` keeps node_modules as real folders).
2. The script copies the needed `node_modules` (derived from `package-lock.json`) + the Prisma engine binary into a zip.
3. `terraform apply` uploads the zip to Lambda and updates config. (If only the zip changed, Lambda code updates are fast.)

### Frontend deploy

```bash
./infra/deploy-frontend.sh
```

1. `VITE_BACKEND_URL=https://iko8kowogg.execute-api...` → `npm run build` → `dist/`.
2. `aws s3 sync` uploads files to the S3 bucket.
3. Creates a **CloudFront invalidation** so edge caches fetch the new files immediately.

### The full local flow

```bash
cd backend && npm install && npm run build:lambda
cd ../infra && ./build-lambda.sh && terraform apply
cd ../backend && DATABASE_URL="postgresql://..." npx prisma migrate deploy
cd ../infra && ./deploy-frontend.sh
```

---

## 11. Interview Q&A

### Architecture & general

**Q: Walk me through this project.**
A: "Textuality is a Medium-style blogging app. Users sign up with email/password and get a JWT. They can write and publish posts; anyone can read the feed. It's a three-tier architecture: React SPA served from S3/CloudFront, a Hono REST API on Lambda behind API Gateway, and PostgreSQL on RDS accessed via Prisma. The whole infrastructure is defined in Terraform."

**Q: Why did you split frontend and backend?**
A: "Separation of concerns and security. The frontend shouldn't touch the database — credentials would be exposed to every visitor, and anyone could modify data. The backend centralizes validation and auth. It also lets the frontend be served from a CDN while the API scales independently."

**Q: How do the frontend and backend communicate?**
A: "Over HTTPS with JSON. The frontend calls REST endpoints like `POST /api/v1/blog` with the JWT in the Authorization header. The backend responds with JSON like `{ blogs: [...] }`. CORS is enabled so the browser allows cross-origin calls."

**Q: What's the request lifecycle?**
A: "Browser → DNS → CloudFront/CDN or API Gateway → Lambda runtime → Hono routing → middleware (JWT check) → handler → Zod validation → Prisma → SQL → PostgreSQL → response back through the chain as JSON."

### React

**Q: What is React? What problem does it solve?**
A: "A library for building UIs from components. It solves DOM management: I describe the UI as a function of state, and React diffs the virtual DOM to apply minimal updates. State changes automatically re-render the affected parts."

**Q: Explain hooks you used.**
A: "`useState` holds local state (form inputs, loading flags). `useEffect` runs side effects after render — I use it to fetch blogs from the API when a page mounts. `useNavigate` does programmatic routing after login. `useParams` reads `:id` from the URL. I also wrote custom hooks (`useBlog`, `useBlogs`) to encapsulate data fetching with loading state."

**Q: What is a single-page application?**
A: "One HTML file + one JS bundle. Navigation swaps components client-side via React Router instead of full page reloads. The URL changes with the History API. Downside: SEO is weaker without SSR, which is why a CDN needs fallback-to-index routing."

**Q: Why did you store the token in localStorage?**
A: "It persists across reloads and is simple. (Honest caveat: it's vulnerable to XSS; a more secure option is an httpOnly cookie.)"

### JWT & auth

**Q: How does authentication work in your app?**
A: "On signup/signin the backend verifies credentials, then signs a JWT with `{ id: userId }` using HMAC-SHA256 and a server secret. The browser stores it. On write requests, the middleware verifies the signature; if valid it sets `userId` from the token, and the handler uses that as the post's author. Stateless — no session storage."

**Q: Why can't a user just change the token's id?**
A: "The token's signature is HMAC of header+payload with the server secret. Change the payload and the signature no longer verifies — `verify()` throws and we return 403. Base64 encoding isn't encryption, but tampering is detectable."

**Q: What's the difference between authentication and authorization?**
A: "Authentication is *who you are* (the JWT proves it). Authorization is *what you're allowed to do*. In this app, auth = JWT verification; the middleware then authorizes the create/update actions."

**Q: What would you improve about the auth?**
A: "Hash passwords with bcrypt/argon2 (they're plaintext now), add token expiry + refresh tokens, store the token in an httpOnly cookie instead of localStorage, use a strong random secret."

### Database

**Q: Why Prisma instead of raw SQL?**
A: "Type safety — mistakes are caught at compile time. Migrations version schema changes so dev and prod stay in sync. I still understand the SQL it generates, like the JOIN between Blog and User."

**Q: Explain the schema and relationships.**
A: "Two tables. User has id, name, username (unique), password. Blog has id, title, content, authorId (foreign key to User), createdAt. It's a one-to-many: one user has many blogs; each blog belongs to exactly one user. The feed query joins these to return author names."

**Q: What is a foreign key?**
A: "A column referencing another table's primary key — it enforces referential integrity: a blog can't reference a user that doesn't exist, and the relationship is how JOINs work."

**Q: What is a migration?**
A: "A versioned SQL change. I added a `createdAt` column via a migration (`ALTER TABLE ... ADD COLUMN`). `prisma migrate deploy` applies pending ones to the live DB."

### AWS

**Q: Explain your AWS architecture.**
A: "S3 stores the built React app; CloudFront is the CDN in front with HTTPS and SPA routing. The API is a Hono app running on Lambda — one function invoked via API Gateway, which provides the public HTTPS URL and CORS. Data lives in PostgreSQL on RDS."

**Q: What is serverless?**
A: "Code runs on demand in managed containers — no servers to provision or pay for while idle. Lambda scales from zero to many concurrent executions automatically. The trade-off is cold starts: the first request after idle pays container-boot latency."

**Q: What is a cold start?**
A: "When a Lambda hasn't run for a while, AWS has to provision a container, load the runtime and your code before executing — adding latency to that first request. Mitigations: keep functions warm, or use provisioned concurrency (paid)."

**Q: Why CloudFront in front of S3?**
A: "HTTPS with a real domain, global edge caching for speed, and OAC so the bucket isn't publicly browsable directly. Also handles the SPA fallback: unknown routes serve index.html."

**Q: How did you debug the backend on AWS?**
A: "CloudWatch Logs — every Lambda invocation logs. The error 'Cannot find module zod' led me to fix the packaging; the wrong handler path was found the same way."

### Terraform

**Q: Why Terraform?**
A: "Infrastructure as code. The whole environment is defined in `.tf` files: RDS, Lambda, API Gateway, S3, CloudFront, IAM. `terraform plan` shows changes before they happen; `apply` provisions; `destroy` tears down. Reproducible, reviewable, no click-ops."

**Q: What is terraform state?**
A: "A file recording what Terraform created, mapping config to real resources, so it can plan diffs and destroy cleanly. It's gitignored because it can contain secrets."

**Q: What are variables/`.tfvars` for?**
A: "Separating config from code. Secrets like the DB password and JWT secret are injected at apply time from a gitignored `terraform.tfvars`, so they never land in the repo."

### General engineering

**Q: What did you learn building this?**
A: "End-to-end web development: building a React UI, designing a REST API, authentication with JWT, modeling data with Prisma and migrations, deploying on AWS, and managing infrastructure with Terraform. Also the importance of secrets management and honest security practices — I moved leaked secrets out of the repo and into environment variables."

**Q: What's the hardest bug you fixed?**
A: "The Lambda returned 500 with no obvious cause. CloudWatch logs showed 'Cannot find module zod' — the build script derived dependencies from `npm ls`, which missed a transitive dependency. I changed the build to derive the dependency list from `package-lock.json` deterministically. I also fixed a URL bug where the frontend called `...amazonaws.comapi/v1/...` because of a missing slash."

---

## 12. Glossary of key terms

| Term | Meaning |
|---|---|
| **HTTP/HTTPS** | The protocol for web requests. HTTPS = encrypted. |
| **JSON** | Text format for structured data; the lingua franca of APIs. |
| **REST API** | API design where URLs = resources, methods = actions. |
| **CORS** | Browser rule: a page at origin A can't call origin B unless B sends `Access-Control-Allow-Origin`. The backend enables it globally. |
| **CDN** | Network of cached edge servers; CloudFront is AWS's. |
| **SPA** | Single-page app: one HTML file, client-side routing. |
| **ORM** | Maps DB tables to code objects (Prisma). |
| **JWT** | Signed, stateless auth token. |
| **Serverless** | Run code on demand, no always-on server. |
| **Cold start** | First-request latency when a serverless container boots. |
| **IaC** | Infrastructure as Code (Terraform). |
| **IAM** | AWS identity/permissions system. |
| **OAC** | CloudFront ↔ S3 private origin auth. |
| **Middleware** | Code that runs before route handlers (auth gate). |
| **Zod** | Runtime validation with TypeScript inference. |
| **esbuild** | Fast JS bundler used to package the Lambda. |
| **Foreign key** | Column referencing another table's primary key. |
| **JOIN** | SQL combining rows from related tables. |
| **Migration** | Versioned schema change. |
| **Environment variable** | Config injected at runtime (secrets). |
| **State** | React data that triggers re-renders when changed. |
| **Virtual DOM** | React's in-memory UI diffing layer. |

---

## 13. Known limitations & honest answers

Interviewers love asking "what would you improve?" — here are the real, honest answers from this project:

1. **Plaintext passwords** → hash with bcrypt/argon2 + per-user salt.
2. **No pagination** → `GET /bulk` returns everything; add `?page=`/`?limit=` with an index on `createdAt`.
3. **Token never expires** → add `exp` claim, refresh tokens, `httpOnly` cookies.
4. **No tests** → unit tests (Vitest/Jest) for routes, integration tests for the API.
5. **JWT secret rotation** → use AWS Secrets Manager / SSM Parameter Store.
6. **RDS is publicly accessible** → move to private subnets + RDS Proxy.
7. **`published` field unused** → implement draft/publish workflow.
8. **No rate limiting** → API Gateway throttling or WAF.
9. **Single Lambda for all routes** → fine for this scale; could split per-route later.
10. **No image uploads** → add S3 presigned URLs for avatars/covers.
11. **No CI/CD** → add GitHub Actions: lint → test → build → `terraform apply` → deploy on push.
12. **Error handling is basic** → consistent error format, proper 4xx/5xx codes, global error middleware.
13. **No Docker for local dev** → `docker-compose` with a local Postgres for reproducible dev.

Mentioning these shows depth — it proves you understand what production-grade means, not just what the tutorial showed.
