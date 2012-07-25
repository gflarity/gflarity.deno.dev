The HTTPS system allows you to communicate securely with a server and trust it's idenity. This is how it's generally used. However it's also possible for the server to trust the identity of the client as well. 

It's fairly straight forward to take advantage of this with Node.js, below you will find a simple tutorial for doing just that.


# Keys and Certs

First, you're going to need all your certs and keys. Follow along with the instructions below to do so. It's adapted from [this](http://blog.nategood.com/client-side-certificate-authentication-in-ngi) article. 

Notice the '365'. If you want your keys to valide for longer than a year, change this. 

<pre><code>
# Create the CA Key and Certificate for signing Client Certs
openssl genrsa -des3 -out ca.key 4096
openssl req -new -x509 -days 365 -key ca.key -out ca.crt

# Create the Server Key, CSR (the signing request the CA is given)
openssl genrsa -des3 -out server.key 1024
openssl req -new -key server.key -out server.csr

# You likely want a server key without a passphrase (put the passphrase protected one in your private git repo)
openssl rsa -in server.key -out server.key.pem 

# We're self signing our own server cert here.  This is a no-no in production.
openssl x509 -req -days 365 -in server.csr -CA ca.crt -CAkey ca.key -set_serial 01 -out server.crt

# Create the Client Key and CSR
openssl genrsa -des3 -out client.key 1024
openssl req -new -key client.key -out client.csr

# You likely want a client key without a passphrase for deployment (put the passphrase protected one in your private git repo)
openssl rsa -in client.key -out client.key.pem 

# Sign the client certificate with our CA cert.  Unlike signing our own server cert, this is what we want to do.
openssl x509 -req -days 365 -in client.csr -CA ca.crt -CAkey ca.key -set_serial 01 -out client.crt`
</code></pre>

# Server:

<pre><code>
var https = require('https');
var fs = require('fs');

var options = {
    key: fs.readFileSync('server.key.pem'),
    cert: fs.readFileSync('server.crt'),

    //for client certs, this validates the client                                                                                                                                                           
    ca : [ fs.readFileSync('ca.crt') ],
    requestCert : true,
    rejectUnauthorized: true
};

https.createServer(options, function (req, res) {
    res.writeHead(200);
    res.end("hello world\n");
}).listen(4443);
</code></pre>

# Client:

<pre><code>
var https = require('https');
var fs = require('fs');

var options = {
    host: 'localhost',
    port: 4443,
    path: '/',
    method: 'GET',
    key: fs.readFileSync('client.key.pem'),
    cert: fs.readFileSync('client.crt'),
    ca : [ fs.readFileSync('ca.crt') ],
    requestCert : true,
    rejectUnauthorized: true
};
options.agent = new https.Agent(options);

var req = https.request(options, function(res) {

    console.log('STATUS: ' + res.statusCode);
    console.log('HEADERS: ' + JSON.stringify(res.headers));
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
        console.log('BODY: ' + chunk);
    });
} );

req.end();
</code></pre>
<P>

