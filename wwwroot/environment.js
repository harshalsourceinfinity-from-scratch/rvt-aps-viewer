// ==================================================
// 360° VIDEO ENVIRONMENT
// ==================================================

let container = null;

let viewer = null;

let scene = null;

let camera = null;

let renderer = null;

let video = null;

let videoTexture = null;

let sphere = null;

let initialized = false;

let enabled = true;

let currentVideoSource = null;


// ==================================================
// CREATE ENVIRONMENT
// ==================================================

export function createVideoEnvironment(
    targetContainer,
    viewerInstance
) {

    container =
        targetContainer;

    viewer =
        viewerInstance;


    console.log(
        'Creating 360° environment...'
    );


    createVideo(
        '/videos/christchurch-360-test.mp4'
    );

}


// ==================================================
// CREATE VIDEO
// ==================================================

function createVideo(source) {

    currentVideoSource =
        source;


    if (video) {

        try {

            video.pause();

        } catch (error) {

            console.warn(error);

        }

    }


    video =
        document.createElement('video');


    video.src =
        source;


    video.loop =
        true;


    video.muted =
        true;


    video.playsInline =
        true;


    video.crossOrigin =
        'anonymous';


    video.preload =
        'auto';


    video.addEventListener(
        'loadeddata',
        onVideoLoaded,
        {
            once: true
        }
    );


    video.addEventListener(
        'error',
        () => {

            console.error(
                'Could not load 360 video:',
                source,
                video.error
            );

        }
    );


    video.load();


    video.play().catch(
        () => {

            console.log(
                'Autoplay blocked. Press Play.'
            );

        }
    );

}


// ==================================================
// VIDEO LOADED
// ==================================================

function onVideoLoaded() {

    console.log(
        '360 video loaded:',
        currentVideoSource
    );


    if (!initialized) {

        initializeEnvironment();

    } else {

        replaceVideoTexture();

    }

}


// ==================================================
// INITIALIZE
// ==================================================

function initializeEnvironment() {

    if (initialized) {

        return;

    }


    if (!container) {

        console.error(
            'Environment container is missing.'
        );

        return;

    }


    // ==================================================
    // SCENE
    // ==================================================

    scene =
        new THREE.Scene();


    // ==================================================
    // CAMERA
    // ==================================================

    const width =
        container.clientWidth ||
        window.innerWidth;


    const height =
        container.clientHeight ||
        window.innerHeight;


    camera =
        new THREE.PerspectiveCamera(

            75,

            width / height,

            0.1,

            20000

        );


    camera.position.set(
        0,
        0,
        0
    );


    // ==================================================
    // RENDERER
    // ==================================================

    renderer =
        new THREE.WebGLRenderer({

            antialias: true,

            alpha: true

        });


    renderer.setPixelRatio(
        Math.min(
            window.devicePixelRatio,
            2
        )
    );


    renderer.setSize(
        width,
        height
    );


    renderer.setClearColor(
        0x000000,
        0
    );


    // ==================================================
    // CANVAS
    // ==================================================

    const canvas =
        renderer.domElement;


    canvas.className =
        'environment-canvas';


    canvas.style.position =
        'absolute';


    canvas.style.top =
        '0';


    canvas.style.left =
        '0';


    canvas.style.width =
        '100%';


    canvas.style.height =
        '100%';


    canvas.style.zIndex =
        '0';


    canvas.style.pointerEvents =
        'none';


    container.appendChild(
        canvas
    );


    // ==================================================
    // VIDEO TEXTURE
    // ==================================================

    videoTexture =
        new THREE.VideoTexture(
            video
        );


    videoTexture.minFilter =
        THREE.LinearFilter;


    videoTexture.magFilter =
        THREE.LinearFilter;


    videoTexture.generateMipmaps =
        false;


    // ==================================================
    // SPHERE
    // ==================================================

    const geometry =
        new THREE.SphereGeometry(

            10000,

            64,

            64

        );


    const material =
        new THREE.MeshBasicMaterial({

            map:
                videoTexture,

            side:
                THREE.BackSide,

            depthWrite:
                false,

            depthTest:
                false

        });


    sphere =
        new THREE.Mesh(
            geometry,
            material
        );


    sphere.name =
        '360VideoEnvironment';


    scene.add(
        sphere
    );


    // ==================================================
    // SYNC CAMERA
    // ==================================================

    if (viewer) {

        viewer.addEventListener(

            Autodesk.Viewing
                .CAMERA_CHANGE_EVENT,

            syncCamera

        );


        syncCamera();

    }


    // ==================================================
    // RESIZE
    // ==================================================

    window.addEventListener(
        'resize',
        resizeEnvironment
    );


    initialized =
        true;


    animate();


    console.log(
        '360° environment initialized successfully.'
    );

}


// ==================================================
// REPLACE VIDEO
// ==================================================

function replaceVideoTexture() {

    if (
        !video ||
        !sphere
    ) {

        return;

    }


    if (videoTexture) {

        videoTexture.dispose();

    }


    videoTexture =
        new THREE.VideoTexture(
            video
        );


    videoTexture.minFilter =
        THREE.LinearFilter;


    videoTexture.magFilter =
        THREE.LinearFilter;


    videoTexture.generateMipmaps =
        false;


    sphere.material.map =
        videoTexture;


    sphere.material.needsUpdate =
        true;


    console.log(
        '360 environment video changed.'
    );

}


// ==================================================
// SYNC CAMERA
// ==================================================

function syncCamera() {

    if (
        !viewer ||
        !camera ||
        !sphere
    ) {

        return;

    }


    const viewerCamera =
        viewer.getCamera();


    if (!viewerCamera) {

        return;

    }


    camera.quaternion.copy(
        viewerCamera.quaternion
    );


    sphere.position.copy(
        viewerCamera.position
    );


    if (
        typeof viewerCamera.fov ===
        'number'
    ) {

        camera.fov =
            viewerCamera.fov;


        camera.updateProjectionMatrix();

    }

}


// ==================================================
// RENDER LOOP
// ==================================================

function animate() {

    requestAnimationFrame(
        animate
    );


    if (
        !renderer ||
        !scene ||
        !camera
    ) {

        return;

    }


    if (!enabled) {

        return;

    }


    renderer.render(
        scene,
        camera
    );

}


// ==================================================
// ON/OFF
// ==================================================

export function setEnvironmentEnabled(
    value
) {

    enabled =
        Boolean(value);


    if (!renderer) {

        return;

    }


    renderer.domElement.style.display =
        enabled
            ? 'block'
            : 'none';


    console.log(
        'Environment:',
        enabled
            ? 'ON'
            : 'OFF'
    );

}


// ==================================================
// CHANGE VIDEO
// ==================================================

export function changeEnvironmentVideo(
    source
) {

    if (!source) {

        return;

    }


    console.log(
        'Changing environment video:',
        source
    );


    createVideo(
        source
    );

}


// ==================================================
// PLAY
// ==================================================

export function playEnvironmentVideo() {

    if (!video) {

        return;

    }


    video.play().catch(
        error => {

            console.warn(
                'Play failed:',
                error
            );

        }
    );

}


// ==================================================
// PAUSE
// ==================================================

export function pauseEnvironmentVideo() {

    if (video) {

        video.pause();

    }

}


// ==================================================
// MUTE
// ==================================================

export function toggleEnvironmentMute() {

    if (!video) {

        return true;

    }


    video.muted =
        !video.muted;


    return video.muted;

}


// ==================================================
// RESIZE
// ==================================================

function resizeEnvironment() {

    if (
        !renderer ||
        !camera ||
        !container
    ) {

        return;

    }


    const width =
        container.clientWidth;


    const height =
        container.clientHeight;


    if (
        width <= 0 ||
        height <= 0
    ) {

        return;

    }


    camera.aspect =
        width / height;


    camera.updateProjectionMatrix();


    renderer.setSize(
        width,
        height
    );

}