const express = require('express');
const formidable = require('express-formidable');
const fs = require('fs');
const path = require('path');

const {
    listObjects,
    uploadObject,
    translateObject,
    getManifest,
    urnify
} = require('../services/aps.js');

const {
    APS_DEFAULT_MODEL_URN,
    APS_ENABLE_UPLOADS,
    APS_ENABLE_MODEL_SELECTION
} = require('../config.js');


const router = express.Router();


// ==================================================
// LOCAL MODEL DIRECTORY
// ==================================================

const MODELS_DIRECTORY =
    path.resolve(
        __dirname,
        '..',
        'models'
    );


// ==================================================
// OUR TWO LOCAL RVT MODELS
// ==================================================

const LOCAL_MODELS = [

    {
        name: 'dach-sample-project.rvt',

        filename:
            'dach-sample-project.rvt'
    },
    {
        name: 'ARSITEKTUR-RUMAH-SEDERHANA.0005.rvt',

        filename:
            'ARSITEKTUR-RUMAH-SEDERHANA.0005.rvt'
    },
    {
        name: 'LR28159_2025-MALTI-STORY-HOME.rvt',

        filename:
            'LR28159_2025-MALTI-STORY-HOME.rvt'
    }

];


// ==================================================
// IN-MEMORY MAP
// ==================================================
//
// Keeps track of local filename → APS URN
// during the current server session.
//
// Example:
//
// "dach-sample-project.rvt"
//        ↓
// "dX...APS URN..."
//
// ==================================================

const localModelMap =
    new Map();


// ==================================================
// DEFAULT MODEL
// ==================================================

router.get(
    '/api/models/default',
    function (req, res) {

        res.json({

            urn:
                APS_DEFAULT_MODEL_URN ||
                null

        });

    }
);


// ==================================================
// UPLOAD ENABLED
// ==================================================

router.get(
    '/api/models/upload-enabled',
    function (req, res) {

        res.json({

            enabled:
                APS_ENABLE_UPLOADS

        });

    }
);


// ==================================================
// LOCAL MODEL LIST
// ==================================================

router.get(
    '/api/local-models',
    function (req, res) {

        try {

            // --------------------------------------------------
            // Make sure folder exists
            // --------------------------------------------------

            if (
                !fs.existsSync(
                    MODELS_DIRECTORY
                )
            ) {

                return res.json([]);

            }


            // --------------------------------------------------
            // Only return the two approved RVT files
            // --------------------------------------------------

            const models =
                LOCAL_MODELS
                    .map(model => {

                        const fullPath =
                            path.join(
                                MODELS_DIRECTORY,
                                model.filename
                            );


                        if (
                            !fs.existsSync(
                                fullPath
                            )
                        ) {

                            console.warn(
                                `Local model not found: ${fullPath}`
                            );

                            return null;

                        }


                        return {

                            name:
                                model.name,

                            filename:
                                model.filename,

                            uploaded:
                                localModelMap.has(
                                    model.filename
                                )

                        };

                    })
                    .filter(Boolean);


            res.json(
                models
            );


        } catch (error) {

            console.error(
                'Could not list local models:',
                error
            );


            res.status(500).json({

                error:
                    'Could not list local models.'

            });

        }

    }
);


// ==================================================
// APS MODEL LIST
// ==================================================
//
// Keep the original endpoint working.
//
// ==================================================

router.get(
    '/api/models',
    async function (req, res, next) {

        try {

            const objects =
                await listObjects();


            let models =
                objects.map(
                    o => ({

                        name:
                            o.objectKey,

                        urn:
                            urnify(
                                o.objectId
                            )

                    })
                );


            if (
                !APS_ENABLE_MODEL_SELECTION &&
                APS_DEFAULT_MODEL_URN
            ) {

                models =
                    models.filter(
                        model =>
                            model.urn ===
                            APS_DEFAULT_MODEL_URN
                    );

            }


            res.json(
                models
            );


        } catch (err) {

            next(err);

        }

    }
);


// ==================================================
// LOCAL MODEL → APS
// ==================================================
//
// This is the important endpoint.
//
// POST:
//
// /api/local-models/load
//
// Body:
//
// {
//     "filename": "dach-sample-project.rvt"
// }
//
// ==================================================

router.post(
    '/api/local-models/load',
    async function (req, res, next) {

        try {

            const filename =
                req.body?.filename;


            // --------------------------------------------------
            // Validate filename
            // --------------------------------------------------

            if (
                !filename
            ) {

                return res
                    .status(400)
                    .send(
                        'The "filename" field is required.'
                    );

            }


            const localModel =
                LOCAL_MODELS.find(
                    model =>
                        model.filename ===
                        filename
                );


            if (
                !localModel
            ) {

                return res
                    .status(404)
                    .send(
                        'Local model is not allowed.'
                    );

            }


            // --------------------------------------------------
            // Build absolute path
            // --------------------------------------------------

            const filePath =
                path.join(
                    MODELS_DIRECTORY,
                    localModel.filename
                );


            // --------------------------------------------------
            // Make sure file exists
            // --------------------------------------------------

            if (
                !fs.existsSync(
                    filePath
                )
            ) {

                return res
                    .status(404)
                    .send(
                        `Local model not found: ${localModel.filename}`
                    );

            }


            // --------------------------------------------------
            // Check memory first
            // --------------------------------------------------

            if (
                localModelMap.has(
                    localModel.filename
                )
            ) {

                const urn =
                    localModelMap.get(
                        localModel.filename
                    );


                console.log(
                    `Using existing local model URN: ${localModel.filename}`
                );


                return res.json({

                    name:
                        localModel.name,

                    urn:

                        urn,

                    cached:
                        true

                });

            }


            // --------------------------------------------------
            // Check APS bucket for existing object
            // --------------------------------------------------

            const objects =
                await listObjects();


            const existingObject =
                objects.find(
                    object =>
                        object.objectKey ===
                        localModel.filename
                );


            if (
                existingObject
            ) {

                const urn =
                    urnify(
                        existingObject.objectId
                    );


                localModelMap.set(
                    localModel.filename,
                    urn
                );


                console.log(
                    `Found existing APS model: ${localModel.filename}`
                );


                return res.json({

                    name:
                        localModel.name,

                    urn:
                        urn,

                    cached:
                        true

                });

            }


            // --------------------------------------------------
            // Upload to APS
            // --------------------------------------------------

            console.log(
                `Uploading local RVT: ${localModel.filename}`
            );


            const object =
                await uploadObject(
                    localModel.filename,
                    filePath
                );


            const urn =
                urnify(
                    object.objectId
                );


            // --------------------------------------------------
            // Save mapping
            // --------------------------------------------------

            localModelMap.set(
                localModel.filename,
                urn
            );


            // --------------------------------------------------
            // Start translation
            // --------------------------------------------------

            console.log(
                `Starting translation: ${localModel.filename}`
            );


            await translateObject(
                urn
            );


            console.log(
                `Translation started: ${localModel.filename}`
            );


            // --------------------------------------------------
            // Return URN
            // --------------------------------------------------

            res.json({

                name:
                    localModel.name,

                urn:
                    urn,

                cached:
                    false

            });


        } catch (err) {

            console.error(
                'Could not load local model:',
                err
            );


            next(err);

        }

    }
);


// ==================================================
// MODEL STATUS
// ==================================================

router.get(
    '/api/models/:urn/status',
    async function (req, res, next) {

        try {

            const manifest =
                await getManifest(
                    req.params.urn
                );


            if (
                manifest
            ) {

                let messages =
                    [];


                if (
                    manifest.derivatives
                ) {

                    for (
                        const derivative
                        of manifest.derivatives
                    ) {

                        messages =
                            messages.concat(
                                derivative.messages ||
                                []
                            );


                        if (
                            derivative.children
                        ) {

                            for (
                                const child
                                of derivative.children
                            ) {

                                messages =
                                    messages.concat(
                                        child.messages ||
                                        []
                                    );

                            }

                        }

                    }

                }


                res.json({

                    status:
                        manifest.status,

                    progress:
                        manifest.progress,

                    messages

                });


            } else {

                res.json({

                    status:
                        'n/a'

                });

            }


        } catch (err) {

            next(err);

        }

    }
);


// ==================================================
// MANUAL MODEL UPLOAD
// ==================================================

router.post(
    '/api/models',
    formidable({
        maxFileSize: Infinity
    }),
    async function (req, res, next) {

        if (
            !APS_ENABLE_UPLOADS
        ) {

            res
                .status(403)
                .send(
                    'Model uploads are disabled. Set APS_ENABLE_UPLOADS=true.'
                );

            return;

        }


        const file =
            req.files['model-file'];


        if (
            !file
        ) {

            res
                .status(400)
                .send(
                    'The required field ("model-file") is missing.'
                );

            return;

        }


        try {

            const obj =
                await uploadObject(
                    file.name,
                    file.path
                );


            await translateObject(

                urnify(
                    obj.objectId
                ),

                req.fields[
                    'model-zip-entrypoint'
                ]

            );


            res.json({

                name:
                    obj.objectKey,

                urn:
                    urnify(
                        obj.objectId
                    )

            });


        } catch (err) {

            next(err);

        }

    }
);


module.exports = router;