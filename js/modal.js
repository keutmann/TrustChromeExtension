var settingsController = new SettingsController();

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
    $("#trustContent").html(content); // Only render the Text part

    settingsController.loadSettings(function (settings) {
        $('#password').text(settings.password);
        $('#seed').text(settings.seed);
    });
}
