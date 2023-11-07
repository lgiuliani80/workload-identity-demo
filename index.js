const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jose = require('jose');
const crypto = require("crypto");
const fs = require('fs');
const fcc = require('./forwarded-client-cert.js');
const app = express();

const name = process.env.NAME_CLAIM;
const subject = process.env.SUBJECT_CLAIM || "AutoPilot";
const iss = process.env.ISS_CLAIM;

var privateKey;
var caCert;

const VERSION = "1.0.231107.5";
const alg = 'RS256';

app.use(cors());
app.use(fcc.forwardedClientCertMiddleware);

app.get('/version', function(req, res) {
    res.json({ version: VERSION });
});

app.get('/headers', function(req, res) {
    res.json(req.headers);
});

app.get('/cert', function(req, res) {
    let cert = new crypto.X509Certificate(req.clientCertificate.Cert);
    console.log(cert.verify(caCert.publicKey));
    console.log(cert.issuer);
    res.json(cert.toJSON());
});

app.get('/oauth2/token', async function(req, res) {
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
    const pkcs8 = process.env.PRIVATE_KEY || fs.readFileSync(process.env.PRIVATE_KEY_PATH || 'privatekey.pem', 'utf8');
    privateKey = await jose.importPKCS8(pkcs8, alg);

    caCert = new crypto.X509Certificate(process.env.CA_CERT || fs.readFileSync(process.env.CA_CERT_PATH || 'ca.cer', 'utf8'));
}