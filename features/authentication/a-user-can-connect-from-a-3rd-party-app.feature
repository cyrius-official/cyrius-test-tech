Feature: As a user, I can connect from a 3rd party app

  Context:
  A third party app will act on behalf of a user,
  thus the user must be able to delegate some of his permissions
  to the app, without revealing the his secrets (i.e. credentials).
  That's where OAuth2 with PCKE comes to play.

  Basically the protocol goes as follow:

  ```mermaid
  sequenceDiagram
    actor       user
    participant rd as 3rd party
    participant cyrius

    user ->>+ rd: authenticate w/ cyrius
      rd ->>+ cyrius: /oauth/authorize
        note right of cyrius: { client_id, state, code_challenge, code_method }
      cyrius -->>- user: redirect /login
      user ->>+ cyrius: credentials
      cyrius -->>- user: redirect 3rd party + code + state
      user ->> rd: follow
      rd ->>+ cyrius: /oauth/token
        note right of cyrius: { client_id, code, code_verifier }
        cyrius ->> cyrius: code_challenge == code_method(code_verifier)

        cyrius --x rd: 401

      cyrius -->>- rd: token
    rd -->>- user: Authenticated
  ```

  ###
  #   Hello again, it seems when the intern failed his rebase
  #   he also removed these scenarii.
  #
  #   The PCKE requires a code_challenge which is a code_verifier
  #   hashed by the code_method.
  #   The method we'll use is S256 (aka sha256)
  #   At the begining, one sends the hash and the method
  #   To validate the code, one sends the clear value.
  #   Because the server already know the hash & method, it can
  #   use those to verify the front which tries to retrieve a token
  #   from a code, is actually the one who also made the authorization
  #   call.
  #
  #   I do believe you have everything you need to make your own.
  #   Oh and don't forget to send an email to the user
  ###
