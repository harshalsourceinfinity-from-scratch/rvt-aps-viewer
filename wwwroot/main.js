import {
    initViewer,
    loadModel
} from './viewer.js';


import {
    createVideoEnvironment,
    setEnvironmentEnabled,
    changeEnvironmentVideo,
    playEnvironmentVideo,
    pauseEnvironmentVideo,
    toggleEnvironmentMute
} from './environment.js';


// ==================================================
// ELEMENTS
// ==================================================

const preview =
    document.getElementById('preview');


const modelDropdown =
    document.getElementById('models');


const uploadButton =
    document.getElementById('upload');


const modelInput =
    document.getElementById('input');


const videoDropdown =
    document.getElementById('video-select');


const videoUploadButton =
    document.getElementById('video-upload');


const videoInput =
    document.getElementById('video-input');


const videoUrlButton =
    document.getElementById('video-url');


const environmentButton =
    document.getElementById(
        'environment-toggle'
    );


const playButton =
    document.getElementById(
        'video-play'
    );


const pauseButton =
    document.getElementById(
        'video-pause'
    );


const muteButton =
    document.getElementById(
        'video-mute'
    );


// ==================================================
// LOCAL MODELS
// ==================================================

const LOCAL_MODEL_OPTIONS = [

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
// 360 VIDEOS
// ==================================================

const VIDEO_OPTIONS = [

    {
        name:
            'Christchurch 360°',

        source:
            '/videos/christchurch-360-test.mp4'
    },

    {
        name:
            'Previous Test',

        source:
            '/videos/16092439_3840_2160_30fps.mp4'
    }

];


// ==================================================
// STATE
// ==================================================

let environmentEnabled =
    true;


let videoMuted =
    true;


// ==================================================
// START APPLICATION
// ==================================================

initViewer(
    preview
)
.then(
    async viewer => {


        console.log(
            'APS Viewer initialized.'
        );


        // ==================================================
        // START 360 ENVIRONMENT FIRST
        // ==================================================

        setupVideoOptions();


        createVideoEnvironment(
            preview,
            viewer
        );


        setupEnvironmentControls();


        setupVideoControls();


        // ==================================================
        // LOAD LOCAL MODELS
        // ==================================================

        await setupLocalModels(
            viewer
        );


        // ==================================================
        // MANUAL APS UPLOAD
        // ==================================================

        setupModelUpload(
            viewer
        );


    }
)
.catch(
    error => {

        console.error(
            'Application initialization failed:',
            error
        );

    }
);


// ==================================================
// LOCAL MODEL DROPDOWN
// ==================================================

async function setupLocalModels(
    viewer
) {

    if (
        !modelDropdown
    ) {

        console.error(
            '#models was not found.'
        );

        return;

    }


    try {

        const response =
            await fetch(
                '/api/local-models'
            );


        if (
            !response.ok
        ) {

            throw new Error(
                await response.text()
            );

        }


        const models =
            await response.json();


        modelDropdown.innerHTML =
            '';


        // --------------------------------------------------
        // Add local models
        // --------------------------------------------------

        models.forEach(
            model => {

                const option =
                    document.createElement(
                        'option'
                    );


                option.value =
                    model.filename;


                option.textContent =
                    model.name;


                modelDropdown.appendChild(
                    option
                );

            }
        );


        // --------------------------------------------------
        // Change model
        // --------------------------------------------------

        modelDropdown.addEventListener(
            'change',
            async () => {

                await loadLocalModel(
                    viewer,
                    modelDropdown.value
                );

            }
        );


        // --------------------------------------------------
        // Automatically load first model
        // --------------------------------------------------

        if (
            models.length > 0
        ) {

            await loadLocalModel(
                viewer,
                models[0].filename
            );

        }


    } catch (
        error
    ) {

        console.error(
            'Could not load local model list:',
            error
        );


        showNotification(
            'Could not read the local models folder.'
        );

    }

}


// ==================================================
// LOAD LOCAL MODEL
// ==================================================

async function loadLocalModel(
    viewer,
    filename
) {

    if (
        !filename
    ) {

        return;

    }


    try {

        showNotification(
            `Preparing <strong>${filename}</strong>...`
        );


        // --------------------------------------------------
        // Ask server to upload/find APS model
        // --------------------------------------------------

        const response =
            await fetch(
                '/api/local-models/load',
                {

                    method:
                        'POST',

                    headers: {

                        'Content-Type':
                            'application/json'

                    },

                    body:
                        JSON.stringify({

                            filename

                        })

                }
            );


        if (
            !response.ok
        ) {

            throw new Error(
                await response.text()
            );

        }


        const result =
            await response.json();


        console.log(
            'Local model result:',
            result
        );


        // --------------------------------------------------
        // Wait for translation
        // --------------------------------------------------

        await waitForModelTranslation(
            result.urn
        );


        // --------------------------------------------------
        // Load model
        // --------------------------------------------------

        clearNotification();


        await loadModel(
            viewer,
            result.urn
        );


        console.log(
            `Loaded: ${filename}`
        );


    } catch (
        error
    ) {

        console.error(
            `Could not load ${filename}:`,
            error
        );


        showNotification(
            `Could not load <strong>${filename}</strong>.<br>Check the browser console.`
        );

    }

}


// ==================================================
// WAIT FOR APS TRANSLATION
// ==================================================

async function waitForModelTranslation(
    urn
) {

    while (true) {


        const response =
            await fetch(
                `/api/models/${urn}/status`
            );


        if (
            !response.ok
        ) {

            throw new Error(
                await response.text()
            );

        }


        const status =
            await response.json();


        console.log(
            'Translation status:',
            status
        );


        // --------------------------------------------------
        // READY
        // --------------------------------------------------

        if (
            status.status ===
            'success'
        ) {

            return;

        }


        // --------------------------------------------------
        // FAILED
        // --------------------------------------------------

        if (
            status.status ===
            'failed'
        ) {

            throw new Error(
                JSON.stringify(
                    status.messages
                )
            );

        }


        // --------------------------------------------------
        // IN PROGRESS
        // --------------------------------------------------

        if (
            status.status ===
            'inprogress'
        ) {

            showNotification(
                `Translating BIM model... <strong>${status.progress || ''}</strong>`
            );


            await sleep(
                5000
            );


            continue;

        }


        // --------------------------------------------------
        // NOT AVAILABLE YET
        // --------------------------------------------------

        await sleep(
            3000
        );

    }

}


// ==================================================
// MANUAL MODEL UPLOAD
// ==================================================

function setupModelUpload(
    viewer
) {

    if (
        !uploadButton ||
        !modelInput
    ) {

        return;

    }


    uploadButton.addEventListener(
        'click',
        () => {

            modelInput.click();

        }
    );


    modelInput.addEventListener(
        'change',
        async () => {

            const file =
                modelInput.files[0];


            if (
                !file
            ) {

                return;

            }


            const formData =
                new FormData();


            formData.append(
                'model-file',
                file
            );


            if (
                file.name
                    .toLowerCase()
                    .endsWith('.zip')
            ) {

                const entrypoint =
                    window.prompt(
                        'Enter the main design filename inside the ZIP:'
                    );


                formData.append(
                    'model-zip-entrypoint',
                    entrypoint || ''
                );

            }


            uploadButton.disabled =
                true;


            try {

                showNotification(
                    `Uploading <strong>${file.name}</strong>...`
                );


                const response =
                    await fetch(
                        '/api/models',
                        {

                            method:
                                'POST',

                            body:
                                formData

                        }
                    );


                if (
                    !response.ok
                ) {

                    throw new Error(
                        await response.text()
                    );

                }


                const result =
                    await response.json();


                await waitForModelTranslation(
                    result.urn
                );


                clearNotification();


                await loadModel(
                    viewer,
                    result.urn
                );


            } catch (
                error
            ) {

                console.error(
                    'Manual model upload failed:',
                    error
                );


                showNotification(
                    `Upload failed.<br>${error.message}`
                );

            } finally {

                uploadButton.disabled =
                    false;


                modelInput.value =
                    '';

            }

        }
    );

}


// ==================================================
// VIDEO OPTIONS
// ==================================================

function setupVideoOptions() {

    if (
        !videoDropdown
    ) {

        return;

    }


    videoDropdown.innerHTML =
        '';


    VIDEO_OPTIONS.forEach(
        (video, index) => {

            const option =
                document.createElement(
                    'option'
                );


            option.value =
                video.source;


            option.textContent =
                video.name;


            option.selected =
                index === 0;


            videoDropdown.appendChild(
                option
            );

        }
    );


    videoDropdown.addEventListener(
        'change',
        () => {

            changeEnvironmentVideo(
                videoDropdown.value
            );

        }
    );

}


// ==================================================
// ENVIRONMENT ON / OFF
// ==================================================

function setupEnvironmentControls() {

    if (
        !environmentButton
    ) {

        return;

    }


    environmentButton.textContent =
        'Environment: ON';


    environmentButton.addEventListener(
        'click',
        () => {

            environmentEnabled =
                !environmentEnabled;


            setEnvironmentEnabled(
                environmentEnabled
            );


            environmentButton.textContent =
                environmentEnabled

                    ? 'Environment: ON'

                    : 'Environment: OFF';

        }
    );

}


// ==================================================
// VIDEO CONTROLS
// ==================================================

function setupVideoControls() {


    if (
        playButton
    ) {

        playButton.addEventListener(
            'click',
            () => {

                playEnvironmentVideo();

            }
        );

    }


    if (
        pauseButton
    ) {

        pauseButton.addEventListener(
            'click',
            () => {

                pauseEnvironmentVideo();

            }
        );

    }


    if (
        muteButton
    ) {

        muteButton.addEventListener(
            'click',
            () => {

                videoMuted =
                    toggleEnvironmentMute();


                muteButton.textContent =
                    videoMuted

                        ? '🔇 Muted'

                        : '🔊 Sound';

            }
        );

    }


    // ==================================================
    // UPLOAD VIDEO
    // ==================================================

    if (
        videoUploadButton &&
        videoInput
    ) {

        videoUploadButton.addEventListener(
            'click',
            () => {

                videoInput.click();

            }
        );


        videoInput.addEventListener(
            'change',
            () => {

                const file =
                    videoInput.files[0];


                if (
                    !file
                ) {

                    return;

                }


                const objectUrl =
                    URL.createObjectURL(
                        file
                    );


                const option =
                    document.createElement(
                        'option'
                    );


                option.value =
                    objectUrl;


                option.textContent =
                    `Local: ${file.name}`;


                option.selected =
                    true;


                videoDropdown.appendChild(
                    option
                );


                changeEnvironmentVideo(
                    objectUrl
                );


                videoInput.value =
                    '';

            }
        );

    }


    // ==================================================
    // VIDEO URL
    // ==================================================

    if (
        videoUrlButton
    ) {

        videoUrlButton.addEventListener(
            'click',
            () => {

                const url =
                    window.prompt(
                        'Enter a direct MP4/WebM video URL:'
                    );


                if (
                    !url
                ) {

                    return;

                }


                const option =
                    document.createElement(
                        'option'
                    );


                option.value =
                    url;


                option.textContent =
                    `URL: ${url}`;


                option.selected =
                    true;


                videoDropdown.appendChild(
                    option
                );


                changeEnvironmentVideo(
                    url
                );

            }
        );

    }

}


// ==================================================
// HELPERS
// ==================================================

function sleep(
    milliseconds
) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                milliseconds
            )
    );

}


function showNotification(
    message
) {

    const overlay =
        document.getElementById(
            'overlay'
        );


    if (
        !overlay
    ) {

        return;

    }


    overlay.innerHTML =
        `<div class="notification">${message}</div>`;


    overlay.style.display =
        'flex';

}


function clearNotification() {

    const overlay =
        document.getElementById(
            'overlay'
        );


    if (
        !overlay
    ) {

        return;

    }


    overlay.innerHTML =
        '';


    overlay.style.display =
        'none';

}