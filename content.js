//This content.js file holds the info about the content of the recorder.

window.cameraId = 'castaCamera';
window.camera = document.getElementById(cameraId);

if (window.camera) {
    console.log('camera found', camera);
    document.querySelector("#castaCamera").style.display = "block";
} else {
    const cameraElement = document.createElement('iframe');
    cameraElement.id = cameraId;
    cameraElement.setAttribute('allow', 'camera; microphone');
    cameraElement.src = chrome.runtime.getURL('camera.html');
    cameraElement.setAttribute('style', 'position: fixed; top: 50px; left: 50px; width: 200px; height: 200px; background-color: rgba(0, 0, 0, 0.5); z-index: 9999; border-radius: 50%; cursor: grab;');
    document.body.appendChild(cameraElement);

    let isDragging = false;
    let offsetX, offsetY;

    cameraElement.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - cameraElement.offsetLeft;
        offsetY = e.clientY - cameraElement.offsetTop;
        cameraElement.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            cameraElement.style.left = `${e.clientX - offsetX}px`;
            cameraElement.style.top = `${e.clientY - offsetY}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        cameraElement.style.cursor = 'grab';
    });
}