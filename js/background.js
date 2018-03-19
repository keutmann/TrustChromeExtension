
var currentTab = null;
var currentWindow = null;
var currentTarget = null;

chrome.runtime.onMessage.addListener(function(request) {
    if (request.command === 'openDialog') {
        GetCurrentWindow(function(window) {
            if(!window)
                OpenDialog(request);
            else
            {
                SendMessageToDialog('showTarget', request.data);
            }
        });
    }

});


function OpenDialog(request)
{
    try {
        chrome.tabs.create({
            url: chrome.extension.getURL(request.url), //'dialog.html'
            active: false
        }, function(tab) {
            currentTab = tab;
            // After the tab has been created, open a window to inject the tab
            chrome.windows.create({
                tabId: tab.id,
                type: 'popup',
                focused: true,
                top: request.top,
                left: request.left,
                width: request.w,
                height: request.h
                // incognito, top, left, ...
            }, 
                function(window) {
                    currentWindow = window;
                    setTimeout(function() { 
                        SendMessageToDialog('showTarget', request.data); 
                    }, 100);
                    
                });
        });
    } catch (error) {
        console.log(error);
    }
}

function GetCurrentWindow(cb)
{
    if(!currentWindow) 
        cb(null);
    else
        chrome.windows.get(currentWindow.id, null, cb);
}

chrome.windows.onRemoved.addListener(function (id) {
    if(id == currentWindow.id)
        currentWindow = null;
});

function SendMessageToDialog(command, target, cb) 
{
    chrome.tabs.sendMessage(currentTab.id, { command: command, data: target}, cb);
    //chrome.tabs.update(currentTab.id, {active: true});
    chrome.windows.update(currentWindow.id, {focused:true });
}