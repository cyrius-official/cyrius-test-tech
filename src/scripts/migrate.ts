import { MongoClient } from "mongodb"
import amqp from "amqplib"
import Client from "../models/client"

const bump = (version: string, desc: string): string => {
  console.log("               ", version, desc)
  return version
}

const migrate = async () => {
  const client = await MongoClient.connect(process.env.MONGODB_URI!)
  const db = client.db()

  Client.inject(db)

  try {
    const latest = await db.collection("_versions")
                           .findOne({}, { sort: { version: -1 }})
                           .then(d => d?.version)
    console.log("Latest version:", latest)
    let version = latest

    if (!version) { version = bump("0.0.0", "Setup") }

    if (version === "0.0.0") {
      await Promise.all([
        Client.createPrivate({
          cidrs: ["0.0.0.0/0"],
          secret: "53cr37",
          id: "privap"
        }).save(),
        Client.createPrivate({
          cidrs: ["1.2.3.4/32"],
          secret: "53cr37",
          id: "novap"
        }).save(),
        Client.createPublic({
          id: "pubap",
          origins: ["https://pubap.app"],
          redirect_uris: ["https://pubapp.app/_callback"],
          // scopes: ["auth.password"],
        }).save()
      ])
      version = bump("0.1.0", "Create initial clients")
    }

    if (version === latest)
      console.log("Already latest!")
    else {
      await db.collection("_versions")
              .insertOne({ version, date: new Date() })
    }
  }
  finally {
    await client.close()
  }

  const rabbit = await amqp.connect(process.env.RABBIT_URI!)
  const channel = await rabbit.createConfirmChannel()

  try {
    await channel.assertQueue("_versions", { durable: true })
    const latest = await channel.get("_versions").then(msg => !!msg ? JSON.parse(msg.content.toString()).version : null)
    console.log("Latest version:", latest)
    let version = latest

    if (!version) {
      version = bump("0.0.0", "Setup")
    }

    if (version === "0.0.0") {
      await channel.assertExchange("bus", "topic", { durable: true })
      await channel.assertQueue("email.send", { durable: true })
      await channel.bindQueue("email.send", "bus", "email.send")
      version = bump("0.1.0", "Create email ex & q")
    }

    if (version === latest) {
      console.log("Already latest!")
    } else {
      await channel.get("_versions", { noAck: true })
      await channel.sendToQueue("_versions", Buffer.from(JSON.stringify({ version, date: new Date() })), { contentType: "application/json" })
    }
  }
  finally {
    await channel.close()
    await rabbit.close()
  }
}

migrate()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })