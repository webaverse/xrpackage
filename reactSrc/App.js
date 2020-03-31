import React, { useEffect } from 'react';

const App = (props) => {

    // useEffect(() => {
    //     window.addEventListener('load', e => {
    //         // Read it using the storage API
    //         chrome.tabs.query({
    //             active: true,
    //             currentWindow: true,
    //         }, tabs => {
    //             console.log('got tabs', tabs);
    //             chrome.tabs.sendMessage(tabs[0].id, { method: 'getOptions' }, response => {
    //                 console.log('got response get', response);
    //                 response = response || {};
    //                 let { options } = response;
    //                 options = options || {};
    //                 const { enabled, browser, webxr, webvr } = options;

    //                 document.getElementById('enabled').checked = !!enabled;
    //                 if (browser) {
    //                     document.getElementById('browser').value = browser;
    //                 }
    //                 document.getElementById('webxr').checked = !!webxr;
    //                 document.getElementById('webvr').checked = !!webvr;

    //                 function _save() {
    //                     console.log('save', options);
    //                     chrome.tabs.sendMessage(tabs[0].id, { method: 'setOptions', options }, response => {
    //                         console.log('got response set', response);
    //                     });
    //                 }
    //                 document.getElementById('enabled').addEventListener('change', () => {
    //                     options.enabled = document.getElementById('enabled').checked;
    //                     _save();
    //                 });
    //                 document.getElementById('browser').addEventListener('change', () => {
    //                     options.browser = document.getElementById('browser').value;
    //                     _save();
    //                 });
    //                 document.getElementById('webxr').addEventListener('change', () => {
    //                     options.webxr = document.getElementById('webxr').checked;
    //                     _save();
    //                 });
    //                 document.getElementById('webvr').addEventListener('change', () => {
    //                     options.webvr = document.getElementById('webvr').checked;
    //                     _save();
    //                 });
    //             });
    //         });

    //         if (/#overlay$/.test(location.hash)) {
    //             document.body.parentNode.classList.add('overlay');

    //             const mousetarget = document.getElementById('mousetarget');
    //             mousetarget.addEventListener('mousedown', e => {
    //                 e.preventDefault();
    //                 e.stopPropagation();
    //                 const { button, clientX, clientY } = e;
    //                 parent.postMessage({
    //                     event: 'mousedown',
    //                     button,
    //                     clientX,
    //                     clientY,
    //                 }, '*');
    //             });
    //             mousetarget.addEventListener('mouseup', e => {
    //                 e.preventDefault();
    //                 e.stopPropagation();
    //                 const { button, clientX, clientY } = e;
    //                 parent.postMessage({
    //                     event: 'mouseup',
    //                     button,
    //                     clientX,
    //                     clientY,
    //                 }, '*');
    //             });
    //             mousetarget.addEventListener('mousemove', e => {
    //                 e.preventDefault();
    //                 e.stopPropagation();
    //                 const { button, clientX, clientY, movementX, movementY } = e;
    //                 parent.postMessage({
    //                     event: 'mousemove',
    //                     button,
    //                     clientX,
    //                     clientY,
    //                     movementX,
    //                     movementY,
    //                 }, '*');
    //             });
    //             mousetarget.addEventListener('wheel', e => {
    //                 e.preventDefault();
    //                 e.stopPropagation();
    //                 const { button, clientX, clientY, deltaX, deltaY } = e;
    //                 parent.postMessage({
    //                     event: 'wheel',
    //                     button,
    //                     clientX,
    //                     clientY,
    //                     deltaX,
    //                     deltaY,
    //                 }, '*');
    //             });
    //             mousetarget.addEventListener('contextmenu', e => {
    //                 e.preventDefault();
    //                 e.stopPropagation();
    //             });
    //         }
    //     });
    // }, [])

    return (
        <div className="App">
            Exokit Extension
        </div>
    )
}
export default App;