import type { Server } from "http"
import { createServer } from "http"
import Koa from "koa"
import Router from "koa-router"
import Joi from "joi"
import bodyparser from "koa-body"
import jwt from "jsonwebtoken"
import { DateTime } from "luxon"
import { MongoClient } from "mongodb"
import Client from "./models/client"
import ip from "ip"
import cors from "@koa/cors"
import amqp from "amqplib"
import { EventEmitter } from "events"

abstract class HTTPError extends Error {
  abstract readonly status: number

  abstract toJSON(): { code: string, message: string }
}

class BadRequest extends HTTPError {
  readonly status = 400

  constructor(private fields: Record<string, { code: string, message: string }>) {
    super("Some fields are missing or invalid.")
  }

  toJSON() {
    return {
      code: "BadRequest",
      message: this.message,
      fields: this.fields
    }
  }
}

class Unauthorized extends HTTPError {
  readonly status = 401
  readonly message = "We don't know who you are."

  toJSON() {
    return {
      code: "Unauthorized",
      message: this.message
    }
  }
}

const ErrorMdw = () => async (ctx: Koa.Context, next: Koa.Next) => {
  try {
    await next()
  } catch (error) {
    if (error instanceof HTTPError) {
      ctx.status = error.status
      ctx.body = error
      return
    }
    ctx.status = 500
    ctx.body = {
      code: "InternalServerError",
      message: "Something went wrong."
    }
  }
}

const Validate = (body?: Joi.PartialSchemaMap, query?: Joi.PartialSchemaMap) =>
  (ctx: Koa.Context, next: Koa.Next) => {
    const schema = Joi.object({
      body: Joi.object({ ...body }),
      query: Joi.object({ ...query })
    })

    const data = {
      body: ctx.request.body,
      query: ctx.request.query,
    }

    const { value, error } = schema.validate(data, {
                                      abortEarly: false,
                                      allowUnknown: true,
                                      stripUnknown: true
                                    })

    if (error) throw new BadRequest(error.details.reduce((fields, err) => ({
      ...fields,
      [err.path.join(".")]: {
        code: err.type,
        message: err.message
      }
    }), {}))

    ctx.payload = value

    return next()
  }

const JWT_SECRET = "234ljk235jk34h5"

class OAuthLogic extends EventEmitter {
  public generateAppToken(client: Client) {
    const in1h = DateTime.local().plus({ hours: 1 })
    return {
      access_token: jwt.sign({
        exp: in1h.toSeconds(),
        typ: "cli"
      }, JWT_SECRET),
      access_expires: in1h.toJSDate()
    }
  }

  public generateUserToken(client: Client, user: any) {
    const in1h = DateTime.local().plus({ hours: 1 })
    return {
      access_token: jwt.sign({
        exp: in1h.toSeconds(),
        typ: "usr"
      }, JWT_SECRET),
      access_expires: in1h.toJSDate()
    }
  }

  async authenticateClient(client_id: string, ipAddress: string, client_secret?: string) {
    const client = await Client.findOne({ id: client_id })
    if (!client) throw new Unauthorized()

    if (client.type === "private") {
      const ipMatch = client.cidrs.find(cidr => ip.cidrSubnet(cidr).contains(ipAddress))
      if (!ipMatch) throw new Unauthorized()

      if (client.secret !== client_secret) throw new Unauthorized()
    }

    return client
  }

  async authenticatePassword(client: Client, username: string, password: string) {
    if (client.type === "private") {
      this.emit("intrusion", { email: username })
      throw new Unauthorized()
    }
  }
}

const Http = async (logic: OAuthLogic) => {
  const origins = new Set<string>()

  const refreshOrigins = async () => {
    origins.clear()
    await Client.find({ type: "public" })
                .forEach(client => client.origins.forEach(origin => origins.add(origin)))
  }
  await refreshOrigins()
  setInterval(refreshOrigins, 3600_000)

  return new Koa()
    .use(cors({
      origin: (ctx: Koa.Context) => origins.has(ctx.request.header.origin!) ? ctx.request.header.origin! : "",
    }))
    .use(bodyparser())
    .use(ErrorMdw())
    .use(new Router()
      .post("/oauth/token",
        Validate({
            client_id: Joi.string().required(),
            client_secret: Joi.string().optional(),
            username: Joi.when(Joi.ref("/query.grant_type"), {
              is: "password",
              then: Joi.string().required(),
            }),
            password: Joi.when(Joi.ref("/query.grant_type"), {
              is: "password",
              then: Joi.string().required(),
            }),
          },
          { grant_type: Joi.string().valid("client_credentials", "password").required() }
        ),
        async (ctx: Koa.Context) => {
          const client = await logic.authenticateClient(ctx.payload.body.client_id, ctx.headers["x-forwarded-for"]?.[0] ?? ctx.ip, ctx.payload.body.client_secret)

          if (ctx.payload.query.grant_type === "client_credentials") {
            ctx.body = logic.generateAppToken(client)
            return
          }
          if (ctx.payload.query.grant_type === "password") {
            const user = await logic.authenticatePassword(client, ctx.payload.body.username, ctx.payload.body.password)
            ctx.body = logic.generateUserToken(client, user)
            return
          }
        })
      .routes())
    }

class App {
  public http?: Server
  public mongo?: MongoClient

  async start() {
    this.mongo = await MongoClient.connect(process.env.MONGODB_URI!)

    ;[
      Client
    ].forEach(model => model.inject(this.mongo!.db()))

    const rabbit = await amqp.connect(process.env.RABBIT_URI!)
    const write = await rabbit.createConfirmChannel()

    const logic = new OAuthLogic()

    logic.on("intrusion", ({ email }) => write.publish("bus", "email.send", Buffer.from(JSON.stringify({ template: "intrustion_alert", to: email }))))

    const httpApp = await Http(logic)
    this.http = createServer(httpApp.callback())

    await new Promise<void>(resolve => this.http!.listen(8000, () => resolve()))
  }

  async stop() {
    await new Promise<void>(resolve => this.http!.close(() => resolve()))
    this.http = undefined
    await this.mongo!.close()
    this.mongo = undefined
  }
}

const app = new App()

// istanbul ignore next - Only in non test env
if (require.main === module)
  app.start()

export default app
