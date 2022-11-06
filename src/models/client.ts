import type { Db, Filter, FindCursor } from "mongodb"
import { nanoid } from "nanoid"

let __db: Db

type ClientBaseModel = {
  id: string
}

export type PrivateClientModel = {
  type: "private",
  cidrs: string[],
  secret: string,
} & ClientBaseModel

export type PublicClientModel = {
  type: "public",
  origins: string[],
  redirect_uris: string[],
} & ClientBaseModel

export type ClientModel = PrivateClientModel | PublicClientModel


export default class Client {
  private static _collection = "clients"

  static inject(db: Db) { __db = db }

  constructor(private state: ClientModel) {}

  get type() { return this.state.type }
  get origins() {
    if (this.state.type === "private") throw new Error("private clients do not have origins")
    return this.state.origins
  }
  get secret() {
    if (this.state.type === "public") throw new Error("public clients do not have secrets")
    return this.state.secret
  }
  get cidrs() {
    if (this.state.type === "public") throw new Error("public clients do not have cidrs")
    return [ ...this.state.cidrs ]
  }

  async save(): Promise<Client> {
    await __db.collection(Client._collection)
              .updateOne({ id: this.state.id },
                         { $set: this.state },
                         { upsert: true },
                        )
    return this
  }

  static async findOne(query: Filter<ClientModel>): Promise<Client|null> {
    const data = await __db.collection<ClientModel>(Client._collection)
                           .findOne(query)
    return data ? new Client(data) : null
  }

  static find(query: Filter<ClientModel>): FindCursor<Client> {
    const data = __db.collection<ClientModel>(Client._collection)
                           .find(query)
                           .map(d => new Client(d))
    return data
  }

  static createPrivate(data: Omit<PrivateClientModel, "id"|"type"> & { id?: string }): Client {
    return new Client({
      id: nanoid(),
      type: "private",
      ...data,
    })
  }

  static createPublic(data: Omit<PublicClientModel, "id"|"type"> & { id?: string }): Client {
    return new Client({
      id: nanoid(),
      type: "public",
      ...data,
    })
  }
}