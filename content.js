// This content.js file holds the info about the content of the recorder.

const CAMERA_ELEMENT_ID = 'castaCamera';

// Helper function to create a draggable iframe element
const createDraggableIframe = (id, src, styles) => {
    const iframe = document.createElement('iframe');
    iframe.id = id;
    iframe.setAttribute('allow', 'camera; microphone');
    iframe.src = src;
    iframe.style.cssText = styles;

    let isDragging = false;
    let dragOffsetX, dragOffsetY;

    iframe.addEventListener('mousedown', (event) => {
        isDragging = true;
        dragOffsetX = event.clientX - iframe.offsetLeft;
        dragOffsetY = event.clientY - iframe.offsetTop;
        iframe.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (event) => {
        if (isDragging) {
            iframe.style.left = `${event.clientX - dragOffsetX}px`;
            iframe.style.top = `${event.clientY - dragOffsetY}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            iframe.style.cursor = 'grab';
        }
    });

    return iframe;
};

// Main logic
const initCameraElement = () => {
    const existingCameraElement = document.getElementById(CAMERA_ELEMENT_ID);

    if (existingCameraElement) {
        console.log('Camera element found:', existingCameraElement);
        existingCameraElement.style.display = 'block';
        return;
    }

    const cameraIframeStyles = `
        position: fixed;
        top: 50px;
        left: 50px;
        width: 200px;
        height: 200px;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 9999;
        border-radius: 50%;
        cursor: grab;
    `;
    const cameraIframe = createDraggableIframe(
        CAMERA_ELEMENT_ID,
        chrome.runtime.getURL('camera.html'),
        cameraIframeStyles
    );

    document.body.appendChild(cameraIframe);
};

// Initialize the camera element
initCameraElement();
