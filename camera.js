

const runCode = async () => {
    const cameraElement = document.querySelector('#camera');
    // await user permission for camera
    const permission = await navigator.permissions.query({
        name: 'camera'
    });
    if (permission.state === 'prompt') {
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        alert('Your Camera is now active')
        return
    }
    if (permission.state === 'denied') {
        window.alert('Camera permision denied')
    }

    const startCamera = async () => {
        const videoElement = document.createElement('video');
        videoElement.setAttribute('autoplay', true);
        // videoElement.setAttribute('mute', true);
        videoElement.setAttribute('style', 'height: 200px; transform: scaleX(-1);');
        cameraElement.appendChild(videoElement);

        const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        videoElement.srcObject = cameraStream;
    }
    startCamera()
}

runCode()