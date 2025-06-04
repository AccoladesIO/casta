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

    const resizeHandle = document.createElement('div');
    resizeHandle.style.cssText = `
        position: absolute;
        bottom: 0;
        right: 0;
        width: 10px;
        height: 10px;
        cursor: nwse-resize;
        z-index: 1000;
        background: black;
        border: 2px solid black;
        color: black;
        clip-path: polygon(75% 0%, 100% 50%, 75% 100%, 0% 100%, 25% 50%, 0% 0%);
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

    let isResizing = false;
    let initialWidth, initialHeight, initialMouseX, initialMouseY;

    resizeHandle.addEventListener('mousedown', (event) => {
        isResizing = true;
        initialWidth = wrapper.offsetWidth;
        initialHeight = wrapper.offsetHeight;
        initialMouseX = event.clientX;
        initialMouseY = event.clientY;
        event.stopPropagation(); // Prevent triggering drag
    });

    document.addEventListener('mousemove', (event) => {
        if (isResizing) {
            const newWidth = initialWidth + (event.clientX - initialMouseX);
            const newHeight = initialHeight + (event.clientY - initialMouseY);
            wrapper.style.width = `${Math.max(newWidth, 50)}px`; // Minimum width: 50px
            wrapper.style.height = `${Math.max(newHeight, 50)}px`; // Minimum height: 50px
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
        }
    });

    wrapper.appendChild(iframe);
    wrapper.appendChild(dragOverlay);
    wrapper.appendChild(resizeHandle);
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