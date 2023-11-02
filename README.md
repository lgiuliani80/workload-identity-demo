# Workload identity demo

1. Creare a User Assigned Managed Identity
2. Deploy this code to a public endpoint
3. Update "iss" in index.js with the public FQDN of the endpoint
4. Create a private key and put it into file privatekey.pem (not encrypted)
5. Configure the Federated Credential in the UMI created above setting:
   - "Issuer URL" to the public FQDN of the endpoint
   - "Subject" to "AutoPilot" (or whatever value to assign "subject" to in index.js)
6. Get a token from this IdP by calling:

        GET /auth

7. Use the token to call Azure OAuth2 token endpoint for client_credentials with client_assertion grant type:

        POST https://login.microsoftonline.com/<tenant>/oauth2/v2.0/token
        Content-Type: application/x-www-form-urlencoded

        grant_type=client_credentials
        &client_id=<client_id_of_the_managed_identity>
        &client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer
        &client_assertion=<token from step 6>
        &scope=https://graph.microsoft.com/.default

    Replace `<tenant>` with your tenant ID and `<client_id>` with the client ID of the app registration you want to get a token for.  
    Set `<scope>` to the scope you want to get a token for.

8. Use the access token to call the Graph API (or whatever API you want to call)
