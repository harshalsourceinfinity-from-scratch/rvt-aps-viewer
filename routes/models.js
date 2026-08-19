const express = require('express');
const formidable = require('express-formidable');
const { listObjects, uploadObject, translateObject, getManifest, urnify } = require('../services/aps.js');
const { APS_DEFAULT_MODEL_URN, APS_ENABLE_UPLOADS, APS_ENABLE_MODEL_SELECTION } = require('../config.js');

let router = express.Router();

router.get('/api/models/default', function (req, res) {
    res.json({ urn: APS_DEFAULT_MODEL_URN || null });
});

router.get('/api/models/upload-enabled', function (req, res) {
    res.json({ enabled: APS_ENABLE_UPLOADS });
});

router.get('/api/models', async function (req, res, next) {
    try {
        const objects = await listObjects();
        let models = objects.map(o => ({
            name: o.objectKey,
            urn: urnify(o.objectId)
        }));
        if (!APS_ENABLE_MODEL_SELECTION && APS_DEFAULT_MODEL_URN) {
            models = models.filter(model => model.urn === APS_DEFAULT_MODEL_URN);
        }
        res.json(models);
    } catch (err) {
        next(err);
    }
});

router.get('/api/models/:urn/status', async function (req, res, next) {
    try {
        const manifest = await getManifest(req.params.urn);
        if (manifest) {
            let messages = [];
            if (manifest.derivatives) {
                for (const derivative of manifest.derivatives) {
                    messages = messages.concat(derivative.messages || []);
                    if (derivative.children) {
                        for (const child of derivative.children) {
                            messages.concat(child.messages || []);
                        }
                    }
                }
            }
            res.json({ status: manifest.status, progress: manifest.progress, messages });
        } else {
            res.json({ status: 'n/a' });
        }
    } catch (err) {
        next(err);
    }
});

router.post('/api/models', formidable({ maxFileSize: Infinity }), async function (req, res, next) {
    if (!APS_ENABLE_UPLOADS) {
        res.status(403).send('Model uploads are disabled. Set APS_ENABLE_UPLOADS=true for a trusted local administrator.');
        return;
    }
    const file = req.files['model-file'];
    if (!file) {
        res.status(400).send('The required field ("model-file") is missing.');
        return;
    }
    try {
        const obj = await uploadObject(file.name, file.path);
        await translateObject(urnify(obj.objectId), req.fields['model-zip-entrypoint']);
        res.json({
            name: obj.objectKey,
            urn: urnify(obj.objectId)
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
