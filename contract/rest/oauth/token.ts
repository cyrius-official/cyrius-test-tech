import client from "supertest"
import chai, { expect } from "chai"
import chaiSubset from "chai-subset"
import App from "../../../src"

chai.use(chaiSubset)

describe("ENDPONITS", () => {
  before(() => App.start())
  after(() => App.stop())

  describe("/oauth", () => {
    describe("/token", () => {
      describe("POST", () => {
        it("Should require a grant_type", async () => {
          const { body, status } = await client(App.http).post("/oauth/token")

          expect(status).to.equal(400)
          expect(body).to.deep.equal({
            code: "BadRequest",
            message: "Some fields are missing or invalid.",
            fields: {
              "query.grant_type": {
                code: "any.required",
                message: '"query.grant_type" is required',
              }
            }
          })
        })

        it("Should require a valid grant_type", async () => {
          const { body, status } = await client(App.http).post("/oauth/token?grant_type=invalid")

          expect(status).to.equal(400)
          expect(body).to.containSubset({
            code: "BadRequest",
            message: "Some fields are missing or invalid.",
            fields: {
              "query.grant_type": {
                code: "any.only",
              }
            }
          })
        })

        describe("grant_type=client_credentials", () => {
          it("Should require a client_id", async () => {
            const { body, status } = await client(App.http).post("/oauth/token?grant_type=client_credentials").send({})

            expect(status).to.equal(400)
            expect(body).to.containSubset({
              code: "BadRequest",
              message: "Some fields are missing or invalid.",
              fields: {
                "body.client_id": {
                  code: "any.required",
                  message: '"body.client_id" is required',
                }
              }
            })
          })

          it("Should return a token", async () => {
            const { body, status } = await client(App.http).post("/oauth/token?grant_type=client_credentials")
                                                           .send({
                                                             client_id: "privap",
                                                             client_secret: "53cr37",
                                                           })

            expect(status).to.equal(200)
            expect(body).to.be.an("object")
                        .that.has.all.keys("access_token", "access_expires")
            expect(body.access_token).to.be.a("string")
            expect(body.access_expires).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
          })
        })

        describe("grant_type=password", () => {
          it("Should require a username", async () => {
            const { body, status } = await client(App.http).post("/oauth/token?grant_type=password")
                                                           .send({
                                                            client_id: "foo",
                                                           })

            expect(status).to.equal(400)
            expect(body).to.containSubset({
              code: "BadRequest",
              message: "Some fields are missing or invalid.",
              fields: {
                "body.username": {
                  code: "any.required",
                  message: '"body.username" is required',
                }
              }
            })
          })
          it("Should require a password", async () => {
            const { body, status } = await client(App.http).post("/oauth/token?grant_type=password")
                                                           .send({
                                                            client_id: "foo",
                                                           })

            expect(status).to.equal(400)
            expect(body).to.containSubset({
              code: "BadRequest",
              message: "Some fields are missing or invalid.",
              fields: {
                "body.password": {
                  code: "any.required",
                  message: '"body.password" is required',
                }
              }
            })
          })

          it("Should return an unauthorized error if the user failed to identify", async () => {
            const { body, status } = await client(App.http).post("/oauth/token?grant_type=password")
                                                           .send({
                                                            client_id: "cyapp",
                                                            username: "alice",
                                                            password: "meh."
                                                           })

            expect(status).to.equal(401)
            expect(body).to.deep.equal({
              code: "Unauthorized",
              message: "We don't know who you are."
            })
          })

          it("Should return a token & refresh token if the user is authenticated", async () => {
            const { body, status } = await client(App.http).post("/oauth/token?grant_type=password")
                                                           .send({
                                                             client_id: "cyapp",
                                                             username: "alice",
                                                             password: "53cr37"
                                                           })

            expect(status).to.equal(200)
            expect(body).to.be.an("object")
                        .that.has.all.keys("access_token", "access_expires", "refresh_token")
            expect(body.access_token).to.be.a("string")
            expect(body.refresh_token).to.be.a("string")
            expect(body.access_expires).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
          })
        })
      })
    })
  })
})
