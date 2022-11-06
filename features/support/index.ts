import { DataTable } from "@cucumber/cucumber"
import { BeforeAll, AfterAll, Before, After, Given, When, Then } from '@cucumber/cucumber'
import supertest from "supertest"
import { expect } from "chai"
import App from "../../src"

import amqp from "amqplib"

BeforeAll(() => App.start())
AfterAll(() => App.stop())

Before(async function () {
  this.client = supertest(App.http)
  const amqpClient = await amqp.connect(process.env.RABBIT_URI!)
  this.channel = await amqpClient.createChannel()
})

When("An app tries to authenticate with", async function (raw: DataTable) {
  const { "client id": client_id, "client secret": client_secret, origin } = raw.rowsHash()

  let request = this.client.post("/oauth/token?grant_type=client_credentials")
  if (origin) request = request.set("origin", origin)

  this.response = await request.send({
                                      client_id,
                                      client_secret
                                    })
})

Then(/^I receive an? (\w+) error$/i, function (error: string) {
  const { status, body } = this.response

  switch (error) {
    case "unauthorized":
      expect(status).to.equal(401)
      expect(body).to.deep.equal({
        code: "Unauthorized",
        message: "We don't know who you are."
      })
      break
    default: throw new Error(`Unknown error: ${error}`)
  }
})

Then("I receive a successful response", function () {
  const { status } = this.response

  expect(status).to.be.oneOf([200, 201, 204])
})

Then("I receive an Access-Control-Allow-Origin header with {string}", function (uri: string) {
  const { header, status } = this.response

  expect(header["access-control-allow-origin"] ?? "").to.equal(uri)
})

When("A user tries to authenticate with", async function (raw: DataTable) {
  const {
    "client id": client_id,
    "client secret": client_secret,
    "username": username,
    "password": password,
  } = raw.rowsHash()

  this.response = await this.client.post("/oauth/token?grant_type=password")
                                   .send({
                                      client_id,
                                      client_secret,
                                      username,
                                      password
                                   })
})

Then("an {string} email is sent to {word}", async function (emailType: string, user: string) {
  const email = await new Promise(async resolve => {
    const { consumerTag } = await this.channel.consume("email.send", (msg: any) => {
      if (!msg) return
      this.channel.ack(msg)
      resolve(JSON.parse(msg.content.toString()))
    })
    this.channel.cancel(consumerTag)
  })

  console.log(email)
})