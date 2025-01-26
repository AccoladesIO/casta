const initializeCamera = async () => {
    const cameraContainer = document.querySelector('#camera');

    if (!cameraContainer) {
        console.error('Camera container element not found');
        return;
    }

    // Check and request camera permission
    const cameraPermission = await navigator.permissions.query({ name: 'camera' });

    if (cameraPermission.state === 'prompt') {
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            alert('Camera is now active.');
        } catch (error) {
            console.error('Error accessing the camera:', error);
            alert('Unable to activate the camera.');
            return;
        }
    }

    if (cameraPermission.state === 'denied') {
        alert('Camera permission denied.');
        return;
    }

    const activateCamera = async () => {
        try {
            const videoElement = document.createElement('video');
            videoElement.setAttribute('autoplay', 'true');
            videoElement.style.cssText = 'height: 200px; transform: scaleX(-1);';
            cameraContainer.appendChild(videoElement);

            const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            videoElement.srcObject = cameraStream;
        } catch (error) {
            console.error('Error starting the camera:', error);
        }
    };

    await activateCamera();
};

initializeCamera();
