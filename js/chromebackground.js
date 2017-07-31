// Set up context menu tree at install time.
chrome.runtime.onInstalled.addListener(function () {
    chrome.contextMenus.create({
        "title": "Trust",
        "id": "TrustID",
        "type": "normal",
        "contexts": ["link"]
    });
    chrome.contextMenus.create({
        "title": "Issue",
        "parentId": "TrustID",
        "id": "TrustIssueID",
        "type": "normal",
        "contexts": ["link"]
    });
    chrome.contextMenus.create({
        "title": "Resolve",
        "parentId": "TrustID",
        "id": "TrustResolveID",
        "type": "normal",
        "contexts": ["link"]
    });
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (info.menuItemId.indexOf("Trust") > -1) {
            chrome.tabs.sendMessage(tabs[0].id, { type: "openModal", content: JSON.stringify(info) });
        }
    });
});