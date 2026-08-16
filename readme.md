
# Blogging App - Medium

> **Live deployment:** the app now runs entirely on **AWS** (RDS + Lambda + API Gateway + S3/CloudFront).
> See [`infra/README.md`](infra/README.md) for the one-command Terraform setup.

## Frontend

### React
A powerful library for building dynamic and responsive user interfaces.

### Vite
A fast build tool that enhances development with instant hot module replacement.

### Skeleton Loading
Improves user experience by displaying a placeholder while content is loading.

## Backend

### Cloudflare Workers
A serverless platform for building backend logic at the edge, ensuring low latency.

### TypeScript
A statically typed superset of JavaScript that improves code reliability and maintainability.

### Prisma
An ORM that simplifies database interactions and includes connection pooling.

### PostgreSQL
A reliable and powerful open-source relational database.

### Zod
A schema declaration and validation library providing type inference.

### JWT
JSON Web Tokens for secure authentication, enabling stateless sessions.

## Project Setup

### Bootstrapping the Project

Vite makes it easy to create a React project.

```bash
npm create vite@latest medium-project --template react
cd medium-project
npm install
```

### Setting Up the Backend with Cloudflare Workers

Cloudflare Workers allow you to write serverless functions that run on Cloudflare's edge network.

```bash
npm install -g wrangler
wrangler init
```

Configure your `wrangler.toml` file with your Cloudflare account details.

### Configuring Prisma and PostgreSQL

Prisma simplifies database management. Set up your PostgreSQL database and configure Prisma:

```bash
npm install prisma --save-dev
npx prisma init
```

Update the `DATABASE_URL` in your `.env` file with your PostgreSQL connection string. Define your database schema in `prisma/schema.prisma` and run migrations:

```bash
npx prisma migrate dev --name init
```

### Integrating TypeScript and Zod

TypeScript enhances code reliability, and Zod complements it by providing runtime validation. Install the necessary packages:

```bash
npm install typescript Zod
```

Add a `tsconfig.json` file for TypeScript configuration, and use Zod to validate data structures.

### Implementing Authentication with JWT

JWTs provide secure authentication. Install the package:

```bash
npm install jsonwebtoken
```

Create utility functions for generating and verifying tokens, and set up authentication routes using Cloudflare Workers.

## Deployment

### Deploying Backend with Cloudflare Workers

Deploy your backend code to Cloudflare Workers:

```bash
wrangler publish
```

### Deploying Frontend with Vercel

Deploy your React app with Vercel:

```bash
npm install -g vercel
vercel
```

Follow the prompts to deploy your app.

## Conclusion

Building a Medium-like blogging app from scratch is a rewarding experience. By using modern tools like React, Vite, Cloudflare Workers, TypeScript, Prisma, and PostgreSQL, you can create a robust and scalable application.

A special thanks to Harkirat for his guidance throughout this journey.

Check out the live app [here](#) and the GitHub repository [here](#). I hope this guide inspires you to build your own amazing applications!

Happy coding! 🚀✨
```

You can replace the placeholders in the links (`[here](#)`) with the actual URLs when available.
