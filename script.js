/**
 * Cache DOM elements for easy access.
 */
const recordTabButton = document.getElementById("tab");
const recordScreenButton = document.getElementById("screen");
const faceToggleSwitch = document.getElementById("faceToggle");
const bodyElement = document.body;
const modeToggleSwitch = document.getElementById("modeToggle");
const modeLabelElement = document.getElementById("modeLabel");

/**
 * Sets the default theme mode (light/dark) based on system preference or localStorage.
 */
const setDefaultThemeMode = () => {
    const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const savedThemeMode = localStorage.getItem("modeToggle");
    const isDarkMode = savedThemeMode !== null ? JSON.parse(savedThemeMode) : prefersDarkMode;

    bodyElement.classList.toggle("light-mode", !isDarkMode);
    modeToggleSwitch.checked = isDarkMode;
    modeLabelElement.textContent = isDarkMode ? "🌙 Mode" : "🌞 Mode";
};

/**
 * Toggles the light/dark theme mode and saves the preference to localStorage.
 */
const toggleThemeMode = () => {
    const isDarkMode = modeToggleSwitch.checked;
    bodyElement.classList.toggle("light-mode", !isDarkMode);
    modeLabelElement.textContent = isDarkMode ? "🌙 Mode" : "🌞 Mode";
    localStorage.setItem("modeToggle", JSON.stringify(isDarkMode));
};

/**
 * Sets the initial state of the face recording toggle based on localStorage and removes camera if disabled.
 */
const setFaceToggleInitialState = async () => {
    const savedFaceToggleState = localStorage.getItem("faceToggle");
    const isFaceToggleEnabled = savedFaceToggleState !== null ? JSON.parse(savedFaceToggleState) : false;
    faceToggleSwitch.checked = isFaceToggleEnabled;

    if (!isFaceToggleEnabled) {
        await removeCameraElement();
    }
};

/**
 * Saves the state of the face recording toggle to localStorage and updates the UI accordingly.
 */
const saveFaceToggleState = async () => {
    const isFaceToggleEnabled = faceToggleSwitch.checked;
    localStorage.setItem("faceToggle", JSON.stringify(isFaceToggleEnabled));

    if (!isFaceToggleEnabled) {
        await removeCameraElement();
    } else {
        await injectCameraScript();
    }
};

/**
 * Retrieves the active browser tab.
 * @returns {Promise<chrome.tabs.Tab>} - The active tab object.
 */
const getActiveBrowserTab = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) throw new Error("No active tab found");
    return tabs[0];
};

/**
 * Executes a script in the active tab.
 * @param {Object} options - The script options.
 * @returns {Promise<void>}
 */
const executeScriptInTab = async (options) => {
    const activeTab = await getActiveBrowserTab();
    options.target = { tabId: activeTab.id };
    await chrome.scripting.executeScript(options);
};

/**
 * Injects the camera content script into the current tab.
 */
const injectCameraScript = async () => {
    await executeScriptInTab({ files: ["content.js"] });
};

/**
 * Removes the camera element from the DOM by modifying the current tab's content.
 */
const removeCameraElement = async () => {
    await executeScriptInTab({
        func: () => {
            const cameraElement = document.querySelector("#castaCamera");
            if (cameraElement) cameraElement.style.display = "none";
        },
    });
};

/**
 * Checks the recording status from Chrome storage.
 * @returns {Promise<{ recording: boolean, type: string }>} - The recording status and type.
 */
const getRecordingStatus = async () => {
    const { recording = false, type = "" } = await chrome.storage.local.get(["recording", "type"]);
    return { recording, type };
};

/**
 * Updates the recording status in Chrome storage.
 * @param {boolean} isRecording - Whether recording is active.
 * @param {string} [recordingType=""] - The type of recording (e.g., 'tab', 'screen').
 * @returns {Promise<void>}
 */
const updateRecordingStatus = async (isRecording, recordingType = "") => {
    await chrome.storage.local.set({ recording: isRecording, type: recordingType });
};

/**
 * Updates the UI state based on the current recording and toggle states.
 */
const updateUIState = async () => {
    const { recording, type } = await getRecordingStatus();

    recordTabButton.innerText = recording && type === "tab" ? "Stop Recording" : "Record Tab";
    recordScreenButton.innerText = recording && type === "screen" ? "Stop Recording" : "Record Screen";

    if (!faceToggleSwitch.checked) {
        await removeCameraElement();
    }
};

/**
 * Toggles recording state based on the current status.
 * @param {string} recordingType - The type of recording to toggle ('tab' or 'screen').
 */
const toggleRecordingState = async (recordingType) => {
    const { recording } = await getRecordingStatus();

    if (recording) {
        chrome.runtime.sendMessage({ type: "stop-recording" });
        await removeCameraElement();
    } else {
        if (faceToggleSwitch.checked) {
            await injectCameraScript();
        }
        chrome.runtime.sendMessage({ type: "start-recording", recordingType });
    }

    await updateUIState();
    window.close();
};

/**
 * Initializes the popup UI and event listeners.
 */
const initializePopup = async () => {
    try {
        await updateUIState();

        recordScreenButton.addEventListener("click", () => toggleRecordingState("screen"));
        recordTabButton.addEventListener("click", () => toggleRecordingState("tab"));

        faceToggleSwitch.addEventListener("change", async () => {
            await saveFaceToggleState(); 
            await updateUIState();
        });

        modeToggleSwitch.addEventListener("change", toggleThemeMode);
    } catch (error) {
        console.error("[Popup Initialization] Error:", error);
    }
};

setDefaultThemeMode();
setFaceToggleInitialState();
initializePopup();
