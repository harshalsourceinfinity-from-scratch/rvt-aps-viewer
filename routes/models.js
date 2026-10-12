
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

const MODELS_DIRECTORY = path.resolve(
    __dirname,
    '..',
    'models'
);


// ==================================================
// PRELOADED APS MODELS
// ==================================================
// These models already exist in APS.
// Keep their existing URNs so they can load directly.
// ==================================================

const PRELOADED_MODELS = {
    'dach-sample-project-2.rvt':
        'dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6a3V1cHY3ZThqcXNiamRlY2dncGV1dmZ1azd1Z25haXdnY3Btenl3bHhtaXV3dnZiLWJhc2ljLWFwcC9kYWNoLXNhbXBsZS1wcm9qZWN0LTIucnZ0',

    'ARSITEKTUR-RUMAH-SEDERHANA.0005.rvt':
        'dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3RzOm9zLm9iamVjdDprdXVwdjdlOGpxc2JqZGVjZ2dwZXV2ZnVrN3VnbmFpd2djcG16eXds eG1pdXd2dmItYmFzaWMtYXBwL0FSU0lURUtUVVItUlVNQUgtU0VERVJIQU5BLjAwMDUucnZ0',

    'LR28159_2025-MALTI-STORY-HOME.rvt':
        'dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6a3V1cHY3ZThqcXNiamRlY2dncGV1dmZ1azd1Z25haXdnY3Btenl3bHhtaXV3dnZiLWJhc2ljLWFwcC9MUjI4MTU5XzIwMjUtTUFMVEktU1RPUlktSE9NRS5ydnQ',

    'AC20-Institute-Var-2.ifc':
        'dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6a3V1cHY3ZThqcXNiamRlY2dncGV1dmZ1azd1Z25haXdnY3Btenl3bHhtaXV3dnZiLWJhc2ljLWFwcC9BQzIwLUluc3RpdHV0ZS1WYXItMi5pZmM',

    'AC20-FZK-Haus.ifc':
        'dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6a3V1cHY3ZThqcXNiamRlY2dncGV1dmZ1azd1Z25haXdnY3Btenl3bHhtaXV3dnZiLWJhc2ljLWFwcC9BQzIwLUZaSy1IYXVzLmlmYw'
};


// ==================================================
// SCAN MODELS DIRECTORY
// ==================================================

function getLocalModels() {
    if (!fs.existsSync(MODELS_DIRECTORY)) {
        return [];
    }

    return fs.readdirSync(MODELS_DIRECTORY, {
        withFileTypes: true
    })
        .filter(entry =>
            entry.isFile() &&
            /\.(rvt|ifc)$/i.test(entry.name)
        )
        .map(entry => ({
            name: entry.name,
            filename: entry.name
        }))
        .sort((a, b) =>
            a.filename.localeCompare(
                b.filename,
                undefined,
                {
                    sensitivity: 'base',
                    numeric: true
                }
            )
        );
}


// ==================================================
// DEFAULT MODEL
// ==================================================

router.get('/api/models/default', (req, res) => {
    res.json({
        urn: APS_DEFAULT_MODEL_URN || null
    });
});


// ==================================================
// UPLOAD ENABLED
// ==================================================

router.get('/api/models/upload-enabled', (req, res) => {
    res.json({
        enabled: APS_ENABLE_UPLOADS
    });
});


// ==================================================
// LOCAL MODEL LIST
// Scan the actual folder on every request.
// ==================================================

router.get('/api/local-models', (req, res) => {
    try {
        const models = getLocalModels().map(model => {
            const urn =
                PRELOADED_MODELS[model.filename] || null;

            return {
                name: model.name,
                filename: model.filename,
                urn,
                preloaded: Boolean(urn)
            };
        });

        console.log(
            `Discovered ${models.length} local model(s):`,
            models.map(model => model.filename)
        );

        res.json(models);
    } catch (error) {
        console.error('Could not scan models folder:', error);

        res.status(500).json({
            error: 'Could not list local models.'
        });
    }
});


// ==================================================
// APS MODEL LIST
// ==================================================

router.get('/api/models', async (req, res, next) => {
    try {
        const objects = await listObjects();

        let models = objects.map(object => ({
            name: object.objectKey,
            urn: urnify(object.objectId)
        }));

        if (
            !APS_ENABLE_MODEL_SELECTION &&
            APS_DEFAULT_MODEL_URN
        ) {
            models = models.filter(
                model => model.urn === APS_DEFAULT_MODEL_URN
            );
        }

        res.json(models);
    } catch (error) {
        next(error);
    }
});


// ==================================================
// LOAD LOCAL MODEL THROUGH APS
// ==================================================

router.post(
    '/api/local-models/load',
    async (req, res, next) => {
        try {
            const filename = req.body?.filename;

            if (
                !filename ||
                path.basename(filename) !== filename ||
                !/\.(rvt|ifc)$/i.test(filename)
            ) {
                return res.status(400).send(
                    'A valid model filename is required.'
                );
            }

            // Only allow files currently in the models folder.
            const localModel = getLocalModels().find(
                model => model.filename === filename
            );

            if (!localModel) {
                return res.status(404).send(
                    'Model not found in the local models folder.'
                );
            }

            // Use an existing preloaded APS model if available.
            const preloadedUrn =
                PRELOADED_MODELS[filename];

            if (preloadedUrn) {
                console.log(
                    `Using preloaded APS model: ${filename}`
                );

                return res.json({
                    name: filename,
                    urn: preloadedUrn,
                    preloaded: true
                });
            }

            const filePath = path.join(
                MODELS_DIRECTORY,
                filename
            );

            // Check whether the model is already in APS.
            const objects = await listObjects();

            const existingObject = objects.find(
                object => object.objectKey === filename
            );

            if (existingObject) {
                const urn = urnify(existingObject.objectId);

                console.log(
                    `Found existing APS model: ${filename}`
                );

                return res.json({
                    name: filename,
                    urn,
                    cached: true
                });
            }

            // Upload the newly discovered local model.
            console.log(`Uploading local model: ${filename}`);

            const object = await uploadObject(
                filename,
                filePath
            );

            const urn = urnify(object.objectId);

            // Start APS translation.
            console.log(`Starting translation: ${filename}`);

            await translateObject(urn);

            res.json({
                name: filename,
                urn,
                cached: false
            });
        } catch (error) {
            console.error(
                'Could not load local model:',
                error
            );

            next(error);
        }
    }
);


// ==================================================
// MODEL TRANSLATION STATUS
// ==================================================

router.get(
    '/api/models/:urn/status',
    async (req, res, next) => {
        try {
            const manifest = await getManifest(
                req.params.urn
            );

            if (!manifest) {
                return res.json({
                    status: 'n/a'
                });
            }

            let messages = [];

            for (const derivative of manifest.derivatives || []) {
                messages = messages.concat(
                    derivative.messages || []
                );

                for (const child of derivative.children || []) {
                    messages = messages.concat(
                        child.messages || []
                    );
                }
            }

            res.json({
                status: manifest.status,
                progress: manifest.progress,
                messages
            });
        } catch (error) {
            next(error);
        }
    }
);


// ==================================================
// MANUAL MODEL UPLOAD
// Keep existing upload workflow.
// ==================================================

router.post(
    '/api/models',
    formidable({
        maxFileSize: Infinity
    }),
    async (req, res, next) => {
        if (!APS_ENABLE_UPLOADS) {
            return res.status(403).send(
                'Model uploads are disabled. Set APS_ENABLE_UPLOADS=true.'
            );
        }

        const file = req.files?.['model-file'];

        if (!file) {
            return res.status(400).send(
                'The required field ("model-file") is missing.'
            );
        }

        try {
            const object = await uploadObject(
                file.name,
                file.path
            );

            const urn = urnify(object.objectId);

            await translateObject(
                urn,
                req.fields?.['model-zip-entrypoint']
            );

            res.json({
                name: object.objectKey,
                urn
            });
        } catch (error) {
            next(error);
        }
    }
);


// ==================================================
// LIST APS URNs FOR LOCAL MODELS
// ==================================================

router.get(
    '/api/local-models/urns',
    async (req, res, next) => {
        try {
            const objects = await listObjects();

            const localFilenames = new Set(
                getLocalModels().map(model => model.filename)
            );

            const models = objects
                .filter(object =>
                    localFilenames.has(object.objectKey)
                )
                .map(object => ({
                    filename: object.objectKey,
                    urn: urnify(object.objectId)
                }));

            res.json(models);
        } catch (error) {
            next(error);
        }
    }
);


module.exports = router;
