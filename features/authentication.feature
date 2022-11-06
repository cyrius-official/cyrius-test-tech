# Feature: As a user, I want to authenticate

#   Context:
#   In order to do something, we need to identify who wants to perform the action
#   and a proof that the user is who he pretends to be (e.g. a password).
#   Though password can get stolen, traffic can be listened to, etc...
#   We need to take that in consideration for this feature.


#   Rule: A user can provide credentials only through our frontend

#     Context:
#     A user trying to authenticate through a backend implies the user provided
#     credentials / secrets to said backend. Unfortunately we cannot trust said
#     backend to keep user credentials safe. If we detect said scenario, we'll
#     disable the app, and urge the user to change credentials.

#     For public app, we can distinguish ours from others'.
#     For starters, only ours can authenticate users using their credentials. In
#     order to do that securely we will assume that CORS are not enough and use
#     both a CSFR token (which will be a hmac of the session cookie, by a secret
#     only known internally), a nonce as well as the referer header (which we will
#     require). [It's a technical test, I'd be happy to talk about that]

#     For other apps, we'll rely on OAuth2 authentication with PKCE.

#     Scenario: 3rd party app - A user asks for an authorization code (invalid redirect)
#       Given a public app exists with
#         | id            | foo                             |
#         | origins       | https://example.com             |
#         | redirect_uris | https://example.com/_authorized |
#       When A user asks for a code with
#         | id               | foo                 |
#         | origin           | https://example.com |
#         | redirect         | https://foo.com     |
#         | challenge        | meh                 |
#         | challenge_method | S256                |
#       Then I receive an unauthorized error

#     Scenario: 3rd party app - A user asks for an authorization code
#       Given a public app exists with
#         | id            | foo                             |
#         | origins       | https://example.com             |
#         | redirect_uris | https://example.com/_authorized |
#       When A user asks for a code with
#         | id                | foo                 |
#         | origin            | https://example.com |
#         | challenge         | meh                 |
#         | challenge_method  | S256                |
#       Then I receive a redirect to our login page

#     Scenario: 3rd party app - Failed PKCE
#       Given a public app exists with
#         | id            | foo                             |
#         | origins       | https://example.com             |
#         | redirect_uris | https://example.com/_authorized |
#       And a user has asked for a code with
#         | challenge        | meh  |
#         | challenge_method | S256 |
#       When an app receives a GET on https://example.com/_authorized with
#         | code | foo |
#       Then The app makes an authentication attempt with
#         | code         | foo |
#         | code_veriier | meh |
#       And recevies an unauthorized error

#     Scenario: 3rd party app - Valid PKCE
#       Given a public app exists with
#         | id            | foo                             |
#         | origins       | https://example.com             |
#         | redirect_uris | https://example.com/_authorized |
#       And a user has asked for a code with
#         | challenge        | 2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae |
#         | challenge_method | S256 |
#       When an app receives a GET on https://example.com/_authorized with
#         | code | foo |
#       Then The app makes an authentication attempt with
#         | code         | foo |
#         | code_veriier | foo |
#       And recevies a successfull response

#     Scenario: Internal app
#       Given a public app exists with
#         | id            | foo                             |
#         | origins       | https://example.com             |
#       And the front has
#         | csrf token     | f9320baf0249169e73850cd6156ded0106e2bb6ad8cab01b7bbbebe6d1065317 |
#         | session cookie | bar |
#         | nonce          | 001 |
#       When A user tries to authenticate
#         | origin | https://example.com |
#         | nonce  | 001                 |
#       Then I receive a successfull response

#   Rule: A user needs to wait a bit before making another connection attempts

#     Context:
#     In order to prevent brute force attacks, each connection attempts must be
#     spaced by 1s, 1s, 30s, 1mn, 5mn, +Infinity, so there can be only six
#     connection attempts before requiring asking to unlock the account.


#   Rule: A user can connect with a magic link

#     Context:
#     When tring to connect, a user only provides his email address, to which
#     we'll send a link that'll allow him to connect.
#     The identification is respected [email address] and the proof is the link
#     only the user has access to since it is sent to his email address. [Yes,
#     I know about DNS spoofing, but it's a technical test, I'd be happy to talk]

#   Rule: A user does not have to reconnect from the same frontend

#     Context:
#     Because authentication is cumbersome, the user must only do it once per
#     frontend. When he closes the tab, the browser, reboot, etc... He must not be
#     disconnected when he comes back, ever.
#     Except if at some point the user disconnected, of course.

#   Rule: A user can disconnect

#     Context:
#     If a user logs in from another not that trustworthy device, he may want to
#     disconnect from the current one.
#     In which case, he won't be able to reconnect from the current device without
#     reauthenticating first.

#   Rule: A user receives an email for connection attempts, successulf or not

#     Context:
#     The user needs to be warned when he was successfully connected so that he
#     can immediately revoke the connection if he suspects something fishy.
#     The user needs to be warned when he was not successfully connected so that
#     he can warn us if he belives his account is under attack.
#     Because we don't want to spam the user, we'll only send one email at the
#     first attempt, and one email at the end of the day with a summary of all
#     subsequent attempts. [NB: if you want to automatically detect the end of the
#     suspected attack, be my guest <3]
