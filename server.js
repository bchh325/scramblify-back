require('dotenv').config()

var express = require('express'); // Express web server framework
var cors = require('cors');
var querystring = require('querystring');
var axios = require('axios')

const session = require('express-session');
const { FirestoreStore } = require('@google-cloud/connect-firestore');
const { Firestore } = require('@google-cloud/firestore');
const { createHash } = require('crypto')
const crypto = require('crypto');


const client_id = "d559adf71389493dbd4b84821189173a";
const client_secret = "c0cf5ad3734e4e249295db892869ecd5";
const redirect_uri = "http://localhost:3000/test";

var generateRandomString = function (length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

var generatePair = function () {
    const length = 64;
    var code_verifier = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_.-~';

    for (var i = 0; i < length; i++) {
        code_verifier += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    const hash = createHash('sha256').update(code_verifier).digest()
    const encoded = Buffer.from(hash).toString('base64')
    const code_challenge = encoded.replace(/\+/g, "-").replace(/\//g, "_").replace("=", "")

    console.log(code_verifier)
    console.log(code_challenge)
    return { code_verifier, code_challenge }
}

var generateSession = function () {
    // 16 bytes is likely to be more than enough,
    // but you may tweak it to your needs
    return crypto.randomBytes(16).toString('base64');
};

var encodeIdSecret = function () {
    const pair = `${client_id}:${client_secret}`
    return Buffer.from(pair, "utf8").toString("base64")
}

const projectId = 'scramblify'

const app = express();
app.use(session({
    store: new FirestoreStore({
        dataset: new Firestore({
            projectId,
        }),
        kind: 'express-sessions',
    }),
    secret: 'my-secret',
    resave: true,
    saveUninitialized: false,
}))

app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}))

app.use(express.json())

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

/*
client id, response type (code), redirect uri, state, scope, showdialog, code challenge method, code challenge
*/

/*
grant type: authorization_code,
code: auth code from above
redirect_uri
client id
verifier

headers: authorization
content-type: application/x-www-form-urlencoded
*/
const { code_verifier, code_challenge } = generatePair()

app.get('/authorize', function (req, res) {
    const scope = 'user-read-private user-read-email';
    const state = generateRandomString(16)

    if (!req.session.sessionId) {
        req.session.sessionId = generateSession()
        req.session.codeVerifier = code_verifier;
        req.session.codeChallenge = code_challenge;
    }

    console.log(req.session)
    req.session.save()
    res.cookie("session", req.session.sessionId)
    res.send('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state,
            show_dialog: true,
            code_challenge_method: 'S256',
            code_challenge: req.session.codeChallenge
        }));
})

app.post('/exchange', function (req, res) {
    console.log("EXCHANGE")
    console.log(req.session)
    console.log(req.body)
    const url = "https://accounts.spotify.com/api/token"
    options = {
        method: 'post',
        url: url,
        headers: {
            "Authorization": "Basic " + encodeIdSecret(),
            "Content-Type": "application/x-www-form-urlencoded"
        },
        data: {
            grant_type: "authorization_code",
            code: req.body.auth_code,
            redirect_uri: redirect_uri,
            client_id: client_id,
            code_verifier: req.session.codeVerifier
        }
    }

    axios(options)
        .then(tokens => {
            const data = tokens.data
            console.log("\nSet Tokens to Session\n")
            req.session.accessToken = data["access_token"]
            req.session.refreshToken = data["refresh_token"]
            req.session.save()
            console.log(req.session)
            res.send("complete")
        })
        .catch(err => console.log("SPOTIFY ERROR", err))
})

app.post('/resources', function (req, res) {
    console.log("\nRESOURCES\n")
    console.log(req.session)
    console.log(req.body)

    options = {
        method: 'get',
        url: req.body.reqUrl, //"https://api.spotify.com/v1/me" or other specified endpoint
        headers: {
            "Content-Type": req.body.contType,
            "Authorization": "Bearer " + req.session.accessToken
        }
    }

    axios(options)
        .then(data => {
            console.log("data retreived")
            console.log(data.data)
            res.send(data.data)
        })
        .catch(err => {
            console.log(req.session)
            console.log(`logging error ${err}`)
        })
    // options = {
    //     method: 'post',
    //     url: url,
    //     headers: {
    //         "Authorization": "Basic " + encodeIdSecret(),
    //         "Content-Type": "application/x-www-form-urlencoded"
    //     },
    //     data: {
    //         grant_type: "authorization_code",
    //         code: req.body["auth_code"],
    //         redirect_uri: redirect_uri,
    //         client_id: client_id,
    //         code_verifier: req.session.codeVerifier
    //     }
    // }

    // axios(options)
    //     .then(data => {
    //         if (!req.session.accessToken && !req.session.refreshToken) {
    //             req.session.accessToken = data["access_token"]
    //             req.session.refreshToken = data["refresh_token"]
    //         }
    //     })
    //     .catch(err => console.log("SPOTIFY ERROR", err))
})

console.log('Listening on 8888');
app.listen(8888);