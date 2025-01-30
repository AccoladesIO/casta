const CAMERA_ELEMENT_ID = 'castaCamera';

/**
 * Creates a draggable iframe inside a wrapper div with a transparent overlay for drag handling.
 * 
 * @param {string} id - The ID of the wrapper element.
 * @param {string} src - The source URL of the iframe content.
 * @param {string} styles - The CSS styles for the wrapper element.
 * @return {HTMLElement} - The draggable wrapper element containing the iframe.
 */
const createDraggableIframe = (id, src, styles) => {
    const wrapper = document.createElement('div');
    wrapper.id = id;
    wrapper.style.cssText = styles;

    const iframe = document.createElement('iframe');
    iframe.setAttribute('allow', 'camera; microphone');
    iframe.src = src;
    iframe.style.cssText = `
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: none;
        pointer-events: auto;
    `;

    const dragOverlay = document.createElement('div');
    dragOverlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        cursor: grab;
        z-index: 2;
        background: transparent;
    `;

    let isDragging = false;
    let dragOffsetX, dragOffsetY;

    dragOverlay.addEventListener('mousedown', (event) => {
        isDragging = true;
        dragOffsetX = event.clientX - wrapper.offsetLeft;
        dragOffsetY = event.clientY - wrapper.offsetTop;
        dragOverlay.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (event) => {
        if (isDragging) {
            wrapper.style.left = `${event.clientX - dragOffsetX}px`;
            wrapper.style.top = `${event.clientY - dragOffsetY}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            dragOverlay.style.cursor = 'grab';
        }
    });

    wrapper.appendChild(iframe);
    wrapper.appendChild(dragOverlay);
    return wrapper;
};

/**
 * Initializes the draggable camera element. If it already exists, it becomes visible again.
 */
const initCameraElement = () => {
    const existingCameraElement = document.getElementById(CAMERA_ELEMENT_ID);

    if (existingCameraElement) {
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

initCameraElement();
