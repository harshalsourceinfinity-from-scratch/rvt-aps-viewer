// ==================================================
// APS ACCESS TOKEN
// ==================================================

async function getAccessToken(callback) {

    try {

        const response =
            await fetch('/api/auth/token');


        if (!response.ok) {

            throw new Error(
                await response.text()
            );

        }


        const {
            access_token,
            expires_in
        } =
            await response.json();


        callback(
            access_token,
            expires_in
        );


    } catch (error) {

        console.error(
            'Access token error:',
            error
        );

    }

}


// ==================================================
// INITIALIZE APS VIEWER
// ==================================================

export function initViewer(container) {

    return new Promise(
        (resolve, reject) => {


            // ==================================================
            // ENABLE TRANSPARENT VIEWER BACKGROUND
            // MUST HAPPEN BEFORE VIEWER INITIALIZATION
            // ==================================================

            if (
                Autodesk.Viewing.Private &&
                Autodesk.Viewing.Private.InitParametersSetting
            ) {

                Autodesk.Viewing.Private
                    .InitParametersSetting
                    .alpha = true;

            }


            // ==================================================
            // INITIALIZE APS
            // ==================================================

            Autodesk.Viewing.Initializer(

                {
                    env: 'AutodeskProduction',
                    getAccessToken
                },

                () => {


                    // ==================================================
                    // CREATE VIEWER
                    // ==================================================

                    const viewer =
                        new Autodesk.Viewing.GuiViewer3D(
                            container,
                            {
                                extensions: [
                                    'Autodesk.DocumentBrowser'
                                ]
                            }
                        );


                    // ==================================================
                    // START
                    // ==================================================

                    const started =
                        viewer.start();


                    if (started > 0) {

                        reject(
                            new Error(
                                `Viewer failed to start: ${started}`
                            )
                        );

                        return;

                    }


                    // ==================================================
                    // LIGHT THEME
                    // ==================================================

                    viewer.setTheme(
                        'light-theme'
                    );


                    // ==================================================
                    // MAKE APS CANVAS TRANSPARENT
                    // ==================================================

                    try {

                        const renderer =
                            viewer.impl.renderer();


                        if (renderer) {

                            if (
                                renderer.setClearAlpha
                            ) {

                                renderer.setClearAlpha(
                                    0
                                );

                            }


                            if (
                                renderer.setClearColor
                            ) {

                                renderer.setClearColor(
                                    0x000000,
                                    0
                                );

                            }

                        }

                    } catch (error) {

                        console.warn(
                            'Could not make APS renderer transparent:',
                            error
                        );

                    }


                    // ==================================================
                    // FORCE RENDER
                    // ==================================================

                    viewer.impl.invalidate(
                        true,
                        true,
                        true
                    );


                    console.log(
                        'APS Viewer initialized successfully.'
                    );


                    resolve(
                        viewer
                    );

                }

            );

        }
    );

}


// ==================================================
// LOAD MODEL
// ==================================================

export function loadModel(
    viewer,
    urn
) {

    return new Promise(
        (resolve, reject) => {


            function onDocumentLoadSuccess(doc) {

                console.log(
                    'BIM model loaded.'
                );


                const model =
                    viewer.loadDocumentNode(
                        doc,
                        doc
                            .getRoot()
                            .getDefaultGeometry()
                    );


                resolve(
                    model
                );

            }


            function onDocumentLoadFailure(
                code,
                message,
                errors
            ) {

                console.error(
                    'BIM model loading failed:',
                    code,
                    message,
                    errors
                );


                reject(
                    new Error(
                        `${code}: ${message}`
                    )
                );

            }


            viewer.setLightPreset(
                0
            );


            Autodesk.Viewing.Document.load(

                'urn:' + urn,

                onDocumentLoadSuccess,

                onDocumentLoadFailure

            );

        }
    );

}