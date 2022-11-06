Format: 1A

Cyrius API
==========

# Group OAuth

## Authenticate [/oauth/token{?grant_type}]

### Authenticate [POST]

- Parameters
  + grant_type: `client_credentials` (string, required) - The grant type


+ Request grant_type=client_credentials

    |         Field |   Type   |     Meta     | Description       |
    | ------------: | :------: | :----------: | :---------------- |
    |     client_id | `string` | **required** | The client id     |
    | client_secret | `string` |  _optional_  | The client secret |

    + body

            {
              "client_id": "app",
              "client_secret": "53cr37"
            }

+ Request grant_type=password

    |         Field |   Type   |     Meta     | Description       |
    | ------------: | :------: | :----------: | :---------------- |
    |     client_id | `string` | **required** | The client id     |
    | client_secret | `string` |  _optional_  | The client secret |
    |      username | `string` | **required** | The username      |
    |      password | `string` | **required** | The password      |

    + body

            {
              "client_id": "app",
              "client_secret": "53cr37",
              "username": "john",
              "password": "doe"
            }


+ Response 200 (application/json)

  Note: Only user authentication returns a `refresh_token`.

  |           Field |         Type          |        Meta         | Description                       |
  | --------------: | :-------------------: | :-----------------: | :-------------------------------- |
  |    access_token |       `string`        |    **requried**     | The Bearer token                  |
  |  access_expires | UTC ISO 8601 DateTime |    **required**     | The access token expiration date  |
  |   refresh_token |       `string`        | grant_type=password | The refresh token                 |

  + Body

            {
              access_token: "lk45h3kj45",
              access_expires: "2010-11-12T13:14:15.016Z"
              refresh_token: "lkewjlk;jrtl;kj",
            }

+ Response 400

  > Some fields are missing or invalid.

  Make sure you:
  - [ ] provided all required fields
  - [ ] all provided fields are valid


  + Body

            {
              "code": "badrequest",
              "message": "Some fields are missing or invalid."
              "fields": {
                "<path>": {
                  "code": "<code>",
                  "message": "<message>"
                }
              }
            }

+ Response 401

  > We don't know who you are

  Make sure you:
  - [ ] provided valid credentials
  - [ ] credentials have not expired

  + Body

            {
              "code": "unauthorized",
              "message": "We don't know who you are."
            }
