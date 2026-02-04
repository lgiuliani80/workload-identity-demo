# Federated Credentials demo

## How to Run the Application

### Prerequisites
- Node.js (version 14 or higher)
- npm

### Installing Dependencies
```bash
npm install
```

### Starting the Application

**Important note**: Before starting the application, you need to configure a private key (see the "Setup and Configuration" section below for details on generating the key).

To start the application in normal mode (with client certificate authentication):
```bash
npm start
```

To start the application in demo mode (without requiring client certificates):
```bash
DEMO_MODE=1 npm start
```

The application will start on port 3001 and will be available at `http://localhost:3001`.

### Available Endpoints
- `GET /version` - Returns the application version
- `GET /headers` - Returns the request headers
- `GET /oauth2/token` - Obtains a JWT token
- `GET /.well-known/jwks.json` - Returns the public keys
- `GET /.well-known/openid-configuration` - Returns the OpenID configuration

## Setup and Configuration

1. Create a User Assigned Managed Identity
2. Deploy this code to a public endpoint
3. Set `ISS_CLAIM` environment variable with the public FQDN of the endpoint (to perform a local test you can as well use a temporary FQDN provided by public services like [ngrok](https://ngrok.com/)) or [devtunnel](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/get-started?tabs=windows).
4. Create a private key (in PKCS#8 format) and put it into file `privatekey_pkcs8.pem` (not encrypted), or set PRIVATE_KEY environment variable or set `PRIVATE_KEY_FILE` environment variable with the path to the private key file.
   Example:

        openssl genpkey -algorithm RSA -out private_key.pem -pkeyopt rsa_keygen_bits:2048
        # Convert from traditional RSA format
        openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in private_key.pem -out privatekey_pkcs8.pem
   
5. [unless DEMO_MODE=1] Export the certificate of your CA to a file and set CA_CERT environment variable to the PEM content of the file OR 
   set CA_CERT_FILE environment variable to the path to the PEM-encoded certificate file. At the moment you need to specify the very CA 
   (top level or intermediate) that actually emitted the certificate used by the client. No support on certificate chains yet.
6. Configure the Federated Credential in the UMI created above setting:
   - "Issuer URL" to the public FQDN of the endpoint
   - "Subject" to "AutoPilot" (or the value of the SUBJECT_CLAIM environment variable)
7. Get a token from this IdP by calling, using a proper client certificate [unless DEMO_MODE=1]:

        GET /oauth2/token

   If you have Powershell (Core) you can use the following command:

        Invoke-WebRequest -Uri https://<fqdn>/oauth2/token -CertificateThumbprint <thumbprint>
        # skip the CertificateThumbprint parameter is DEMO_MODE=1

   assuming the client certificate is in the User o LocalMachine certificate store. You can browse the contents of those stores either via GUI using:

        certmgr.msc
        certlm.msc

   or via Powershell:

        dir cert:\CurrentUser\My
        dir cert:\LocalMachine\My

8. Use the token to call Azure OAuth2 token endpoint for client_credentials with client_assertion grant type:

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
