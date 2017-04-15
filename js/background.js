// Set up context menu tree at install time.
chrome.runtime.onInstalled.addListener(function () {
    chrome.contextMenus.create({
        "title": "Trust",
        "id": "TrustID",
        "type": "normal",
        "contexts": ["selection", "link"]
        //"onclick": function (info, tab) {
        //    chrome.tabs.sendMessage(tabs[0].id, { type: "openModal", content: JSON.stringify(info) });
        //}
    });
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (info.menuItemId.indexOf("Trust") > -1) {
            chrome.tabs.sendMessage(tabs[0].id, { type: "openModal", content: JSON.stringify(info) });
        }
    });
});