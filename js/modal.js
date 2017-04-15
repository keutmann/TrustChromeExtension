// Onload
$(function () {
    window.parent.postMessage({ type: "getDialogData" }, "*");
});

// Listen to the response from main
window.addEventListener("message", function (event) {
    if (event.data.type == "getDialogDataResult") {
        OnDataLoad(event.data.content);
    }
});

// Fill in form
function OnDataLoad(content) {
    //var $container = $(content); // Parse the content!
    $("#trustContent").html(content); // Only render the Text part
}