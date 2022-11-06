Feature: An app can authenticate

  Context:
  Some operations are not bound to a specific user. For example, an app may
  want to list existing tips (i.e. training chats).

  There can be two kinds of app:
  - private: can keep a secret safe (i.e. a backend) - thus we can provide
    credentials to the app.
    Because a private app is a server, we can filters IP addresses to only
    allow requests from the clients which tries to authenticate. That should
    be enough.
  - public: unable to protect a secret (e.g. a frontend, mobile app) because
    it is downloaded on the client machine and someone can see the secret -
    only cookies can be safely stored on the client (secure / domaine / path
    policies).
    Because a public app may be run from a user's device, the IP filter just
    won't do. Instead, we'll rely on browser's CORS policies


  **NB**
  The migration script creates the following apps:

  |     id |  type   |    cidr    | secret |      origins      |
  | -----: | :-----: | :--------: | :----: | :---------------: |
  | privap | private | 0.0.0.0/0  | 53cr37 |        N/A        |
  |  novap | private | 1.2.3.4/32 | 53cr37 |        N/A        |
  |  pubap | public  |    N/A     |  N/A   | https://pubap.app |
  |  cyapp | public  |    N/A     |  N/A   | https://cyrius.co |

  Rule: A private app requires credentials and CIDR

    Scenario Outline: A private app can authenticate itself
      When An app tries to authenticate with
        | client id     | <id>     |
        | client secret | <secret> |
      Then I receive a <expectation>

      Examples:
        | id      | secret | expectation         |
        | unknown |  meh.  | unauthorized error  |
        | novap   | 53cr37 | unauthorized error  |
        | privap  |  bar   | unauthorized error  |
        | privap  | 53cr37 | successful response |

  Rule: A public app requires CORS policies

    Scenario: Invalid client id
      When An app tries to authenticate with
        | client id | unknown |
      Then I receive a unauthorized error

    Scenario: Invalid CORS policies
      When An app tries to authenticate with
        | client id | pubap |
        | origin    | foo   |
      Then I receive an Access-Control-Allow-Origin header with ""

    Scenario: Valid CORS policies
      When An app tries to authenticate with
        | client id | pubap             |
        | origin    | https://pubap.app |
      Then I receive an Access-Control-Allow-Origin header with "https://pubap.app"

    Scenario: Get a token

  Rule: An app does not receive a refresh_token