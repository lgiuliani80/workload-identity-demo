const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jose = require('jose');
const crypto = require("crypto");
const fs = require('fs');
const fcc = require('./forwarded-client-cert.js');
const app = express();

const subject = process.env.SUBJECT_CLAIM || "AutoPilot";
const iss = process.env.ISS_CLAIM || 
    (process.env.CONTAINER_APP_NAME ? 
        `https://${process.env.CONTAINER_APP_NAME}.${process.env.CONTAINER_APP_ENV_DNS_SUFFIX}` : 
        "http://localhost:3001");
const DEMO_MODE = process.env.DEMO_MODE === "1" || process.env.DEMO_MODE === "true";

var privateKey;
var caCert;

const VERSION = "1.0.231108.4";
const alg = 'RS256';

app.use(cors());
app.use(fcc.forwardedClientCertMiddleware);

app.get('/version', function(req, res) {
    res.json({ version: VERSION });
});

app.get('/headers', function(req, res) {
    res.json(req.headers);
});

app.get('/oauth2/token', async function(req, res) {
    let name = "DEMO_USER";
    
    if (!DEMO_MODE) {
        if (!req.clientCertificate?.Cert) {
            res.status(400).json({ error: "No client certificate provided" });
            return;
        }
        let cert = new crypto.X509Certificate(req.clientCertificate.Cert);
        if (!cert.verify(caCert.publicKey)) {
            res.status(403).json({ error: "Invalid client certificate" });
            return;
        }

        name = cert.subject.split('\n').filter(x => x.startsWith('CN='))[0].substring(3);
    }

    const jwt = await new jose.SignJWT({ 
            'sub': subject, 
            'name': name
        })
        .setProtectedHeader({ alg, typ: 'JWT', kid: '1' })
        .setIssuedAt()
        .setIssuer(iss)
        .setAudience('api://AzureADTokenExchange')
        .setExpirationTime('2h')
        .sign(privateKey);

    res.json({ "access-token": jwt });
});

app.get('/.well-known/jwks.json', async function(req, res) {
    let pk = crypto.createPublicKey({ key: privateKey, format: 'pem' });
    let pkkid1 = pk.export({ format: 'jwk' });
    pkkid1.kid = "1";
    let result =  {
        keys: [
            pkkid1
        ]
    };

    res.json(result);
});

app.get('/.well-known/openid-configuration', async function(req, res) {
    res.json({
        issuer: iss,
        jwks_uri: iss + '/.well-known/jwks.json',
        authorization_endpoint: iss + '/oauth2/authorize',
        token_endpoint: iss + '/oauth2/token',
        response_types_supported: ['token', 'id_token'],
        id_token_signing_alg_values_supported: [alg],
    });
});

loadKey();
app.listen(3001);
console.log("Listening on port 3001....");
console.log("");

async function loadKey() {
    const pkcs8 = process.env.PRIVATE_KEY || fs.readFileSync(process.env.PRIVATE_KEY_PATH || 'privatekey_pkcs8.pem', 'utf8');
    privateKey = await jose.importPKCS8(pkcs8, alg);

    if (!DEMO_MODE) {
        caCert = new crypto.X509Certificate(process.env.CA_CERT || fs.readFileSync(process.env.CA_CERT_PATH || 'ca.cer', 'utf8'));
    }
}
