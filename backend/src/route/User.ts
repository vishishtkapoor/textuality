import { Hono } from "hono";
import { PrismaClient } from '@prisma/client'
import { sign } from 'hono/jwt'
import { signupInput, signinInput } from "@100xdevs/medium-common";
import { getEnv } from "../env";

export const userRouter = new Hono<{
    Bindings: {
        DATABASE_URL: string;
        JWT_SECRET: string;
    }
}>();

userRouter.post('/signup', async (c) => {
    const body = await c.req.json();
    const { success } = signupInput.safeParse(body);
    if (!success) {
        c.status(411);
        return c.json({
            message: "Inputs not correct"
        })
    }
    const prisma = new PrismaClient({
        datasourceUrl: getEnv(c, "DATABASE_URL"),
    })

    try {
        const user = await prisma.user.create({
            data: {
                username: body.username,
                password: body.password,
                name: body.name
            }
        })
        const jwt = await sign({
            id: user.id
        }, getEnv(c, "JWT_SECRET"));

        return c.text(jwt)
    } catch (e) {
        console.log(e);
        c.status(411);
        return c.text('Invalid')
    }
})


userRouter.post('/signin', async (c) => {
    const body = await c.req.json();
    const { success } = signinInput.safeParse(body);
    if (!success) {
        c.status(411);
        return c.json({
            message: "Inputs not correct"
        })
    }

    const prisma = new PrismaClient({
        datasourceUrl: getEnv(c, "DATABASE_URL"),
    })

    try {
        const user = await prisma.user.findFirst({
            where: {
                username: body.username,
                password: body.password,
            }
        })
        if (!user) {
            c.status(403);
            return c.json({
                message: "Incorrect creds"
            })
        }
        const jwt = await sign({
            id: user.id
        }, getEnv(c, "JWT_SECRET"));

        return c.text(jwt)
    } catch (e) {
        console.log(e);
        c.status(411);
        return c.text('Invalid')
    }
})