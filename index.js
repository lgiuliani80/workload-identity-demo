const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jose = require('jose');
const crypto = require("crypto");
const fs = require('fs');

const app = express();

const name = "Luca Giuliani";
const subject = "AutoPilot";
const iss = "https://9264-79-37-188-180.ngrok.io";

var privateKey;

const alg = 'RS256';

app.use(cors());

app.get('/auth', async function(req, res) {
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
    const pkcs8 = fs.readFileSync('private_key.pem');
    privateKey = await jose.importPKCS8(pkcs8, alg);
}