Feature: A user can authenticate with his credentials

  Context:
  A user trying to authenticate through a backend implies the user provided
  credentials / secrets to said backend. Unfortunately we cannot trust said
  backend to keep user credentials safe. If we detect said scenario, we'll
  and urge the user to change credentials.

  For public app, we can distinguish ours from others'.
  For starters, only ours can authenticate users using their credentials.
  For the sake of this exercise, we'll assume CORS are secure enough.

  For other apps, we'll rely on OAuth2 authentication with PKCE, thus
  we'll prohibit any app to authenticate a user with his credentials.

  **Note**:
  The migration script creates the following apps:

  |     id |  type   |    cidr    | secret |      origins      |
  | -----: | :-----: | :--------: | :----: | :---------------: |
  | privap | private | 0.0.0.0/0  | 53cr37 |        N/A        |
  |  novap | private | 1.2.3.4/32 | 53cr37 |        N/A        |
  |  pubap | public  |    N/A     |  N/A   | https://pubap.app |
  |  cyapp | public  |    N/A     |  N/A   | https://cyrius.co |

  And the following user
  |    id | username | password |      email      |
  | ----: | :------: | :------: | :-------------: |
  | alice |  alice   |  53cr37  | alice@cyrius.co |

  Rule: A private app cannot authenticate a user

    Scenario: A private app tries to authenticate the user
      When A user tries to authenticate from privap
        | username      | alice  |
        | password      | 53cr37 |
      Then I receive an unauthorized error
      And an "intrusion_alert" email is sent to alice

  Rule: An internal public app can authenticate a user

    Scenario: An internal app can authenticate a user
      When A user tries to authenticate from cyapp
        | username | alice  |
        | password | 53cr37 |
      Then I receive a token
      And I receive a refresh token

    Scenario: credentials do not match
      When A user tries to authenticate from cyapp
        | username | alice |
        | password | meh.  |
      Then I receive an unauthorized error
      And an "intrusion_alert" email is sent to alice

  Rule: A 3rd party public app cannot authenticate a user

    Scenario: A 3rd party app tries to authenticate a user
      When A user tries to authenticate from pubap
        | username | alice  |
        | password | 53cr37 |
      Then I receive an unauthorized error
      And an "intrusion_alert" email is sent to alice
