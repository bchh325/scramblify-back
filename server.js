require('dotenv').config()

console.log(process.env)

var express = require('express'); // Express web server framework
var cors = require('cors');
var querystring = require('querystring');


const session = require('express-session');
const { FirestoreStore } = require('@google-cloud/connect-firestore');
const { Firestore } = require('@google-cloud/firestore');
const { createHash } = require('crypto')


const client_id = "d559adf71389493dbd4b84821189173a";
const client_secret = "c0cf5ad3734e4e249295db892869ecd5";
const redirect_uri = "http://localhost:3000/";

var generateRandomString = function (length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

generatePair = function () {
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
    resave: false,
    saveUninitialized: true,
}))

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

app.get('/authorize', function (req, res) {
    /*
    */
    // res.redirect('https://accounts.spotify.com/authorize?' +
    // querystring.stringify({
    //   response_type: 'code',
    //   client_id: client_id,
    //   scope: scope,
    //   redirect_uri: redirect_uri,
    //   state: state,
    //   show_dialog: true,
    //   code_challenge_method: "S256",
    //   code_challenge: "",
    // }));
    const { code_verifier, code_challenge } = generatePair()
    if (!req.session.code) {
        req.session.code = "test";
        req.session.code2 = "test2";
    }

    res.send("complete")
})

console.log('Listening on 8888');
app.listen(8888);