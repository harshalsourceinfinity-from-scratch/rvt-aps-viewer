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
// LOCAL MODELS
// ==================================================

const LOCAL_MODELS = [

    {
        name: 'ARSITEKTUR-RUMAH-SEDERHANA.0005.rvt',
        filename: 'ARSITEKTUR-RUMAH-SEDERHANA.0005.rvt'
    },

    {
        name: 'dach-sample-project-2.rvt',
        filename: 'dach-sample-project-2.rvt'
    },

    {
        name: 'LR28159_2025-MALTI-STORY-HOME.rvt',
        filename: 'LR28159_2025-MALTI-STORY-HOME.rvt'
    },

    {
        name: 'AC20-Institute-Var-2.ifc',
        filename: 'AC20-Institute-Var-2.ifc'
    },

    {
        name: 'AC20-FZK-Haus.ifc',
        filename: 'AC20-FZK-Haus.ifc'
    }

];


// ==================================================
// PRELOADED APS MODELS
// ==================================================
//
// These models have already been uploaded and
// translated in Autodesk Platform Services.
//
// Therefore the browser can load them directly
// using their existing URN.
//
// No upload.
// No translation.
// No translation polling.
// ==================================================

const PRELOADED_MODELS = {

    'dach-sample-project-2.rvt':
        'dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6a3V1cHY3ZThqcXNiamRlY2dncGV1dmZ1azd1Z25haXdnY3Btenl3bHhtaXV3dnZiLWJhc2ljLWFwcC9kYWNoLXNhbXBsZS1wcm9qZWN0LTIucnZ0',

    'ARSITEKTUR-RUMAH-SEDERHANA.0005.rvt':
        'dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6a3V1cHY3ZThqcXNiamRlY2dncGV1dmZ1azd1Z25haXdnY3Btenl3bHhtaXV3dnZiLWJhc2ljLWFwcC9BUlNJVEVLVFVSLVJVTUFILVNFREVSSEFOQS4wMDA1LnJ2dA',

    'LR28159_2025-MALTI-STORY-HOME.rvt':
        'dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6a3V1cHY3ZThqcXNiamRlY2dncGV1dmZ1azd1Z25haXdnY3Btenl3bHhtaXV3dnZiLWJhc2ljLWFwcC9MUjI4MTU5XzIwMjUtTUFMVEktU1RPUlktSE9NRS5ydnQ',

    'AC20-Institute-Var-2.ifc':
        'dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6a3V1cHY3ZThqcXNiamRlY2dncGV1dmZ1azd1Z25haXdnY3Btenl3bHhtaXV3dnZiLWJhc2ljLWFwcC9BQzIwLUluc3RpdHV0ZS1WYXItMi5pZmM',

    'AC20-FZK-Haus.ifc':
        'dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6a3V1cHY3ZThqcXNiamRlY2dncGV1dmZ1azd1Z25haXdnY3Btenl3bHhtaXV3dnZiLWJhc2ljLWFwcC9BQzIwLUZaSy1IYXVzLmlmYw'

};


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

            if (
                !fs.existsSync(
                    MODELS_DIRECTORY
                )
            ) {

                return res.json([]);

            }


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


                        const urn =
                            PRELOADED_MODELS[
                                model.filename
                            ] || null;


                        return {

                            name:
                                model.name,

                            filename:
                                model.filename,

                            urn:
                                urn,

                            preloaded:
                                Boolean(urn)

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
// LOCAL MODEL → APS FALLBACK
// ==================================================
//
// This endpoint is kept for compatibility.
//
// Preloaded models should NOT normally reach this
// endpoint because main.js will use their URN directly.
//
// If a local model has no preloaded URN, this route
// can still upload/translate it.
// ==================================================

router.post(
    '/api/local-models/load',
    async function (req, res, next) {

        try {

            const filename =
                req.body?.filename;


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
            // PRELOADED MODEL
            // --------------------------------------------------

            const preloadedUrn =
                PRELOADED_MODELS[
                    filename
                ];


            if (
                preloadedUrn
            ) {

                console.log(
                    `Using preloaded APS model: ${filename}`
                );


                return res.json({

                    name:
                        localModel.name,

                    urn:
                        preloadedUrn,

                    preloaded:
                        true

                });

            }


            // --------------------------------------------------
            // Local file path
            // --------------------------------------------------

            const filePath =
                path.join(
                    MODELS_DIRECTORY,
                    localModel.filename
                );


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
            // Check APS bucket
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
            // Upload
            // --------------------------------------------------

            console.log(
                `Uploading local model: ${localModel.filename}`
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
            // Translate
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
//
// DO NOT CHANGE THIS WORKFLOW.
//
// User uploads:
//
// RVT / IFC / ZIP
//
// ↓
//
// APS upload
//
// ↓
//
// APS translation
//
// ↓
//
// Viewer
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

// ==================================================
// GET PRELOADED MODEL URNs
// ==================================================

router.get(
    '/api/local-models/urns',
    async function (req, res, next) {

        try {

            const objects =
                await listObjects();

            const models =
                objects
                    .filter(object =>
                        [
                            'dach-sample-project-2.rvt',
                            'ARSITEKTUR-RUMAH-SEDERHANA.0005.rvt',
                            'LR28159_2025-MALTI-STORY-HOME.rvt',
                            'AC20-Institute-Var-2.ifc',
                            'AC20-FZK-Haus.ifc'
                        ].includes(
                            object.objectKey
                        )
                    )
                    .map(object => ({

                        filename:
                            object.objectKey,

                        urn:
                            urnify(
                                object.objectId
                            )

                    }));


            res.json(models);

        } catch (error) {

            next(error);

        }

    }
);

module.exports = router;