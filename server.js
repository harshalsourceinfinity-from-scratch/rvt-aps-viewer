const express = require('express');

const {
    PORT
} = require('./config.js');


const app =
    express();


// ==================================================
// BODY PARSERS
// ==================================================

app.use(
    express.json()
);


app.use(
    express.urlencoded({
        extended: true
    })
);


// ==================================================
// STATIC FRONTEND
// ==================================================

app.use(
    express.static(
        'wwwroot'
    )
);


// ==================================================
// APS AUTH
// ==================================================

app.use(
    require('./routes/auth.js')
);


// ==================================================
// MODEL ROUTES
// ==================================================

app.use(
    require('./routes/models.js')
);


// ==================================================
// START SERVER
// ==================================================

app.listen(
    PORT,
    function () {

        console.log(
            `Server listening on port ${PORT}...`
        );

    }
);