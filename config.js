require('dotenv').config();

let { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_BUCKET, APS_DEFAULT_MODEL_URN, APS_ENABLE_UPLOADS, APS_ENABLE_MODEL_SELECTION, PORT } = process.env;
if (!APS_CLIENT_ID || !APS_CLIENT_SECRET) {
    console.warn('Missing some of the environment variables.');
    process.exit(1);
}
APS_BUCKET = APS_BUCKET || `${APS_CLIENT_ID.toLowerCase()}-basic-app`;
PORT = PORT || 8080;

module.exports = {
    APS_CLIENT_ID,
    APS_CLIENT_SECRET,
    APS_BUCKET,
    APS_DEFAULT_MODEL_URN,
    APS_ENABLE_UPLOADS: APS_ENABLE_UPLOADS === 'true',
    APS_ENABLE_MODEL_SELECTION: APS_ENABLE_MODEL_SELECTION === 'true',
    PORT
};
