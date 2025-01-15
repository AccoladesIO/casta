

//

const cameraId = 'castaCamera';

const camera = document.getElementById(cameraId);

if (camera) {
    console.log('camera found', camera);
} else {
    const cameraElement = document.createElement('iframe');
    cameraElement.id = cameraId;
    cameraElement.setAttribute('allow', 'camera; microphone');
    cameraElement.src = chrome.runtime.getURL('camera.html')
    cameraElement.setAttribute('style', 'position: fixed; top: 50px; left: 50px; width: 200px; height: 200px; background-color: rgba(0, 0, 0, 0.5); z-index: 9999; border-radius: 50%; ');
    document.body.appendChild(cameraElement);
}