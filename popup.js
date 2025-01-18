// Cache DOM elements
const recordTab = document.getElementById('tab');
const recordScreen = document.getElementById('screen');

// Utility function to get the active tab
const getActiveTab = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) throw new Error("No active tab found");
    return tabs[0];
};

// Utility function to execute a script in the current tab
const executeScript = async (options) => {
    const tab = await getActiveTab();
    options.target = { tabId: tab.id };
    await chrome.scripting.executeScript(options);
};

// Inject the content script into the current page
const injectCamera = async () => {
    await executeScript({ files: ["content.js"] });
};

// Remove the camera element by modifying the DOM
const removeCamera = async () => {
    await executeScript({
        func: () => {
            const camera = document.querySelector("#castaCamera");
            if (camera) camera.style.display = "none";
        },
    });
};

// Check the recording state from storage
const checkRecording = async () => {
    const { recording = false, type = "" } = await chrome.storage.local.get(['recording', 'type']);
    console.log('Recording status:', recording, type);
    return { recording, type };
};

// Update recording state
const updateRecordingState = async (isRecording, type = "") => {
    await chrome.storage.local.set({ recording: isRecording, type });
};

// Initialize the UI state
const updateUI = async () => {
    const { recording, type } = await checkRecording();
    recordTab.innerText = recording && type === 'tab' ? 'Stop Recording' : 'Record Tab';
    recordScreen.innerText = recording && type === 'screen' ? 'Stop Recording' : 'Record Screen';
};

// Start or stop recording based on the current state
const toggleRecording = async (type) => {
    const { recording } = await checkRecording();

    if (recording) {
        chrome.runtime.sendMessage({ type: 'stop-recording' });
        await removeCamera();
    } else {
        await injectCamera();
        chrome.runtime.sendMessage({ type: 'start-recording', recordingType: type });
    }

    // Update UI and close popup
    await updateUI();
    window.close();
};

// Attach event listeners and initialize
const init = async () => {
    try {
        await updateUI();

        recordScreen.addEventListener('click', () => toggleRecording('screen'));
        recordTab.addEventListener('click', () => toggleRecording('tab'));
    } catch (error) {
        console.error('Error initializing the popup:', error);
    }
};

init();
